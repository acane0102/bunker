"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function ImportTradesModal({ isOpen, onClose, onSuccess }: any) {
  
  const [file, setFile] = useState<File | null>(null);
  const [account, setAccount] = useState("");
  const [mentor, setMentor] = useState("Análisis Propio");
  const [setup, setSetup] = useState("Importación Masiva");
  const [isImporting, setIsImporting] = useState(false);
  
  const [mentors, setMentors] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<string[]>([]);
  
  // ESTADOS DE SEGURIDAD (BLINDAJE TOTAL)
  const [accountStatus, setAccountStatus] = useState("active");
  const [isExpired, setIsExpired] = useState(false);
  const [isSecuring, setIsSecuring] = useState(true);

  useEffect(() => {
    if(isOpen) {
      setFile(null); 
      setIsSecuring(true); // Bloqueamos la vista al abrir
      
      const fetchUserData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const [mentorsRes, profileRes] = await Promise.all([
            supabase.from('mentors').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
            supabase.rpc('get_my_bunker_profile')
          ]);

          if (profileRes.data) {
            if (profileRes.data.status) setAccountStatus(profileRes.data.status);
            if (profileRes.data.is_expired !== undefined) setIsExpired(profileRes.data.is_expired);
          }

          const data = mentorsRes.data;
          if (data && data.length > 0) {
            setMentors(data);
            const uniqueBrokers = Array.from(new Set(data.map(m => m.broker).filter(Boolean))) as string[];
            const finalBrokers = uniqueBrokers.length > 0 ? uniqueBrokers : ["VT Markets", "PU Prime", "Libertex", "Exnova"];
            setBrokers(finalBrokers);
            
            const currentView = window.localStorage.getItem('bunker_view') || 'ALL';
            const initialBroker = (currentView !== 'ALL' && finalBrokers.includes(currentView)) ? currentView : finalBrokers[0];
            
            setAccount(initialBroker);
            
            const associatedMentor = data.find(m => m.broker === initialBroker);
            if (associatedMentor) {
              setMentor(associatedMentor.name);
              setSetup(associatedMentor.strategy || 'Estrategia Base');
            }
          } else {
            setBrokers(["VT Markets", "PU Prime", "Libertex", "Exnova"]);
            setAccount("VT Markets");
          }
        }
        setIsSecuring(false); // Quitamos el bloqueo
      };
      
      fetchUserData();
    }
  }, [isOpen]);

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
          <p className="text-sm text-slate-400 mb-8 px-2">Su cuenta está en modo <strong className="text-amber-400">Solo Lectura</strong>. No puede importar operaciones masivas. Por favor renueve su suscripción.</p>
          <button onClick={onClose} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3.5 rounded-xl transition-colors">Entendido</button>
        </div>
      </div>
    );
  }

  if (accountStatus === 'suspended' || accountStatus === 'banned') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-[#0b0914] border border-slate-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-rose-500/10 flex items-center justify-center rounded-full mb-5">
            <span className="material-symbols-outlined text-3xl text-rose-500">lock</span>
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">Acceso Restringido</h3>
          <p className="text-sm text-slate-400 mb-8 px-2">Su cuenta está suspendida. No puede importar operaciones.</p>
          <button onClick={onClose} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-xl transition-colors">Cerrar</button>
        </div>
      </div>
    );
  }

  const handleAccountChange = (e: any) => {
    const newBroker = e.target.value;
    setAccount(newBroker);
    
    const associatedMentor = mentors.find(m => m.broker === newBroker);
    if (associatedMentor) {
      setMentor(associatedMentor.name);
      setSetup(associatedMentor.strategy || 'Estrategia Base'); 
    } else {
      setMentor("Análisis Propio");
      setSetup("Importación Masiva");
    }
  };

  const handleMentorChange = (e: any) => {
    const selectedMentor = e.target.value;
    setMentor(selectedMentor);
    const m = mentors.find(m => m.name === selectedMentor && m.broker === account);
    if (m) setSetup(m.strategy || 'Estrategia Base');
  };

  const handleImport = async () => {
    if (!file || isSecuring || isExpired) return toast.error("⚠️ Operación bloqueada o sin archivo.");
    setIsImporting(true);
    const toastId = toast.loading(`Escaneando formato ${account}...`);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const cleanText = text.replace(/^\uFEFF/, '');
        const lines = cleanText.split(/\r?\n/).filter(l => l.trim() !== '');
        
        let tradesToInsert: any[] = [];

        if (account.toLowerCase().includes("exnova")) {
          const headerIndex = lines.findIndex(l => l.toLowerCase().includes('position id') || l.toLowerCase().includes('net pnl'));
          if (headerIndex === -1) {
            setIsImporting(false); toast.dismiss(toastId);
            return toast.error("🚨 No parece un CSV de Exnova válido.");
          }

          const headers = lines[headerIndex].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
          const idxTime = headers.findIndex(h => h === 'closing date time');
          const idxAsset = headers.findIndex(h => h === 'asset');
          const idxDir = headers.findIndex(h => h === 'direction');
          const idxNet = headers.findIndex(h => h === 'net pnl');

          for (let i = headerIndex + 1; i < lines.length; i++) {
            const row = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
            if (row.length < headers.length) continue;

            const netStr = row[idxNet];
            if (!netStr || isNaN(parseFloat(netStr))) continue;
            const net = parseFloat(netStr);

            const rawDir = row[idxDir]?.toLowerCase() || '';
            const direction = rawDir.includes('put') ? 'SELL' : 'BUY';
            let assetName = row[idxAsset] || 'Binarias';

            tradesToInsert.push({
              account, mentor, asset: assetName.toUpperCase(), setup_type: setup,
              direction, rr_achieved: net, commission: 0,
              status: net > 0 ? 'WIN' : net < 0 ? 'LOSS' : 'BREAK EVEN',
              created_at: row[idxTime] || new Date().toISOString()
            });
          }
        } else {
          const headerIndex = lines.findIndex(l => l.toLowerCase().includes('p/l') || l.toLowerCase().includes('profit'));
          if (headerIndex === -1) {
            setIsImporting(false); toast.dismiss(toastId);
            return toast.error("🚨 No encontré la fila de títulos (MT4/MT5).");
          }

          const headers = lines[headerIndex].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
          let idxTime = headers.findIndex(h => h.includes('hora de cierre') || h.includes('time'));
          let idxAsset = headers.findIndex(h => h.includes('instrumento comercial') || h.includes('item') || h.includes('symbol'));
          let idxType = headers.findIndex(h => h.includes('tipo de orden') || h.includes('type'));
          let idxPL = headers.findIndex(h => h === 'p/l' || h.includes('profit'));

          if (idxTime === -1 || idxPL === -1 || idxAsset === -1 || idxType === -1) {
            if (headers.length >= 14) { idxAsset = 2; idxType = 3; idxTime = 8; idxPL = 13; } 
            else { setIsImporting(false); toast.dismiss(toastId); return toast.error("🚨 Formato de columnas MT4/MT5 no reconocido."); }
          }

          for (let i = headerIndex + 1; i < lines.length; i++) {
            const row = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
            if (row.length < headers.length) continue;

            const plStr = row[idxPL];
            if (!plStr || plStr === '--' || isNaN(parseFloat(plStr))) continue;
            const pl = parseFloat(plStr);

            const rawType = row[idxType]?.toLowerCase() || '';
            const direction = rawType.includes('sell') ? 'SELL' : 'BUY';
            let assetName = row[idxAsset] || 'Desc';
            assetName = assetName.replace(/\.s$/i, '').toUpperCase(); 

            let dateStr = row[idxTime];
            if (dateStr) {
              dateStr = dateStr.replace(/\./g, '-').replace(' ', 'T');
              const parsedDate = new Date(dateStr);
              if (!isNaN(parsedDate.getTime())) {
                  parsedDate.setTime(parsedDate.getTime() - (7 * 60 * 60 * 1000));
                  dateStr = parsedDate.toISOString();
              }
            }

            tradesToInsert.push({
              account, mentor, asset: assetName, setup_type: setup, direction, 
              rr_achieved: pl, commission: 0,
              status: pl > 0 ? 'WIN' : pl < 0 ? 'LOSS' : 'BREAK EVEN',
              created_at: dateStr || new Date().toISOString()
            });
          }
        }

        if (tradesToInsert.length === 0) {
           setIsImporting(false); toast.dismiss(toastId);
           return toast.error("No se encontraron operaciones válidas.");
        }

        const { data: { user } } = await supabase.auth.getUser();
        const finalTrades = tradesToInsert.map(trade => ({ ...trade, user_id: user?.id }));
        const { error } = await supabase.from('trades').insert(finalTrades);
        
        setIsImporting(false);
        toast.dismiss(toastId);

        if (error) {
          toast.error(`Error DB: ${error.message}`);
        } else {
          toast.success(`¡${finalTrades.length} trades inyectados a ${account}!`);
          setFile(null);
          if (typeof onSuccess === 'function') onSuccess();
          else window.location.reload();
        }

      } catch (err: any) {
        setIsImporting(false);
        toast.dismiss(toastId);
        toast.error(`Error leyendo el archivo: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#131022] rounded-3xl w-full max-w-lg shadow-2xl border border-slate-800 overflow-hidden">
        
        <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
          <h2 className="font-extrabold text-white text-lg flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-400 text-sm">upload_file</span>
            </div>
            Importar Registros
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white bg-slate-800/50 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Búnker Destino</label>
              <select value={account} onChange={handleAccountChange} className="w-full bg-[#0b0914] border border-slate-700 rounded-xl px-3 py-3 text-sm font-bold text-slate-300 outline-none cursor-pointer focus:border-indigo-500">
                {brokers.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Mentor / Estrategia</label>
              <select value={mentor} onChange={handleMentorChange} className="w-full bg-[#0b0914] border border-slate-700 rounded-xl px-3 py-3 text-sm font-bold text-slate-300 outline-none cursor-pointer focus:border-indigo-500">
                <option value="Análisis Propio">Análisis Propio</option>
                {mentors.filter(m => m.broker === account).map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Nombre del Setup a inyectar</label>
            <input type="text" value={setup} onChange={e => setSetup(e.target.value)} className="w-full bg-[#0b0914] border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-300 outline-none focus:border-indigo-500" />
          </div>

          <div 
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors mt-2 ${file ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/50'}`}
            onClick={() => document.getElementById('csv-upload')?.click()}
          >
            <input type="file" id="csv-upload" accept=".csv" className="hidden" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} />
            
            <span className={`material-symbols-outlined text-4xl mb-3 block ${file ? 'text-indigo-400' : 'text-slate-500'}`}>
              {file ? 'task' : 'cloud_upload'}
            </span>
            
            <h3 className="text-sm font-bold text-white mb-1">{file ? file.name : "Selecciona tu archivo CSV"}</h3>
            <p className="text-xs font-semibold text-slate-500">{file ? 'Archivo listo para procesar' : 'Soporta exportaciones de MetaTrader o tu Broker'}</p>
          </div>

          <button onClick={handleImport} disabled={isImporting || !file || !account || isSecuring || isExpired} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm py-4 rounded-xl transition-all disabled:opacity-50 disabled:bg-slate-800 shadow-lg shadow-indigo-500/20 disabled:shadow-none mt-2">
            {isImporting ? 'PROCESANDO...' : 'PROCESAR E IMPORTAR'}
          </button>
        </div>
      </div>
    </div>
  );
}