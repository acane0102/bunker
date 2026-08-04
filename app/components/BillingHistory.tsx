"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function BillingHistory() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('payments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (data) setPayments(data);
      }
      setLoading(false);
    };
    
    fetchPayments();
  }, []);

  if (loading) return <div className="animate-pulse h-24 bg-slate-800/20 rounded-2xl border border-slate-800/50"></div>;
  
  // Si no hay pagos registrados, no mostramos la tabla para mantener limpio el perfil
  if (payments.length === 0) return null; 

  return (
    <div className="bg-[#0b0914] border border-slate-800 rounded-2xl p-6 mt-6">
      <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-indigo-500 text-[18px]">receipt_long</span>
        Historial de Facturación
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] uppercase tracking-widest text-slate-500">
              <th className="pb-3 font-bold">Fecha</th>
              <th className="pb-3 font-bold">Monto</th>
              <th className="pb-3 font-bold">Método</th>
              <th className="pb-3 font-bold">Estado</th>
              <th className="pb-3 font-bold">Ref (ID)</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                <td className="py-3 text-slate-300 font-medium">
                  {new Date(p.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 font-bold text-emerald-400">
                  ${Number(p.amount).toFixed(2)}
                </td>
                <td className="py-3 text-slate-400 font-bold uppercase">
                  {p.currency}
                </td>
                <td className="py-3">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                    p.status === 'finished' 
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="py-3 text-slate-500 font-mono text-[10px]">
                  {p.nowpayments_invoice_id || '---'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}