// Jeu de données de démonstration : un cabinet, un agent, quelques appels et RDV.
// Lancement : npm run db:setup

import { PrismaClient } from "@prisma/client";
import { createHmac, randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { email: "demo@cabinet.fr" },
    update: {},
    create: {
      nom: "Cabinet du Dr Martin",
      email: "demo@cabinet.fr",
      passwordHash: hashPassword("demo1234"),
      plan: "actif",
      agent: {
        create: {
          nomCabinet: "Cabinet du Dr Martin",
          metier: "medecin",
          nomProfessionnel: "Dr Sophie Martin",
          specialite: "Médecine générale",
          adresse: "12 rue de la Paix, 75002 Paris",
          horairesOuverture: "Du lundi au vendredi, de 9h à 19h",
          numeroTransfertHumain: "+33100000000",
          emailNotification: "cabinet@exemple.fr",
          phraseAccueil:
            "Cabinet du Dr Martin, bonjour ! Je suis l'assistant virtuel du cabinet. Comment puis-je vous aider ?",
          faqJson: JSON.stringify({ tarifs: "Consultation 30 €, secteur 1", parking: "Parking public à 100 m" }),
          numeroEntrant: "+33900000000",
          actif: true,
        },
      },
    },
    include: { agent: true },
  });

  await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      nom: "Dupont",
      prenom: "Marie",
      telephone: "+33612345678",
      motif: "Renouvellement d'ordonnance",
      dateHeure: "2026-07-21 14:30",
      praticien: "Dr Sophie Martin",
      nouveauOuExistant: "existant",
    },
  });

  await prisma.call.create({
    data: {
      tenantId: tenant.id,
      fromNumber: "+33612345678",
      outcome: "rdv_pris",
      endedAt: new Date(),
      durationSec: 92,
      summary: "Prise de RDV — renouvellement d'ordonnance, mardi 14h30.",
      transcriptJson: JSON.stringify([
        { role: "agent", text: "Cabinet du Dr Martin, bonjour ! Comment puis-je vous aider ?" },
        { role: "caller", text: "Bonjour, je voudrais un rendez-vous." },
        { role: "agent", text: "Avec plaisir. Puis-je avoir votre nom ?" },
      ]),
    },
  });

  console.log("✅ Données de démonstration créées.");
  console.log("   Connexion : demo@cabinet.fr / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
