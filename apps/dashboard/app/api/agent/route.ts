// GET /api/agent?number=+33...   -> config de l'agent pour le moteur vocal (résolu par numéro entrant)
// GET /api/agent                 -> config de l'agent du cabinet connecté (dashboard)
// PUT /api/agent                 -> met à jour la config depuis le tableau de bord

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";

function toAgentConfig(agent: any) {
  return {
    id: agent.id,
    tenantId: agent.tenantId,
    nomCabinet: agent.nomCabinet,
    metier: agent.metier,
    nomProfessionnel: agent.nomProfessionnel,
    specialite: agent.specialite ?? undefined,
    adresse: agent.adresse ?? undefined,
    horairesOuverture: agent.horairesOuverture,
    dureeRdvParDefautMin: agent.dureeRdvParDefautMin,
    delaiMinAvantRdvHeures: agent.delaiMinAvantRdvHeures,
    numeroTransfertHumain: agent.numeroTransfertHumain ?? undefined,
    emailNotification: agent.emailNotification ?? undefined,
    langue: agent.langue,
    phraseAccueil: agent.phraseAccueil,
    faqCabinet: safeJson(agent.faqJson),
    numeroEntrant: agent.numeroEntrant ?? undefined,
    actif: agent.actif,
  };
}

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

export async function GET(req: Request) {
  const number = new URL(req.url).searchParams.get("number");
  if (number) {
    const agent = await prisma.agent.findUnique({ where: { numeroEntrant: number } });
    if (!agent) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(toAgentConfig(agent));
  }
  const tenant = await getSessionTenant();
  if (!tenant?.agent) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(toAgentConfig(tenant.agent));
}

export async function PUT(req: Request) {
  const tenant = await getSessionTenant();
  if (!tenant) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const agent = await prisma.agent.update({
    where: { tenantId: tenant.id },
    data: {
      nomCabinet: body.nomCabinet,
      metier: body.metier,
      nomProfessionnel: body.nomProfessionnel,
      specialite: body.specialite || null,
      adresse: body.adresse || null,
      horairesOuverture: body.horairesOuverture,
      numeroTransfertHumain: body.numeroTransfertHumain || null,
      emailNotification: body.emailNotification || null,
      phraseAccueil: body.phraseAccueil,
      faqJson: JSON.stringify(body.faqCabinet ?? {}),
      numeroEntrant: body.numeroEntrant || null,
      actif: body.actif ?? true,
    },
  });
  return NextResponse.json(toAgentConfig(agent));
}
