"use client";

/* INICIO IMPORTACIONES */
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
/* FIN IMPORTACIONES */

/* INICIO INTERFACES */
interface BunkerRadarProps {
  radarData: any[];
  indiceScore: number;
  hasTrades: boolean;
}
/* FIN INTERFACES */

/* INICIO COMPONENTE PRINCIPAL: BunkerRadar */
export default function BunkerRadar({ radarData, indiceScore, hasTrades }: BunkerRadarProps) {
  
  /* INICIO LÓGICA DE BADGES (GAMIFICACIÓN) */
  const getBadge = (score: number) => {
    if (!hasTrades) return null;
    if (score >= 80) return { label: 'FRANCOTIRADOR', style: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30' };
    if (score >= 50) return { label: 'EN ENTRENAMIENTO', style: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' };
    // Animación de pulso para riesgo de quiebra
    return { label: 'RIESGO DE QUIEBRA', style: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30 animate-pulse' };
  };

  const badge = getBadge(indiceScore);
  /* FIN LÓGICA DE BADGES (GAMIFICACIÓN) */

  /* INICIO RENDERIZADO VISUAL */
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex flex-col h-[350px] transition-colors duration-300">
      
      {/* HEADER DEL RADAR Y BADGES */}
      <div className="flex justify-between items-start mb-2 z-10">
        <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Radar Operativo</h3>
        <div className="text-right flex flex-col items-end">
          <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Índice Búnker</div>
          <div className={`text-3xl font-black leading-none mb-1.5 ${indiceScore >= 80 ? 'text-indigo-500 dark:text-indigo-400' : indiceScore >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {indiceScore}
          </div>
          {badge && (
            <div className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${badge.style}`}>
              {badge.label}
            </div>
          )}
        </div>
      </div>
      
      {/* GRÁFICO RECHARTS */}
      <div className="flex-grow w-full -mt-6 relative">
        {hasTrades ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
              <PolarGrid stroke="rgba(148, 163, 184, 0.2)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Puntuación" dataKey="A" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.25} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#f8fafc', borderRadius: '12px', border: 'none', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)' }} />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-bold text-slate-400 dark:text-slate-600 text-center">Sin datos para analizar el índice.</div>
        )}
      </div>
    </div>
  );
  /* FIN RENDERIZADO VISUAL */
}
/* FIN COMPONENTE PRINCIPAL: BunkerRadar */