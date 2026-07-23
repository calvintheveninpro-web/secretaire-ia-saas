// Envoi d'emails via Brevo quand BREVO_API_KEY est configurée.
// Sans clé, l'email est journalisé en mode « simulé » : le contenu apparaît
// dans l'onglet Messages du tableau de bord, rien n'est envoyé.
// (Mise en service Brevo : envoi transactionnel activé en production.)

import { prisma } from "./db";
import type { TypeMessage } from "./sms";

const BREVO_KEY = process.env.BREVO_API_KEY ?? "";
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL ?? "";
const FROM_NAME = process.env.BREVO_FROM_NAME ?? "Secrétaire IA";

export function emailConfigured() {
  return Boolean(BREVO_KEY && FROM_EMAIL);
}

/** Envoie un email (ou le simule) et le journalise dans la table Message. */
export async function sendEmail(
  tenantId: string,
  destinataire: string,
  objet: string,
  contenu: string,
  type: TypeMessage,
): Promise<{ statut: "envoye" | "simule" | "echec" }> {
  let statut: "envoye" | "simule" | "echec" = "simule";

  if (emailConfigured() && destinataire) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": BREVO_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { email: FROM_EMAIL, name: FROM_NAME },
          to: [{ email: destinataire }],
          subject: objet,
          textContent: contenu,
        }),
      });
      statut = res.ok ? "envoye" : "echec";
    } catch {
      statut = "echec";
    }
  }

  await prisma.message.create({
    data: {
      tenantId,
      canal: "email",
      destinataire,
      contenu: `${objet}\n\n${contenu}`,
      type,
      statut,
    },
  });
  return { statut };
}
