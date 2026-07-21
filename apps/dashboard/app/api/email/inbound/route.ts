// POST /api/email/inbound?token=... — webhook des emails entrants du cabinet.
// À brancher sur le service de réception (Brevo Inbound, Mailgun, Make, n8n...).
// L'email est enregistré et un brouillon de réponse est généré automatiquement,
// visible dans l'onglet Emails du tableau de bord pour validation avant envoi.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { genererBrouillon } from "@/lib/draft";

export const dynamic = "force-dynamic";

type EmailEntrant = { deEmail: string; objet: string; contenu: string };

/** Accepte le format générique {from, subject, text} et le format Brevo Inbound. */
function parsePayload(body: any): EmailEntrant[] {
  if (Array.isArray(body?.items)) {
    // Format Brevo Inbound : { items: [{ From: { Address }, Subject, RawTextBody }] }
    return body.items
      .map((it: any) => ({
        deEmail: String(it?.From?.Address ?? it?.from ?? ""),
        objet: String(it?.Subject ?? it?.subject ?? "(sans objet)"),
        contenu: String(it?.RawTextBody ?? it?.text ?? ""),
      }))
      .filter((e: EmailEntrant) => e.deEmail && e.contenu);
  }
  const deEmail = String(body?.from ?? body?.sender ?? "");
  const contenu = String(body?.text ?? body?.body ?? body?.contenu ?? "");
  if (!deEmail || !contenu) return [];
  return [{ deEmail, objet: String(body?.subject ?? body?.objet ?? "(sans objet)"), contenu }];
}

export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  const agent = await prisma.agent.findUnique({ where: { emailWebhookToken: token } });
  if (!agent) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const emails = parsePayload(body);
  if (emails.length === 0) return NextResponse.json({ error: "empty_payload" }, { status: 400 });

  const ids: string[] = [];
  for (const e of emails) {
    const brouillon = await genererBrouillon(agent, e.deEmail, e.objet, e.contenu);
    const enregistre = await prisma.emailMessage.create({
      data: {
        tenantId: agent.tenantId,
        deEmail: e.deEmail,
        objet: e.objet,
        contenu: e.contenu,
        brouillon,
        statut: "nouveau",
      },
    });
    ids.push(enregistre.id);
  }

  return NextResponse.json({ ok: true, recus: ids.length });
}
