"use client";
import { useState } from "react";

export default function UpgradeButton({ className = "" }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/nowpayments/create", { method: "POST" });
      const data = await res.json();
      
      if (data.invoiceUrl) {
        window.location.href = data.invoiceUrl;
      } else {
        alert("Error al generar la factura. Intenta de nuevo.");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión con la pasarela.");
    }
    setLoading(false);
  };

  return (
    <button 
      onClick={handlePayment} 
      disabled={loading}
      className={`flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-2 px-5 rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 uppercase tracking-wide whitespace-nowrap ${className}`}
    >
      <span className="material-symbols-outlined text-[16px]">bolt</span>
      {loading ? "CARGANDO..." : "RENOVAR PRO ($2.99)"}
    </button>
  );
}