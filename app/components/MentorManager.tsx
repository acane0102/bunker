"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function MentorManager() {
  const [mentors, setMentors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ESTADOS DE ARQUITECTURA DE PLANES Y SEGURIDAD
  const [userPlan, setUserPlan] = useState<string>('free');
  const [userRole, setUserRole] = useState<string>('user');
  const [accountStatus, setAccountStatus] = useState("active");
  const [isExpired, setIsExpired] = useState(false);
  const [extraBunkers, setExtraBunkers] = useState<number>(0); 
  
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  // Estados Modal Estándar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [mentorForm, setMentorForm] = useState({
    name: '', broker: '', strategy: '', schedule: '', notes: '', account_type: 'forex', payout: '', is_active: true
  });

  const [isCreatingBunker, setIsCreatingBunker] = useState(false);
  const [newBunkerData, setNewBunkerData] = useState({ name: '', deposit: '', bonus: '' });

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: 0, name: '', broker: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMentors = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profileData } = await supabase.rpc('get_my_bunker_profile');
      
      if (profileData) {
        setUserPlan(profileData.plan?.toLowerCase().trim() || 'free');
        setUserRole(profileData.role?.toLowerCase().trim() || 'user');
        setAccountStatus(profileData.status || 'active');
        setIsExpired(profileData.is_expired || false);
        setExtraBunkers(profileData.extra_bunkers || 0); 
      }

      const { data } = await supabase.from('mentors')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
        
      if (data) setMentors(data);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchMentors(); }, []);

  const getBunkerLimit = () => {
    const baseLimit = userPlan === 'pro' ? 5 : 1;
    return baseLimit + extraBunkers;
  };

  // INTERCEPTORES
  const checkPermissions = () => {
    if (accountStatus === 'suspended' || accountStatus === 'banned') {
      setShowSuspendedModal(true);
      return false;
    }
    if (isExpired) {
      setShowExpiredModal(true);
      return false;
    }
    return true;
  };

  const openNewModal = () => {
    if (!checkPermissions()) return;

    const totalLimit = getBunkerLimit();
    if (userRole !== 'root' && mentors.length >= totalLimit) {
      setIsUpgradeModalOpen(true);
      return; 
    }

    setEditingId(null);
    setIsCreatingBunker(true); 
    setNewBunkerData({ name: '', deposit: '', bonus: '' });
    setMentorForm({ name: '', broker: '', strategy: '', schedule: '', notes: '', account_type: 'forex', payout: '', is_active: true });
    setIsModalOpen(true);
  };

  const openEditModal = (mentor: any) => {
    if (!checkPermissions()) return;
    setEditingId(mentor.id);
    setIsCreatingBunker(false); 
    setMentorForm({
      name: mentor.name, broker: mentor.broker, strategy: mentor.strategy,
      schedule: mentor.schedule || '', notes: mentor.notes || '', account_type: mentor.account_type || 'forex', payout: mentor.payout || '', is_active: mentor.is_active
    });
    setIsModalOpen(true);
  };

  const handleDeleteTrigger = (id: number, name: string, broker: string) => {
    if (!checkPermissions()) return;
    setDeleteModal({ isOpen: true, id, name, broker });
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    let finalBroker = mentorForm.broker;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      alert("Error: No se detecta tu sesión al intentar guardar.");
      setIsSubmitting(false);
      return;
    }

    if (isCreatingBunker && newBunkerData.name.trim() !== '') {
      finalBroker = newBunkerData.name.trim();

      if (parseFloat(newBunkerData.deposit) > 0) {
        await supabase.from('transactions').insert([{ user_id: user.id, broker: finalBroker, type: 'DEPOSIT', amount: parseFloat(newBunkerData.deposit) }]);
      }
      if (parseFloat(newBunkerData.bonus) > 0) {
        await supabase.from('transactions').insert([{ user_id: user.id, broker: finalBroker, type: 'BONUS', amount: parseFloat(newBunkerData.bonus) }]);
      }
    }

    const mentorDataToSave = { ...mentorForm, broker: finalBroker, user_id: user.id };

    if (editingId) {
      await supabase.from('mentors').update(mentorDataToSave).eq('id', editingId);
    } else {
      await supabase.from('mentors').insert([mentorDataToSave]);
    }

    window.dispatchEvent(new Event('bunker-config-updated'));
    setIsModalOpen(false);
    setIsSubmitting(false);
    setTimeout(() => window.location.reload(), 800);
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    const { id, broker } = deleteModal;
    await supabase.from('mentors').delete().eq('id', id);
    await supabase.from('transactions').delete().eq('broker', broker);
    await supabase.from('trades').delete().eq('account', broker);

    setIsDeleting(false);
    setDeleteModal({ isOpen: false, id: 0, name: '', broker: '' });
    window.dispatchEvent(new Event('bunker-config-updated'));
    setTimeout(() => window.location.reload(), 800);
  };

  const currentLimit = getBunkerLimit();
  const planName = userPlan === 'pro' ? 'PRO' : 'Free';

  return (
    <>
      {/* MODAL DE SUSPENSIÓN */}
      {showSuspendedModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b0914] border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-rose-500/10 flex items-center justify-center rounded-full mb-5">
              <span className="material-symbols-outlined text-3xl text-rose-500">lock</span>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Acceso Restringido</h3>
            <p className="text-sm text-slate-400 mb-8 px-2">Su cuenta se encuentra suspendida. Contacte al administrador.</p>
            <button onClick={() => setShowSuspendedModal(false)} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl transition-colors">Entendido</button>
          </div>
        </div>
      )}

      {/* MODAL DE CADUCIDAD */}
      {showExpiredModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b0914] border border-amber-500/30 p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-amber-500/10 flex items-center justify-center rounded-full mb-5 border border-amber-500/20">
              <span className="material-symbols-outlined text-3xl text-amber-400">timer_off</span>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Licencia Caducada</h3>
            <p className="text-sm text-slate-400 mb-8 px-2">
              Su período activo ha finalizado. La cuenta está en modo <strong className="text-amber-400">Solo Lectura</strong>. Renueve su suscripción para configurar nuevos Búnkers.
            </p>
            <button onClick={() => setShowExpiredModal(false)} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3.5 rounded-xl transition-colors">Entendido</button>
          </div>
        </div>
      )}

      {/* MODAL DE LÍMITES */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm pl-20">
          <div className="bg-[#131022] dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl border border-indigo-500/30 p-8 flex flex-col items-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/20 blur-[50px] rounded-full pointer-events-none"></div>
            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-5 border border-indigo-500/20 relative z-10">
              <span className="material-symbols-outlined text-indigo-400 text-3xl">lock</span>
            </div>
            <h3 className="text-xl font-black text-white mb-2 text-center relative z-10">Límite Alcanzado</h3>
            <p className="text-sm text-slate-400 text-center mb-6 leading-relaxed relative z-10">
              Tu <strong className="text-white">Plan {planName}</strong> {extraBunkers > 0 && <span className="text-indigo-400">(+{extraBunkers} Regalo)</span>} te permite tener un máximo de <strong className="text-white">{currentLimit} Búnker(s)</strong> activos. Actualiza tu licencia para escalar tu operativa.
            </p>
            <div className="flex w-full gap-3 relative z-10">
              <button onClick={() => setIsUpgradeModalOpen(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold py-3.5 rounded-xl transition-colors">Entendido</button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-[#131022] dark:bg-slate-900 rounded-3xl w-full max-w-[340px] shadow-2xl border border-slate-800 p-6 flex flex-col items-center">
            <div className="w-14 h-14 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-rose-500 text-2xl">delete</span>
            </div>
            <h3 className="text-[16px] font-bold text-white mb-2 text-center">¿Eliminar a {deleteModal.name}?</h3>
            <p className="text-[12px] text-slate-400 text-center mb-6 leading-relaxed">Esta acción eliminará permanentemente su Búnker (<strong className="text-slate-300">{deleteModal.broker}</strong>), capital y operaciones.</p>
            <div className="flex w-full gap-3">
              <button onClick={() => setDeleteModal({ isOpen: false, id: 0, name: '', broker: '' })} disabled={isDeleting} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold py-3 rounded-xl transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={executeDelete} disabled={isDeleting} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold py-3 rounded-xl transition-colors flex items-center justify-center disabled:opacity-50">
                {isDeleting ? 'Borrando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm pl-20">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500">{editingId ? 'edit' : 'person_add'}</span> 
                {editingId ? 'EDITAR VIP' : 'NUEVO VIP'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Nombre / Canal</label>
                <input type="text" placeholder="Nombre Canal VIP" value={mentorForm.name} onChange={e => setMentorForm({...mentorForm, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Tipo de Operativa</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setMentorForm({...mentorForm, account_type: 'forex'})} className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${mentorForm.account_type === 'forex' ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>Forex / CFD</button>
                  <button type="button" onClick={() => setMentorForm({...mentorForm, account_type: 'binarias'})} className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${mentorForm.account_type === 'binarias' ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>Opciones Binarias</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Broker Asignado</label>
                  <input type="text" placeholder={mentorForm.account_type === 'binarias' ? "Ej: Exnova o Quotex" : "Ej: PU Prime o VT Markets"} value={isCreatingBunker ? newBunkerData.name : mentorForm.broker} onChange={e => {
                      if (isCreatingBunker) {
                        setNewBunkerData({...newBunkerData, name: e.target.value});
                        setMentorForm({...mentorForm, broker: e.target.value}); 
                      } else { setMentorForm({...mentorForm, broker: e.target.value}); }
                    }} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Horario</label>
                  <input type="text" placeholder="Ej: NY / Asia" value={mentorForm.schedule} onChange={e => setMentorForm({...mentorForm, schedule: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none" />
                </div>
              </div>

              {isCreatingBunker && (
                <div className="grid grid-cols-2 gap-4 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Depósito Inicial ($)</label>
                    <input type="number" placeholder="0.00" value={newBunkerData.deposit} onChange={e => setNewBunkerData({...newBunkerData, deposit: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 block">Bono Crédito ($)</label>
                    <input type="number" placeholder="0.00" value={newBunkerData.bonus} onChange={e => setNewBunkerData({...newBunkerData, bonus: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Estrategia / Setup</label>
                  <input type="text" placeholder={mentorForm.account_type === 'binarias' ? "Ej: Conteo / M1" : "Ej: SMC"} value={mentorForm.strategy} onChange={e => setMentorForm({...mentorForm, strategy: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">
                    {mentorForm.account_type === 'binarias' ? 'Riesgo por Entrada (%)' : 'Riesgo Permitido (%)'}
                  </label>
                  <input type="number" step="0.5" placeholder={mentorForm.account_type === 'binarias' ? "Ej: 1.0" : "Ej: 3.0"} value={mentorForm.notes} onChange={e => setMentorForm({...mentorForm, notes: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 outline-none" />
                </div>
              </div>

              {mentorForm.account_type === 'binarias' && (
                <div className="mt-2 p-4 bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl">
                  <label className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1 block">Payout Promedio (%) - <span className="text-slate-400">Opcional</span></label>
                  <input type="number" placeholder="Ej: 85" value={mentorForm.payout} onChange={e => setMentorForm({...mentorForm, payout: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none" />
                </div>
              )}

              <button onClick={handleSave} disabled={isSubmitting || !mentorForm.name || (isCreatingBunker && !newBunkerData.name)} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-xl transition-colors disabled:opacity-50">
                {isSubmitting ? 'GUARDANDO...' : 'GUARDAR VIP'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 relative z-10 transition-colors duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Entornos VIP & Mentores</h2>
          <button onClick={openNewModal} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg cursor-pointer z-20 transition-colors">
            <span className="material-symbols-outlined text-[14px]">add</span> Nuevo
          </button>
        </div>
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-4 text-slate-400 dark:text-slate-500 text-sm font-bold animate-pulse">Cargando...</div>
          ) : mentors.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-500 text-sm font-bold">No hay mentores.</div>
          ) : (
            mentors.map(mentor => (
              <div key={mentor.id} className="group flex justify-between items-center p-4 border rounded-xl bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 shadow-sm transition-colors hover:border-indigo-200 dark:hover:border-indigo-500/30">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-white bg-slate-800 dark:bg-slate-700 shrink-0 shadow-sm">
                    {mentor.name.substring(0,2).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{mentor.name}</span>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-indigo-600 dark:text-indigo-400">{mentor.broker}</span> 
                      {mentor.account_type === 'binarias' && (
                        <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-500 rounded text-[9px] font-black border border-rose-500/20">BINARIAS</span>
                      )}
                      <span>• {mentor.strategy}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {mentor.notes && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700/80">
                        <span className="material-symbols-outlined text-[13px] text-slate-400">shield</span>
                        <span className="text-[11px] font-black text-slate-600 dark:text-slate-300">{mentor.notes}%</span>
                    </div>
                  )}
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(mentor)} className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-transparent transition-colors">
                      <span className="material-symbols-outlined text-[16px] block">edit</span>
                    </button>
                    <button onClick={() => handleDeleteTrigger(mentor.id, mentor.name, mentor.broker)} className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-transparent transition-colors">
                      <span className="material-symbols-outlined text-[16px] block">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}