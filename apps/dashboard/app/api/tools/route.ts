// POST /api/tools — le moteur vocal appelle cet endpoint pour exécuter un tool.
// C'est ici que la secrétaire IA agit réellement : créer un RDV, notifier, etc.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

      case "take_message":
      case "send_notification":
      case "send_confirmation": {
        // TODO production : envoyer un vrai email/SMS (Twilio, Brevo...).
        console.log(`[tools] ${name}`, args);
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
