// Intégration Stripe (abonnements). En l'absence de clé, les fonctions renvoient des valeurs
// de démonstration pour ne pas bloquer le développement local.

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY ?? "";
export const stripe = key ? new Stripe(key, { apiVersion: "2024-06-20" }) : null;

export const PRICE_ID = process.env.STRIPE_PRICE_ID ?? "";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function stripeConfigured() {
  return Boolean(stripe && PRICE_ID);
}
