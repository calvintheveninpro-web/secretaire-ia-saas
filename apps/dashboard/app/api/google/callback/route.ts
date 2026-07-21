// GET /api/google/callback — retour OAuth Google : échange le code contre des jetons
// et active le connecteur Google Calendar du cabinet.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exchangeCode, verifyState } from "@/lib/google";
import { APP_URL } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const retour = (statut: string) =>
    NextResponse.redirect(new URL(`/dashboard/connectors?google=${statut}`, APP_URL));

  if (!code || !state) return retour("refuse");
  const tenantId = verifyState(state);
  if (!tenantId) return retour("etat_invalide");

  const agent = await prisma.agent.findUnique({ where: { tenantId } });
  if (!agent) return retour("cabinet_introuvable");

  const tokens = await exchangeCode(code);
  if (!tokens) return retour("echec");

  let connecteurs: Record<string, any> = {};
  try {
    connecteurs = JSON.parse(agent.connecteursJson || "{}");
  } catch {
    connecteurs = {};
  }
  connecteurs.google_calendar = {
    ...(connecteurs.google_calendar ?? {}),
    actif: true,
    connecteLe: new Date().toISOString(),
    oauth: true,
  };

  await prisma.agent.update({
    where: { tenantId },
    data: {
      googleTokensJson: JSON.stringify(tokens),
      connecteursJson: JSON.stringify(connecteurs),
    },
  });

  return retour("ok");
}
