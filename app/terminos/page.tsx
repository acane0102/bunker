import Link from "next/link";

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[#07050f] text-slate-300 p-8 md:p-20 font-sans selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto bg-[#0b0914] p-10 md:p-14 rounded-[2rem] border border-slate-800/80 shadow-2xl relative overflow-hidden">
        
        {/* Efecto de fondo */}
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none"></div>

        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 text-sm font-bold mb-8 inline-flex items-center gap-2 transition-colors">
          &larr; Volver al Búnker
        </Link>
        
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">Términos de Servicio</h1>
        <p className="text-sm text-slate-500 mb-10 font-medium">Última actualización: Agosto 2026</p>

        <div className="space-y-8 text-sm md:text-base leading-relaxed text-slate-400">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Aceptación de los Términos</h2>
            <p>Al acceder y utilizar Acane Búnker, aceptas estar sujeto a estos Términos de Servicio. Si no estás de acuerdo con alguna parte de los términos, no tienes permiso para acceder al servicio.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Uso de la Plataforma</h2>
            <p>Acane Búnker es una herramienta de auditoría y gestión de riesgo. No proporcionamos asesoramiento financiero, señales de trading ni recomendaciones de inversión. Eres 100% responsable de tu capital y de las decisiones operativas que tomes en el mercado.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Cuentas y Seguridad</h2>
            <p>Eres responsable de salvaguardar la contraseña que utilizas para acceder al servicio y de cualquier actividad o acción bajo tu contraseña. Cualquier sospecha de actividad fraudulenta o ilegal puede ser motivo de terminación de tu cuenta.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Cancelaciones y Reembolsos</h2>
            <p>Todos los pagos realizados son definitivos y no reembolsables. Es responsabilidad exclusiva del usuario gestionar la cancelación de su suscripción antes del inicio del siguiente ciclo de facturación para evitar cargos adicionales.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Contacto</h2>
            <p>Para cualquier notificación legal o soporte, contáctanos directamente en: <a href="mailto:info@businessforex.club" className="text-indigo-400 font-bold hover:underline">info@businessforex.club</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}