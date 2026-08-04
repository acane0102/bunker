import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    // 1. Inicializamos Supabase ADENTRO de la función para evitar errores de compilación
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const rawBody = await req.text();
    const signature = req.headers.get("x-nowpayments-sig");

    // 2. Verificación de Seguridad: Comprobar que la petición viene de NowPayments
    const hmac = crypto.createHmac("sha512", process.env.NOWPAYMENTS_IPN_SECRET!);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }

    const data = JSON.parse(rawBody);

    // 3. Ejecutar lógica solo si el pago se completó con éxito
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

      // B) REGISTRAR EL PAGO EN EL LIBRO CONTABLE
      const { error: paymentError } = await supabase
        .from("payments")
        .insert([{
          user_id: userId,
          amount: data.price_amount, 
          currency: data.price_currency, 
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