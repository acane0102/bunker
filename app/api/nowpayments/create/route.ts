import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    );

    // 1. Verificamos quién está pidiendo el pago
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 2. Pedimos la factura a NowPayments ($20 USD)
    const response = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key": process.env.NOWPAYMENTS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: 20, 
        price_currency: "usd",
        order_id: user.id, // CLAVE: Adjuntamos el ID del usuario a la factura
        order_description: "Licencia PRO BúnkerApp (30 Días)",
        // La URL donde el usuario regresará al terminar el pago:
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/profile?payment=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/profile?payment=cancel`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Error al conectar con NowPayments");
    }

    // 3. Devolvemos el link mágico de la factura al frontend
    return NextResponse.json({ invoiceUrl: data.invoice_url });

  } catch (error: any) {
    console.error("Fallo al crear pago:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}