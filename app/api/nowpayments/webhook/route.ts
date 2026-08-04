import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Usamos las llaves maestras (Service Role) porque el webhook corre del lado del servidor, sin sesión de usuario
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-nowpayments-sig");

    // 1. Verificación de Seguridad: Comprobar que la petición viene de NowPayments
    const hmac = crypto.createHmac("sha512", process.env.NOWPAYMENTS_IPN_SECRET!);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }

    const data = JSON.parse(rawBody);

    // 2. Ejecutar lógica solo si el pago se completó con éxito
    if (data.payment_status === "finished") {
      
      const userId = data.order_id; // Pasamos el ID del usuario como order_id al crear la factura

      // A) Actualizar el plan a PRO y sumar 30 días en la tabla profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          plan: "pro",
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          is_expired: false
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // B) NUEVO: REGISTRAR EL PAGO EN EL LIBRO CONTABLE
      const { error: paymentError } = await supabase
        .from("payments")
        .insert([{
          user_id: userId,
          amount: data.price_amount, // Ej: 2.99
          currency: data.price_currency, // Ej: usd
          status: data.payment_status,
          nowpayments_invoice_id: data.invoice_id?.toString() || data.payment_id?.toString()
        }]);

      if (paymentError) throw paymentError;
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Error en Webhook:", error);
    return NextResponse.json({ error: "Error procesando el webhook" }, { status: 500 });
  }
}