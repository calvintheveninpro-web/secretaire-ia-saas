// GET /api/calls/:id/transcript — télécharge la transcription intégrale d'un appel.

import { prisma } from "@/lib/db";
import { getSessionTenant } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const tenant = await getSessionTenant();
  if (!tenant) return new Response("Non autorisé", { status: 401 });

  const call = await prisma.call.findFirst({
    where: { id: params.id, tenantId: tenant.id },
  });
  if (!call) return new Response("Introuvable", { status: 404 });

  let transcript: { role: string; text: string }[] = [];
  try {
    transcript = JSON.parse(call.transcriptJson || "[]");
  } catch {
    transcript = [];
  }

  const lignes = [
    `Transcription d'appel — ${tenant.nom}`,
    `Date : ${new Date(call.startedAt).toLocaleString("fr-FR")}`,
    `Numéro : ${call.fromNumber}`,
    `Durée : ${call.durationSec != null ? `${call.durationSec} s` : "inconnue"}`,
    call.summary ? `Résumé : ${call.summary}` : "",
    "",
    ...transcript.map((t) => `${t.role === "agent" ? "Secrétaire IA" : "Appelant"} : ${t.text}`),
  ].filter((l, i) => l !== "" || i > 4);

  return new Response("\uFEFF" + lignes.join("\r\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="transcription-${call.id}.txt"`,
    },
  });
}
