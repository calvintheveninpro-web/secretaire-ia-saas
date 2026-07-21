import { prisma } from "@/lib/db";
import { creneauxPourReservation } from "@/lib/booking";
import { BookingForm } from "@/components/BookingForm";

export const dynamic = "force-dynamic";

export default async function ReservationPage({ params }: { params: { token: string } }) {
  const agent = await prisma.agent.findUnique({
    where: { bookingToken: params.token },
    include: { praticiens: true },
  });

  if (!agent || !agent.actif) {
    return (
      <div className="center">
        <div className="card">
          <h1>Page indisponible</h1>
          <p className="muted">Cette page de réservation n'existe pas ou n'est plus active.</p>
        </div>
      </div>
    );
  }

  const creneaux = await creneauxPourReservation(agent);
  const praticiens = agent.praticiens
    .filter((p) => p.actif)
    .map((p) => (p.specialites ? `${p.nom} — ${p.specialites}` : p.nom));

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <h1 style={{ marginTop: 32 }}>{agent.nomCabinet}</h1>
      <p className="muted">
        {agent.nomProfessionnel}
        {agent.specialite ? ` — ${agent.specialite}` : ""}
      </p>
      <p className="muted">
        Réservez votre rendez-vous en ligne : confirmation immédiate par SMS.
        {agent.consultationPayante && agent.montantConsultationEur
          ? ` Première consultation : ${agent.montantConsultationEur} € (lien de paiement envoyé par SMS).`
          : ""}
      </p>

      <BookingForm token={params.token} creneaux={creneaux} praticiens={praticiens} />

      <p className="muted" style={{ fontSize: 12, marginTop: 24 }}>
        {agent.adresse ? `${agent.adresse} · ` : ""}
        {agent.horairesOuverture}. Vos informations sont utilisées uniquement pour la gestion de
        votre rendez-vous (RGPD).
      </p>
    </div>
  );
}
