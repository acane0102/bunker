import Link from "next/link";

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[#07050f] text-slate-300 p-8 md:p-20 font-sans selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto bg-[#0b0914] p-10 md:p-14 rounded-[2rem] border border-slate-800/80 shadow-2xl relative overflow-hidden">
        
        {/* Efecto de fondo */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none"></div>

        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 text-sm font-bold mb-8 inline-flex items-center gap-2 transition-colors">
          &larr; Volver al Búnker
        </Link>
        
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">Política de Privacidad</h1>
        <p className="text-sm text-slate-500 mb-10 font-medium">Última actualización: Agosto 2026</p>

        <div className="space-y-8 text-sm md:text-base leading-relaxed text-slate-400">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Información que recopilamos</h2>
            <p>Recopilamos tu dirección de correo electrónico al registrarte. Además, procesamos los datos de tus operaciones de trading que subes a la plataforma (ya sea mediante archivos CSV o ingreso manual) para el correcto funcionamiento de las métricas del dashboard.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Uso de la información</h2>
            <p>Usamos tus datos única y exclusivamente para generar tu analítica de riesgo (Motor Monte Carlo, Win Rate, Drawdown). Nunca venderemos, alquilaremos ni compartiremos tu historial de trading o métricas financieras con terceros o entidades externas.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Seguridad de los datos</h2>
            <p>La seguridad de tu información es de nivel institucional. Tus datos están protegidos en nuestros servidores con encriptación moderna. Implementamos medidas estrictas para evitar el acceso, alteración o destrucción no autorizada de tu información personal y operativa.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Tus Derechos (Eliminación de datos)</h2>
            <p>Tienes el derecho absoluto sobre tus datos. Puedes solicitar la eliminación total y permanente de tu cuenta y de todo tu historial de operaciones de nuestra base de datos en cualquier momento contactando a nuestro equipo de soporte.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Contacto</h2>
            <p>Si tienes preguntas sobre cómo manejamos tu privacidad o deseas ejercer tus derechos sobre tus datos, escríbenos a: <a href="mailto:info@businessforex.club" className="text-indigo-400 font-bold hover:underline">info@businessforex.club</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}