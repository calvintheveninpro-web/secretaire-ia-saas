// PUT /api/emails/:id — actions sur un email entrant du cabinet connecté :
// { action: "envoyer", reponse }  -> envoie la réponse (Brevo ou simulé) et clôt l'email
// { action: "brouillon", reponse } -> enregistre le brouillon modifié
// { action: "ignorer" }            -> marque l'email comme ignoré

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const tenant = await getSessionTenant();
  if (!tenant) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const email = await prisma.emailMessage.findFirst({
    where: { id: params.id, tenantId: tenant.id },
  });
  if (!email) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json();
  const action = String(body?.action ?? "");

  if (action === "brouillon") {
    await prisma.emailMessage.update({
      where: { id: email.id },
      data: { brouillon: String(body?.reponse ?? "") },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "ignorer") {
    await prisma.emailMessage.update({
      where: { id: email.id },
      data: { statut: "ignore" },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "envoyer") {
    const reponse = String(body?.reponse ?? email.brouillon ?? "").trim();
    if (!reponse) return NextResponse.json({ error: "empty_reply" }, { status: 400 });
    const { statut } = await sendEmail(
      tenant.id,
      email.deEmail,
      `Re: ${email.objet}`,
      reponse,
      "confirmation",
    );
    await prisma.emailMessage.update({
      where: { id: email.id },
      data: { statut: "repondu", reponse, brouillon: reponse },
    });
    return NextResponse.json({ ok: true, envoi: statut });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
