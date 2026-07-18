// POST /api/stripe/webhook — reçoit les événements d'abonnement Stripe et met à jour le plan du cabinet.
// Configure l'URL de ce webhook dans le dashboard Stripe et renseigne STRIPE_WEBHOOK_SECRET.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  if (!stripe) return NextResponse.json({ received: true, note: "stripe non configuré" });

  const sig = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const payload = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, secret);
  } catch (e: any) {
    return NextResponse.json({ error: `signature invalide: ${e.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as any;
      if (s.metadata?.tenantId) {
        await prisma.tenant.update({
          where: { id: s.metadata.tenantId },
          data: { plan: "actif", stripeSubscriptionId: s.subscription ?? null },
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as any;
      await prisma.tenant.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { plan: "suspendu" },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
