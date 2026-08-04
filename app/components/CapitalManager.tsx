"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function CapitalManager() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  
  // ESTADOS DE SEGURIDAD (BLINDAJE TOTAL)
  const [accountStatus, setAccountStatus] = useState("active");
  const [isExpired, setIsExpired] = useState(false);
  const [isSecuring, setIsSecuring] = useState(true); // <-- BLOQUEO INICIAL
  
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<any>(null);
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [quickEditBroker, setQuickEditBroker] = useState('');
  const [quickEditSaldo, setQuickEditSaldo] = useState('');
  const [quickEditBonus, setQuickEditBonus] = useState('');
  const [brokerToReset, setBrokerToReset] = useState<string | null>(null);
  
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [txForm, setTxForm] = useState({ broker: '', type: 'DEPOSIT', amount: '' });

  const fetchData = async () => {
    setIsSecuring(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setIsSecuring(false);
        return;
    }

    const [txRes, tradesRes, mentorsRes, profileRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('trades').select('*').eq('user_id', user.id),
      supabase.from('mentors').select('broker').eq('user_id', user.id),
      supabase.rpc('get_my_bunker_profile')
    ]);
    
    if (txRes.data) setTransactions(txRes.data);
    if (tradesRes.data) setTrades(tradesRes.data);
    if (mentorsRes.data) setMentors(mentorsRes.data);
    
    if (profileRes.data) {
      if (profileRes.data.status) setAccountStatus(profileRes.data.status);
      if (profileRes.data.is_expired !== undefined) setIsExpired(profileRes.data.is_expired);
    }
    setIsSecuring(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Si se detecta caducidad, forzamos el cierre de cualquier modal pirata que haya quedado abierto
  useEffect(() => {
    if (isExpired) {
       setIsTxModalOpen(false);
       setIsQuickEditOpen(false);
       setTxToDelete(null);
       setBrokerToReset(null);
    }
  }, [isExpired]);

  const uniqueBrokerNames = Array.from(new Set([
    ...transactions.map(t => t.broker).filter(Boolean),
    ...mentors.map(m => m.broker).filter(Boolean)
  ]));

  const getBrokerStats = (brokerName: string) => {
    const brokerTxs = transactions.filter(t => t.broker === brokerName);
    const depositsTxs = brokerTxs.filter(t => t.type === 'DEPOSIT');
    
    const deposits = depositsTxs.reduce((acc, t) => acc + Number(t.amount), 0);
    const withdrawals = brokerTxs.filter(t => t.type === 'WITHDRAWAL').reduce((acc, t) => acc + Number(t.amount), 0);
    const bonus = brokerTxs.filter(t => t.type === 'BONUS').reduce((acc, t) => acc + Number(t.amount), 0);

    const brokerTrades = trades.filter(t => t.account === brokerName);
    const pnl = brokerTrades.reduce((acc, t) => {
      return acc + ((Number(t.rr_achieved) || 0) - (Number(t.commission) || 0));
    }, 0);

    const saldo = deposits - withdrawals + pnl;
    const equidad = saldo + bonus;
    const initialDeposit = depositsTxs.length > 0 ? Number(depositsTxs[depositsTxs.length - 1].amount) : 0;

    return { saldo, bonus, equidad, initialDeposit };
  };

  const getBrokerTheme = (name: string) => {
    const themes: Record<string, { label: string, color: string }> = {
      'VT Markets': { label: 'MT4', color: 'indigo' },
      'PU Prime': { label: 'MT5', color: 'indigo' },
      'Libertex': { label: 'WEB', color: 'indigo' },
      'Exnova': { label: 'BINARIAS', color: 'pink' }
    };
    return themes[name] || { label: 'VIP', color: 'emerald' };
  };

  const brokers = uniqueBrokerNames.map(name => ({
    name, ...getBrokerTheme(name), stats: getBrokerStats(name)
  }));

  const totalInitialDeposit = brokers.reduce((acc, b) => acc + b.stats.initialDeposit, 0);
  const totalSaldo = brokers.reduce((acc, b) => acc + b.stats.saldo, 0);
  const totalBonus = brokers.reduce((acc, b) => acc + b.stats.bonus, 0);
  const totalEquidad = brokers.reduce((acc, b) => acc + b.stats.equidad, 0);

  // INTERCEPTORES ESTRICTOS
  const checkPermissions = () => {
    if (isSecuring) return false;
    if (accountStatus === 'suspended' || accountStatus === 'banned') {
      setShowSuspendedModal(true); return false;
    }
    if (isExpired) {
      setShowExpiredModal(true); return false;
    }
    return true;
  };

  const openNewTxModal = () => {
    if (!checkPermissions()) return;
    setEditingId(null);
    setTxForm({ broker: uniqueBrokerNames[0] || '', type: 'DEPOSIT', amount: '' });
    setIsTxModalOpen(true);
  };

  const openEditTxModal = (tx: any) => {
    if (!checkPermissions()) return;
    setEditingId(tx.id);
    setTxForm({ broker: tx.broker, type: tx.type, amount: tx.amount.toString() });
    setIsTxModalOpen(true);
  };

  const openQuickEdit = (brokerName: string) => {
    if (!checkPermissions()) return;
    const stats = getBrokerStats(brokerName);
    setQuickEditBroker(brokerName);
    setQuickEditSaldo(stats.saldo.toString());
    setQuickEditBonus(stats.bonus.toString());
    setIsQuickEditOpen(true);
  };

  const handleDeleteTrigger = (tx: any) => {
     if (!checkPermissions()) return;
     setTxToDelete(tx);
  };
  
  const handleResetTrigger = (brokerName: string) => {
     if (!checkPermissions()) return;
     setBrokerToReset(brokerName);
  };

  const handleSaveTransaction = async () => {
    if (isSecuring || isExpired) return; // Bloqueo de inyección
    setIsSubmittingTx(true);
    const { data: { user } } = await supabase.auth.getUser();
    const amountNum = parseFloat(txForm.amount);
    
    if (amountNum > 0 && user && txForm.broker) {
      if (editingId) {
        await supabase.from('transactions').update({ broker: txForm.broker, type: txForm.type, amount: amountNum }).eq('id', editingId);
      } else {
        await supabase.from('transactions').insert([{ user_id: user.id, broker: txForm.broker, type: txForm.type, amount: amountNum }]);
      }
      await fetchData();
      setTimeout(() => window.location.reload(), 800);
      setIsTxModalOpen(false);
    }
    setIsSubmittingTx(false);
  };

  const confirmDelete = async () => {
    if (txToDelete && !isExpired) {
      await supabase.from('transactions').delete().eq('id', txToDelete.id);
      await fetchData();
      setTxToDelete(null);
      setTimeout(() => window.location.reload(), 800);
    }
  };

  const saveQuickEdit = async () => {
    if (isSecuring || isExpired) return;
    setIsSubmittingTx(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const stats = getBrokerStats(quickEditBroker);
    const targetSaldo = parseFloat(quickEditSaldo) || 0;
    const targetBonus = parseFloat(quickEditBonus) || 0;
    
    const saldoDiff = targetSaldo - stats.saldo;
    const bonusDiff = targetBonus - stats.bonus;
    
    const newTxs = [];
    if (saldoDiff !== 0) {
      newTxs.push({ user_id: user.id, broker: quickEditBroker, type: saldoDiff > 0 ? 'DEPOSIT' : 'WITHDRAWAL', amount: Math.abs(saldoDiff) });
    }
    if (bonusDiff !== 0) {
      newTxs.push({ user_id: user.id, broker: quickEditBroker, type: 'BONUS', amount: bonusDiff });
    }

    if (newTxs.length > 0) {
      await supabase.from('transactions').insert(newTxs);
      await fetchData();
    }
    setIsQuickEditOpen(false);
    setIsSubmittingTx(false);
    setTimeout(() => window.location.reload(), 800);
  };

  const confirmResetBroker = async () => {
    if (isSecuring || isExpired) return;
    setIsSubmittingTx(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (brokerToReset && user) {
      const stats = getBrokerStats(brokerToReset);
      const newTxs = [];
      
      if (stats.saldo !== 0) {
        newTxs.push({ user_id: user.id, broker: brokerToReset, type: stats.saldo > 0 ? 'WITHDRAWAL' : 'DEPOSIT', amount: Math.abs(stats.saldo) });
      }
      if (stats.bonus !== 0) {
        newTxs.push({ user_id: user.id, broker: brokerToReset, type: 'BONUS', amount: -stats.bonus });
      }

      if (newTxs.length > 0) {
        await supabase.from('transactions').insert(newTxs);
        await fetchData();
      }
    }
    setBrokerToReset(null);
    setIsSubmittingTx(false);
    setTimeout(() => window.location.reload(), 800);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  return (
    <>
      {showSuspendedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
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

      {showExpiredModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b0914] border border-amber-500/30 p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-amber-500/10 flex items-center justify-center rounded-full mb-5 border border-amber-500/20">
              <span className="material-symbols-outlined text-3xl text-amber-400">timer_off</span>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">Licencia Caducada</h3>
            <p className="text-sm text-slate-400 mb-8 px-2">
              Su período activo ha finalizado. La cuenta está en modo <strong className="text-amber-400">Solo Lectura</strong>. Renueve su suscripción para realizar transacciones de capital.
            </p>
            <button onClick={() => setShowExpiredModal(false)} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3.5 rounded-xl transition-colors">Entendido</button>
          </div>
        </div>
      )}

      {txToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm pl-20 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-rose-500 text-3xl">warning</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">¿Eliminar movimiento?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Estás a punto de borrar un {txToDelete.type} de ${txToDelete.amount} en {txToDelete.broker}.</p>
            <div className="flex gap-3">
              <button onClick={() => setTxToDelete(null)} className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm py-3 rounded-xl transition-colors">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm py-3 rounded-xl transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {brokerToReset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm pl-20 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-rose-500 text-3xl">delete_forever</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">¿Resetear Búnker a $0.00?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Esta acción inyectará ajustes matemáticos para dejar el capital de <b className="text-slate-700 dark:text-slate-300">{brokerToReset}</b> en cero.</p>
            <div className="flex gap-3">
              <button onClick={() => setBrokerToReset(null)} disabled={isSubmittingTx} className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm py-3 rounded-xl transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={confirmResetBroker} disabled={isSubmittingTx} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm py-3 rounded-xl transition-colors disabled:opacity-50">
                {isSubmittingTx ? 'Procesando...' : 'Sí, Resetear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isQuickEditOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm pl-20">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500">sync_alt</span> Sincronizar {quickEditBroker}
              </h2>
              <button onClick={() => setIsQuickEditOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Saldo Real ($)</label>
                  <input type="number" step="0.01" value={quickEditSaldo} onChange={e => setQuickEditSaldo(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-lg outline-none font-black text-slate-800 dark:text-slate-100" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Bono Real ($)</label>
                  <input type="number" step="0.01" value={quickEditBonus} onChange={e => setQuickEditBonus(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-lg outline-none font-black text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <button onClick={saveQuickEdit} disabled={isSubmittingTx || quickEditSaldo === '' || quickEditBonus === ''} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-3 rounded-xl disabled:opacity-50 transition-colors">
                {isSubmittingTx ? 'SINCRONIZANDO...' : 'GUARDAR AJUSTE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isTxModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm pl-20">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500">{editingId ? 'edit' : 'payments'}</span> 
                {editingId ? 'EDITAR CAPITAL' : 'GESTIÓN CAPITAL'}
              </h2>
              <button onClick={() => setIsTxModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Broker</label>
                <select value={txForm.broker} onChange={e => setTxForm({...txForm, broker: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none font-medium text-slate-700 dark:text-slate-300">
                  {uniqueBrokerNames.length === 0 && <option value="" disabled>No hay Búnkers activos</option>}
                  {uniqueBrokerNames.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Movimiento</label>
                  <select value={txForm.type} onChange={e => setTxForm({...txForm, type: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none font-medium text-slate-700 dark:text-slate-300">
                    <option value="DEPOSIT">Depósito</option>
                    <option value="WITHDRAWAL">Retiro</option>
                    <option value="BONUS">Bono</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Monto ($)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none font-bold text-slate-700 dark:text-slate-100" />
                </div>
              </div>
              <button onClick={handleSaveTransaction} disabled={isSubmittingTx || !txForm.amount || !txForm.broker} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 rounded-xl disabled:opacity-50 transition-colors">
                {isSubmittingTx ? 'GUARDANDO...' : 'GUARDAR MOVIMIENTO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isHistoryOpen && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm pl-20 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh]">
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center rounded-t-2xl">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500">receipt_long</span> HISTORIAL DE MOVIMIENTOS
              </h2>
              <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><span className="material-symbols-outlined">close</span></button>
            </div>
            
            <div className="overflow-y-auto p-6 flex-1">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 font-bold text-sm">No hay registros de capital.</div>
              ) : (
                <div className="space-y-3">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center p-4 border border-slate-200 dark:border-slate-700/50 rounded-xl bg-white dark:bg-slate-800/50 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tx.type === 'DEPOSIT' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : tx.type === 'WITHDRAWAL' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}`}>
                          <span className="material-symbols-outlined text-[20px]">
                            {tx.type === 'DEPOSIT' ? 'arrow_downward' : tx.type === 'WITHDRAWAL' ? 'arrow_upward' : 'loyalty'}
                          </span>
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">${Number(tx.amount).toFixed(2)}</div>
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex gap-2 mt-0.5">
                            <span className="text-slate-600 dark:text-slate-400">{tx.broker}</span> • <span>{tx.type}</span> • <span>{formatDate(tx.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setIsHistoryOpen(false); openEditTxModal(tx); }} className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700 transition-colors">
                          <span className="material-symbols-outlined text-[18px] block">edit</span>
                        </button>
                        <button onClick={() => handleDeleteTrigger(tx)} className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700 transition-colors">
                          <span className="material-symbols-outlined text-[18px] block">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 relative z-10 transition-colors duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Base de Capital Institucional (USD)</h2>
          <div className="flex gap-2">
            <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg uppercase transition-colors">
              <span className="material-symbols-outlined text-[14px]">history</span> Historial
            </button>
            <button onClick={openNewTxModal} disabled={isSecuring} className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg uppercase transition-colors disabled:opacity-50">
              <span className="material-symbols-outlined text-[14px]">add</span> Transacción
            </button>
          </div>
        </div>

        <div className="bg-slate-800 dark:bg-[#0B1120] border border-slate-700 dark:border-slate-800/80 rounded-xl p-5 mb-6 flex flex-wrap gap-6 items-center justify-between shadow-inner transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 shadow-sm border border-indigo-500/30">
              <span className="material-symbols-outlined text-2xl">account_balance</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Consolidado Global</span>
              <span className="text-2xl font-black text-white">${totalEquidad.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          
          <div className="flex gap-6 pr-2">
            <div className="flex flex-col text-right">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Depósito Total</span>
              <span className="text-sm font-bold text-emerald-400">${totalInitialDeposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="w-px h-8 bg-slate-700 dark:bg-slate-800 self-center"></div>
            <div className="flex flex-col text-right">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Saldo Real Total</span>
              <span className="text-sm font-bold text-slate-200">${totalSaldo.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="w-px h-8 bg-slate-700 dark:bg-slate-800 self-center"></div>
            <div className="flex flex-col text-right">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bono Total</span>
              <span className="text-sm font-bold text-indigo-400">${totalBonus.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        
        {brokers.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 dark:text-slate-500 text-sm font-bold">
            No tienes Búnkers activos. Ve a "Entornos VIP" y crea uno nuevo.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {brokers.map(b => (
              <div key={b.name} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl relative group overflow-hidden transition-all hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{b.name}</span>
                  <span className={`text-[8px] font-black text-${b.color}-500 dark:text-${b.color}-400 bg-${b.color}-50 dark:bg-${b.color}-500/10 px-1.5 py-0.5 rounded`}>{b.label}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-black text-slate-800 dark:text-slate-100 transition-colors group-hover:text-indigo-900 dark:group-hover:text-indigo-400">
                    ${b.stats.equidad.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button onClick={() => openQuickEdit(b.name)} disabled={isSecuring} className="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 p-1 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:scale-110 disabled:opacity-50" title="Ajuste rápido">
                      <span className="material-symbols-outlined text-[16px] block">edit</span>
                    </button>
                    <button onClick={() => handleResetTrigger(b.name)} disabled={isSecuring} className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-slate-800 p-1 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:scale-110 disabled:opacity-50" title="Resetear a cero">
                      <span className="material-symbols-outlined text-[16px] block">delete</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Depósito Inicial</span>
                    <span className="text-[11px] font-bold text-emerald-500 dark:text-emerald-400">${b.stats.initialDeposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Saldo Actual</span>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">${b.stats.saldo.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Bono (Crédito)</span>
                    <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400">${b.stats.bonus.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}