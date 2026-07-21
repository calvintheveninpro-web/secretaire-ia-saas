// POST /api/tools — le moteur vocal appelle cet endpoint pour exécuter un tool.
// C'est ici que la secrétaire IA agit réellement : créer un RDV, notifier, etc.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { upsertClientFromBooking } from "@/lib/clients";
import { adverseEstClient, appelantEstAdverse } from "@/lib/conflicts";
import { sendSms, recordAlert } from "@/lib/sms";

export async function POST(req: Request) {
  const { tenantId, tool } = await req.json();
  const name: string = tool?.name;
  const args = tool?.args ?? {};

  try {
    switch (name) {
      case "check_availability": {
        // TODO production : lire les vraies disponibilités (Google Calendar / logiciel métier).
        return ok({ creneaux: nextSlots() });
      }

      case "book_appointment": {
        const rdv = await prisma.appointment.create({
          data: {
            tenantId,
            nom: str(args.nom),
            prenom: str(args.prenom),
            telephone: str(args.telephone),
            email: args.email ? str(args.email) : null,
            motif: str(args.motif) || "Non précisé",
            dateHeure: str(args.date_heure),
            dureeMin: Number(args.duree_min ?? 30),
            praticien: args.praticien ? str(args.praticien) : null,
            nouveauOuExistant: args.nouveau_ou_existant ? str(args.nouveau_ou_existant) : null,
            statut: "confirme",
          },
        });
        // La fiche client est créée ou complétée automatiquement à chaque prise de RDV.
        await upsertClientFromBooking(tenantId, {
          nom: str(args.nom),
          prenom: str(args.prenom),
          telephone: str(args.telephone),
          email: args.email ? str(args.email) : null,
        });
        // Le prospect qualifié pendant l'appel passe au statut « RDV pris ».
        await prisma.intake.updateMany({
          where: { tenantId, telephone: str(args.telephone), statut: "nouveau" },
          data: { statut: "rdv_pris" },
        });

        // Confirmation SMS immédiate, avec lien de paiement si la consultation est payante.
        const agent = await prisma.agent.findUnique({ where: { tenantId } });
        const telephone = str(args.telephone);
        if (telephone) {
          let contenu = `${agent?.nomCabinet ?? "Votre cabinet"} : votre rendez-vous du ${str(args.date_heure)} est confirmé. Répondez ANNULER pour annuler.`;
          let paiement = false;
          if (agent?.consultationPayante && agent.lienPaiement) {
            contenu = `${agent.nomCabinet} : votre rendez-vous du ${str(args.date_heure)} est réservé. Il sera confirmé après règlement de la consultation${agent.montantConsultationEur ? ` (${agent.montantConsultationEur} €)` : ""} : ${agent.lienPaiement}`;
            paiement = true;
          }
          await sendSms(tenantId, telephone, contenu, paiement ? "paiement" : "confirmation");
        }
        // TODO production : pousser aussi l'événement dans Google Calendar ici.
        return ok({ rdvId: rdv.id, confirme: true });
      }

      case "cancel_appointment": {
        await prisma.appointment.updateMany({
          where: { tenantId, telephone: str(args.telephone), statut: "confirme" },
          data: { statut: "annule" },
        });
        return ok({ annule: true });
      }

      case "reschedule_appointment": {
        await prisma.appointment.updateMany({
          where: { tenantId, telephone: str(args.telephone), statut: "confirme" },
          data: { dateHeure: str(args.nouvelle_date_heure), statut: "reporte" },
        });
        return ok({ reporte: true });
      }

      case "check_conflict": {
        // Détection de conflits d'intérêts : la réponse ne contient jamais la raison,
        // seulement un booléen — le secret professionnel s'applique aussi à l'IA.
        const conflit = await adverseEstClient(tenantId, str(args.nom_partie_adverse));
        if (conflit) {
          await recordAlert(
            tenantId,
            `Conflit d'intérêts détecté pendant un appel : la partie adverse citée (« ${str(args.nom_partie_adverse)} ») correspond à un client du cabinet. Le rendez-vous n'a pas été pris.`,
          );
        }
        return ok({ conflit });
      }

      case "save_intake": {
        const nomComplet = `${str(args.prenom)} ${str(args.nom)}`.trim();
        const conflitAdverse = await adverseEstClient(tenantId, str(args.partie_adverse));
        const conflitAppelant = await appelantEstAdverse(tenantId, nomComplet);
        const conflit = conflitAdverse || conflitAppelant;
        const potentiel = ["fort", "standard", "hors_perimetre"].includes(str(args.potentiel))
          ? str(args.potentiel)
          : "standard";
        const intake = await prisma.intake.create({
          data: {
            tenantId,
            nom: args.nom ? str(args.nom) : null,
            prenom: args.prenom ? str(args.prenom) : null,
            telephone: str(args.telephone),
            domaineDroit: args.domaine_droit ? str(args.domaine_droit) : null,
            partieAdverse: args.partie_adverse ? str(args.partie_adverse) : null,
            juridiction: args.juridiction ? str(args.juridiction) : null,
            echeance: args.echeance ? str(args.echeance) : null,
            resume: args.resume ? str(args.resume) : null,
            potentiel,
            conflitDetecte: conflit,
          },
        });
        if (potentiel === "fort") {
          await recordAlert(
            tenantId,
            `Prospect à fort potentiel : ${nomComplet || str(args.telephone)} — ${str(args.domaine_droit) || "domaine non précisé"}${args.echeance ? `, échéance : ${str(args.echeance)}` : ""}.`,
          );
        }
        return ok({ intakeId: intake.id, conflit });
      }

      case "send_confirmation": {
        const telephone = str(args.telephone);
        if (telephone) {
          const agent = await prisma.agent.findUnique({ where: { tenantId } });
          const details = str(args.details_rdv);
          await sendSms(
            tenantId,
            telephone,
            `${agent?.nomCabinet ?? "Votre cabinet"} : ${details || "votre demande a bien été prise en compte."}`,
            "confirmation",
          );
        }
        return ok({ envoye: true });
      }

      case "take_message":
      case "send_notification": {
        // L'alerte est journalisée pour le cabinet (onglet Messages du tableau de bord).
        const contenu =
          str(args.message) || str(args.resume_appel) || "Message pris pendant un appel.";
        await recordAlert(tenantId, contenu, str(args.nom) || str(args.destinataire) || "cabinet");
        return ok({ envoye: true });
      }

      default:
        return ok({});
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

function ok(data: unknown) {
  return NextResponse.json({ ok: true, data });
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

/** Génère 3 créneaux de démonstration dans les prochains jours ouvrés. */
function nextSlots(): string[] {
  const out: string[] = [];
  const times = ["09:30", "14:30", "16:00"];
  const d = new Date();
  let added = 0;
  for (let i = 1; added < 3 && i < 10; i++) {
    const day = new Date(d.getTime() + i * 86400000);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue; // week-end
    out.push(`${day.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à ${times[added]}`);
    added++;
  }
  return out;
}
