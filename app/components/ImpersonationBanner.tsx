import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ImpersonationBanner() {
  const cookieStore = await cookies();
  const impersonatedId = cookieStore.get("impersonated_user_id")?.value;

  if (!impersonatedId) return null; // Si no hay cookie, el banner se vuelve invisible automáticamente

  async function exitImpersonation() {
    "use server";
    const actionCookieStore = await cookies();
    actionCookieStore.delete("impersonated_user_id");
    redirect("/admin"); // Te devuelve a Búnker Central y apaga el Modo Dios
  }

  return (
    <div className="w-full bg-red-600 text-white px-4 py-2 flex flex-col md:flex-row items-center justify-center gap-4 z-[9999] relative shadow-lg shadow-red-900/20 border-b border-red-800">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-sm animate-pulse">warning</span>
        <span className="text-xs font-black tracking-widest uppercase">
          MODO DIOS ACTIVO: Estás viendo la cuenta como cliente
        </span>
      </div>
      <form action={exitImpersonation}>
        <button type="submit" className="bg-black/30 hover:bg-black/50 px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer border border-white/20 hover:border-white/40 shadow-sm">
          Salir y Volver al Admin
        </button>
      </form>
    </div>
  );
}