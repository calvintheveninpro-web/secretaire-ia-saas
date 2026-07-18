// POST /api/stripe/checkout — crée une session de paiement Stripe (abonnement) pour le cabinet connecté.

import { NextResponse } from "next/server";
import { getSessionTenant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe, stripeConfigured, PRICE_ID, APP_URL } from "@/lib/stripe";

export async function POST() {
  const tenant = await getSessionTenant();
  if (!tenant) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!stripeConfigured() || !stripe) {
    // Mode démo : pas de clé Stripe -> on simule l'activation.
    await prisma.tenant.update({ where: { id: tenant.id }, data: { plan: "actif" } });
    return NextResponse.json({ url: `${APP_URL}/dashboard/billing?demo=1` });
  }

  let customerId = tenant.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: tenant.email, name: tenant.nom });
    customerId = customer.id;
    await prisma.tenant.update({ where: { id: tenant.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: PRICE_ID, quantity: 1 }],
    success_url: `${APP_URL}/dashboard/billing?success=1`,
    cancel_url: `${APP_URL}/dashboard/billing?canceled=1`,
    metadata: { tenantId: tenant.id },
  });

  return NextResponse.json({ url: session.url });
}
