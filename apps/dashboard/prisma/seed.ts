// Jeu de données de démonstration : un cabinet, un agent, des clients, des appels et des RDV.
// Lancement : npm run db:setup

import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Date décalée de n mois dans le passé (pour alimenter les statistiques mensuelles). */
function ilYaDesMois(mois: number, jour = 10): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - mois, jour, 10, 30);
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
          specialite: "Médecine générale, Nutrition",
          adresse: "12 rue de la Paix, 75002 Paris",
          horairesOuverture: "Du lundi au vendredi, de 9h à 19h",
          numeroTransfertHumain: "+33100000000",
          emailNotification: "cabinet@exemple.fr",
          phraseAccueil:
            "Cabinet du Dr Martin, bonjour ! Je suis l'assistant virtuel du cabinet. Comment puis-je vous aider ?",
          faqJson: JSON.stringify({ tarifs: "Consultation 30 €, secteur 1", parking: "Parking public à 100 m" }),
          numeroEntrant: "+33900000000",
          actif: true,
          connecteursJson: JSON.stringify({
            google_calendar: { actif: true, config: "cabinet@gmail.com", connecteLe: new Date().toISOString() },
          }),
        },
      },
    },
    include: { agent: true },
  });

  const dejaSeede = await prisma.appointment.count({ where: { tenantId: tenant.id } });
  if (dejaSeede > 0) {
    console.log("Données de démonstration déjà présentes, rien à faire.");
    console.log("Connexion : demo@cabinet.fr / demo1234");
    return;
  }

  const personnes = [
    { nom: "Dupont", prenom: "Marie", telephone: "+33612345678", email: "marie.dupont@exemple.fr" },
    { nom: "Bernard", prenom: "Paul", telephone: "+33623456789", email: null },
    { nom: "Nguyen", prenom: "Linh", telephone: "+33634567890", email: "linh.nguyen@exemple.fr" },
    { nom: "Rossi", prenom: "Carla", telephone: "+33645678901", email: null },
  ];
  const motifs = [
    "Renouvellement d'ordonnance",
    "Consultation de suivi",
    "Bilan nutrition",
    "Première consultation",
    "Résultats d'analyses",
  ];

  // Des rendez-vous répartis sur les 12 derniers mois pour alimenter le tableau de bord.
  let compteur = 0;
  for (let mois = 11; mois >= 0; mois--) {
    const nb = 1 + ((11 - mois) % 3); // volume croissant vers le mois courant
    for (let i = 0; i < nb; i++) {
      const p = personnes[compteur % personnes.length];
      const creation = ilYaDesMois(mois, 5 + i * 7);
      await prisma.appointment.create({
        data: {
          tenantId: tenant.id,
          nom: p.nom,
          prenom: p.prenom,
          telephone: p.telephone,
          email: p.email,
          motif: motifs[compteur % motifs.length],
          dateHeure: `${creation.getFullYear()}-${String(creation.getMonth() + 1).padStart(2, "0")}-${String(creation.getDate()).padStart(2, "0")} 14:30`,
          praticien: "Dr Sophie Martin",
          nouveauOuExistant: compteur % 3 === 0 ? "nouveau" : "existant",
          statut: compteur % 7 === 0 ? "annule" : "confirme",
          createdAt: creation,
        },
      });
      compteur++;
    }
  }

  // Les fiches clients correspondantes (générées automatiquement en production).
  for (const p of personnes) {
    await prisma.client.upsert({
      where: { tenantId_telephone: { tenantId: tenant.id, telephone: p.telephone } },
      update: {},
      create: {
        tenantId: tenant.id,
        nom: p.nom,
        prenom: p.prenom,
        telephone: p.telephone,
        email: p.email,
        notes: p.nom === "Dupont" ? "Préfère les rendez-vous en début d'après-midi." : "",
      },
    });
  }

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
  await prisma.call.create({
    data: {
      tenantId: tenant.id,
      fromNumber: "+33623456789",
      outcome: "info",
      endedAt: new Date(),
      durationSec: 41,
      summary: "Demande d'information sur les horaires d'ouverture.",
      transcriptJson: "[]",
    },
  });

  console.log("Données de démonstration créées.");
  console.log("Connexion : demo@cabinet.fr / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
