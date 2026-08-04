"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

import AddTradeModal from "./AddTradeModal";
import ImportTradesModal from "./ImportTradesModal";

export default function GlobalModals() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [mentors, setMentors] = useState<any[]>([]);
  const [tradeToEdit, setTradeToEdit] = useState<any>(null);
  const [currentViewAccount, setCurrentViewAccount] = useState("ALL");

  useEffect(() => {
    const handleAdd = (e: any) => {
      setTradeToEdit(e.detail || null);
      setCurrentViewAccount(localStorage.getItem("bunker_account") || "ALL");
      setIsAddOpen(true);
    };
    window.addEventListener('open-add-trade', handleAdd);
    return () => window.removeEventListener('open-add-trade', handleAdd);
  }, []);

  const handleSaveTrade = async (tradeData: any) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("No hay usuario autenticado.");
      toast.error("Error: Sesión no detectada. Por favor, asegúrate de estar logueado.");
      return;
    }

    const rrNumber = parseFloat(tradeData.rr_achieved) || 0;
    const commNumber = parseFloat(tradeData.commission) || 0;
    const netProfit = rrNumber - commNumber;
    const calculatedStatus = netProfit > 0 ? 'WIN' : netProfit < 0 ? 'LOSS' : 'BREAK EVEN';
    
    const formattedTrade = {
      user_id: user.id,
      account: tradeData.account, 
      mentor: tradeData.mentor, 
      asset: tradeData.asset,
      direction: tradeData.direction || 'BUY', 
      setup_type: tradeData.setup_type, 
      rr_achieved: rrNumber, 
      commission: commNumber,
      status: calculatedStatus,
      image_url: tradeData.image_url || null, 
      created_at: tradeData.created_at || new Date().toISOString(),
      notes: tradeData.notes || "", 
      tags: tradeData.tags || "", 
      investment: tradeData.investment || 0 
    };

    let res;
    if (tradeToEdit) {
      res = await supabase.from('trades').update(formattedTrade).eq('id', tradeToEdit.id);
    } else {
      res = await supabase.from('trades').insert([formattedTrade]);
    }

    if (!res.error) { 
      setIsAddOpen(false);
      setTradeToEdit(null);
      toast.success("¡Operación guardada!");
      
      // EL F5 AUTOMÁTICO: Obliga a recargar para limpiar la caché de Next.js
      setTimeout(() => window.location.reload(), 800); 
    } else {
      console.error("DB Error:", res.error);
      toast.error(`Error: ${res.error.message}`);
    }
  };

  return (
    <>
      <AddTradeModal 
        isOpen={isAddOpen} 
        onClose={() => { setIsAddOpen(false); setTradeToEdit(null); }} 
        onSave={handleSaveTrade} 
        tradeToEdit={tradeToEdit} 
        mentors={mentors} 
        defaultAccount={currentViewAccount} 
      />
      <ImportTradesModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onSuccess={() => window.location.reload()} 
      />
    </>
  );
}