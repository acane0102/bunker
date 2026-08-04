"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const getLocalDatetime = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const PSYCHOLOGY_TAGS = ["Apegado al Plan", "FOMO", "Revancha", "Duda", "Ansiedad", "Paciencia", "Entrada Prematura", "Salida Prematura", "Error de Loteaje"];

export default function AddTradeModal({ isOpen, onClose, onSave, defaultAccount, tradeToEdit }: any) {
  const [formData, setFormData] = useState({
    account: "", mentor: "", date: "", asset: "", setup_type: "", level: "No especificar...", 
    direction: "BUY", rr_achieved: "", commission: "0.00", investment: "", payout: "83", binary_result: "WIN",
    notes: ""
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [activeBrokers, setActiveBrokers] = useState<string[]>([]);
  const [dynamicMentors, setDynamicMentors] = useState<any[]>([]);
  
  // ESTADO DE SEGURIDAD (BLINDAJE TOTAL)
  const [accountStatus, setAccountStatus] = useState("active");
  const [isExpired, setIsExpired] = useState(false);
  const [isSecuring, setIsSecuring] = useState(true); // <-- BLOQUEO INICIAL

  useEffect(() => {
    if (isOpen) {
      setIsSecuring(true); // Bloqueamos la vista al abrir
      const fetchDynamicData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const [txRes, mentorsRes, profileRes] = await Promise.all([
            supabase.from('transactions').select('broker').eq('user_id', user.id),
            supabase.from('mentors').select('*').eq('user_id', user.id),
            supabase.rpc('get_my_bunker_profile')
          ]);

          if (profileRes.data) {
            if (profileRes.data.status) setAccountStatus(profileRes.data.status);
            if (profileRes.data.is_expired !== undefined) setIsExpired(profileRes.data.is_expired);
          }

          const txBrokers = txRes.data ? txRes.data.map(t => t.broker) : [];
          const mentorList = mentorsRes.data || [];
          const mentorBrokers = mentorList.map(m => m.broker);
          const uniqueNames = Array.from(new Set([...txBrokers, ...mentorBrokers].filter(Boolean)));
          
          setActiveBrokers(uniqueNames);
          setDynamicMentors(mentorList);

          if (tradeToEdit) {
            setFormData({
              account: tradeToEdit.account || (uniqueNames[0] || ""), 
              mentor: tradeToEdit.mentor || "",
              date: tradeToEdit.created_at ? new Date(tradeToEdit.created_at).toISOString().slice(0, 16) : getLocalDatetime(), 
              asset: tradeToEdit.asset || "", setup_type: tradeToEdit.setup_type || "", level: tradeToEdit.level || "No especificar...",
              direction: tradeToEdit.direction || "BUY", rr_achieved: tradeToEdit.rr_achieved?.toString() || "", 
              commission: tradeToEdit.commission?.toString() || "0.00", investment: tradeToEdit.investment?.toString() || "", 
              payout: tradeToEdit.payout?.toString() || "83", binary_result: tradeToEdit.status || "WIN",
              notes: tradeToEdit.notes || ""
            });
            setSelectedTags(tradeToEdit.tags ? tradeToEdit.tags.split(',') : []);
          } else {
            const topbarAccount = localStorage.getItem("bunker_account") || "ALL";
            const accountToUse = topbarAccount !== "ALL" ? topbarAccount : (defaultAccount !== "ALL" && defaultAccount ? defaultAccount : "ALL");
            const initialBroker = accountToUse !== "ALL" && uniqueNames.includes(accountToUse) ? accountToUse : (uniqueNames[0] || "");
            const mentorInfo = mentorList.find(m => m.broker === initialBroker);
            
            setFormData({
              account: initialBroker, mentor: mentorInfo ? mentorInfo.name : "", date: getLocalDatetime(), 
              asset: "", setup_type: mentorInfo ? mentorInfo.strategy : "", level: "No especificar...", 
              direction: "BUY", rr_achieved: "", commission: "0.00", investment: "", binary_result: "WIN", 
              payout: mentorInfo?.payout || "83", notes: ""
            });
            setSelectedTags([]);
          }
        }
        setIsSecuring(false); // Quitamos el bloqueo
      };

      fetchDynamicData();
      setImageFile(null);
    }
  }, [isOpen, defaultAccount, tradeToEdit]);

  if (!isOpen) return null;

  // PANTALLA DE CARGA (Evita fugas visuales)
  if (isSecuring) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // PANTALLA DE CADUCIDAD
  if (isExpired) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-[#0b0914] border border-amber-500/30 p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-500/10 flex items-center justify-center rounded-full mb-5 border border-amber-500/20">
            <span className="material-symbols-outlined text-3xl text-amber-400">timer_off</span>
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">Licencia Caducada</h3>
          <p className="text-sm text-slate-400 mb-8 px-2">Su cuenta está en modo <strong className="text-amber-400">Solo Lectura</strong>. No puede registrar ni editar operaciones. Por favor renueve su suscripción.</p>
          <button onClick={onClose} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3.5 rounded-xl transition-colors">Entendido</button>
        </div>
      </div>
    );
  }

  if (accountStatus === 'suspended' || accountStatus === 'banned') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-[#0b0914] border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-rose-500/10 flex items-center justify-center rounded-full mb-5">
            <span className="material-symbols-outlined text-3xl text-rose-500">lock</span>
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">Acceso Restringido</h3>
          <p className="text-sm text-slate-400 mb-8 px-2">Su cuenta está suspendida. No puede registrar operaciones.</p>
          <button onClick={onClose} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl transition-colors">Cerrar</button>
        </div>
      </div>
    );
  }

  const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleAccountChange = (e: any) => { 
    const newBroker = e.target.value; 
    const mentorInfo = dynamicMentors.find(m => m.broker === newBroker);
    setFormData({ 
      ...formData, account: newBroker, mentor: mentorInfo ? mentorInfo.name : "",
      setup_type: mentorInfo ? mentorInfo.strategy : "", payout: mentorInfo?.payout || formData.payout
    }); 
  };
  
  const toggleTag = (tag: string) => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleSubmit = async () => {
    if (!onSave || isExpired || isSecuring) return; // Bloqueo de escritura
    setIsSubmitting(true);
    try {
      let finalImageUrl = tradeToEdit ? tradeToEdit.image_url : null;
      if (imageFile) {
        finalImageUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => reject("Error leyendo la imagen");
          reader.readAsDataURL(imageFile);
        });
      }

      let rrNumber = 0; let commNumber = 0; let calculatedStatus = 'BREAK EVEN';
      const selectedMentor = dynamicMentors.find(m => m.broker === formData.account);
      const isBinariasMode = selectedMentor?.account_type === 'binarias' || formData.account === "Exnova";

      if (isBinariasMode) {
        const inv = parseFloat(formData.investment) || 0;
        const pay = parseFloat(formData.payout) || 0;
        if (formData.binary_result === "WIN") { rrNumber = inv * (pay / 100); calculatedStatus = 'WIN'; } 
        else if (formData.binary_result === "LOSS") { rrNumber = -Math.abs(inv); calculatedStatus = 'LOSS'; }
      } else {
        rrNumber = parseFloat(formData.rr_achieved) || 0;
        commNumber = parseFloat(formData.commission) || 0;
        const netProfit = rrNumber - commNumber;
        calculatedStatus = netProfit > 0 ? 'WIN' : netProfit < 0 ? 'LOSS' : 'BREAK EVEN';
      }

      const tradeData = {
        account: formData.account, mentor: formData.mentor, asset: formData.asset.toUpperCase(),
        setup_type: formData.setup_type, level: formData.account === "PU Prime" ? "No especificar..." : formData.level,
        direction: formData.direction, rr_achieved: rrNumber, commission: commNumber, status: calculatedStatus, 
        created_at: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
        date: formData.date ? (formData.date.includes('T') ? formData.date.split('T')[0] : formData.date) : new Date().toISOString().split('T')[0],
        investment: parseFloat(formData.investment) || 0, notes: formData.notes, tags: selectedTags.join(','),
        image_url: finalImageUrl, payout: parseFloat(formData.payout) || 0 
      };

      await onSave(tradeData);
    } catch (error: any) { 
      alert("Error al procesar el formulario: " + error.message);
    } finally {
      setIsSubmitting(false); 
    }
  };

  const currentMentorInfo = dynamicMentors.find(m => m.broker === formData.account);
  const isBinarias = currentMentorInfo?.account_type === 'binarias' || formData.account === "Exnova";
  const showLevels = formData.account !== "PU Prime" && !isBinarias;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <h2 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-500">
              {tradeToEdit ? 'edit' : isBinarias ? 'monitoring' : 'add_chart'}
            </span> 
            {tradeToEdit ? 'Editar Operación' : isBinarias ? 'Registrar Operación (Binarias)' : 'Registrar Trade'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Cuenta</label>
              <select name="account" value={formData.account} onChange={handleAccountChange} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer">
                {activeBrokers.length === 0 && <option value="">Sin Cuentas</option>}
                {activeBrokers.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Mentor</label>
              <select name="mentor" value={formData.mentor} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer">
                <option value="">Análisis Propio</option>
                {dynamicMentors.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Fecha</label>
              <input type="datetime-local" name="date" value={formData.date} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-bold outline-none cursor-pointer" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Activo</label>
              <input type="text" name="asset" value={formData.asset} onChange={handleChange} placeholder="Ej. XAUUSD" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black uppercase outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Estrategia</label>
              <input type="text" name="setup_type" value={formData.setup_type} onChange={handleChange} placeholder="Ej. SMC" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none" />
            </div>
          </div>

          {isBinarias ? (
            <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
              <div>
                <label className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1.5 block">Entrada ($)</label>
                <input type="number" step="0.01" name="investment" value={formData.investment} onChange={handleChange} placeholder="Ej: 14.52" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-black outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1.5 block">Pago (%)</label>
                <input type="number" step="1" name="payout" value={formData.payout} onChange={handleChange} placeholder="83" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-black outline-none" />
              </div>
              <div className="col-span-2 mt-2">
                <select 
                  name="binary_result" 
                  value={formData.binary_result} 
                  onChange={handleChange} 
                  className={`w-full border rounded-xl px-4 py-3 text-sm font-bold outline-none cursor-pointer ${
                    formData.binary_result === 'WIN' 
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-500/20' 
                      : formData.binary_result === 'LOSS' 
                      ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-500/20' 
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <option value="WIN">📈 Ganada</option>
                  <option value="LOSS">📉 Perdida</option>
                  <option value="BE">➖ Empate</option>
                </select>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Dirección</label>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button type="button" onClick={() => setFormData({...formData, direction: 'BUY'})} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${formData.direction === 'BUY' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-400'}`}>COMPRA (LONG)</button>
                  <button type="button" onClick={() => setFormData({...formData, direction: 'SELL'})} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${formData.direction === 'SELL' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm border border-slate-200' : 'text-slate-400'}`}>VENTA (SHORT)</button>
                </div>
              </div>
              {showLevels && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Nivel Alcanzado</label>
                  <select name="level" value={formData.level} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none cursor-pointer">
                    <option>No especificar...</option>
                    <option>TP1</option>
                    <option>TP2</option>
                    <option>TP3</option>
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Neto Logrado ($)</label>
                  <input type="number" step="0.01" name="rr_achieved" value={formData.rr_achieved} onChange={handleChange} placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 block">Comisión ($)</label>
                  <input type="number" step="0.01" name="commission" value={formData.commission} onChange={handleChange} placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none" />
                </div>
              </div>
            </>
          )}

          <div className="bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">psychology</span> Etiquetas Mentales</label>
              <div className="flex flex-wrap gap-2">
                {PSYCHOLOGY_TAGS.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all border ${selectedTags.includes(tag) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-400'}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">edit_note</span> Diario de Trading</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="¿Qué viste en el gráfico? ¿Cómo te sentiste al ejecutar?" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 min-h-[80px] resize-y" />
            </div>
          </div>

          <div className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors ${imageFile || (tradeToEdit && tradeToEdit.image_url) ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-900/10' : 'border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50'}`} onClick={() => document.getElementById('image-upload')?.click()}>
            <input type="file" id="image-upload" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files) setImageFile(e.target.files[0]) }} />
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${imageFile || (tradeToEdit && tradeToEdit.image_url) ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20' : 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10'}`}>
              <span className="material-symbols-outlined text-xl">{imageFile || (tradeToEdit && tradeToEdit.image_url) ? 'check_circle' : 'image'}</span>
            </div>
            <h3 className={`text-sm font-bold ${imageFile || (tradeToEdit && tradeToEdit.image_url) ? 'text-emerald-600' : 'text-indigo-600'}`}>
              {imageFile ? '¡Captura lista!' : (tradeToEdit && tradeToEdit.image_url) ? 'Imagen Guardada (Clic para cambiar)' : 'Clic para subir tu Captura'}
            </h3>
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 shrink-0">
           <button onClick={handleSubmit} disabled={isSubmitting || !formData.account || isSecuring || isExpired} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3.5 rounded-xl transition-all disabled:opacity-50">
            {isSubmitting ? 'GUARDANDO...' : tradeToEdit ? 'ACTUALIZAR OPERACIÓN' : 'GUARDAR OPERACIÓN'}
          </button>
        </div>
      </div>
    </div>
  );
}