// Types partagés entre le moteur vocal et le tableau de bord.

export type Metier = "medecin" | "chirurgien" | "avocat" | "entrepreneur";

/**
 * Configuration d'un agent (une secrétaire IA) pour un cabinet donné.
 * C'est l'équivalent structuré du bloc "variables_client" du prompt JSON.
 */
export interface AgentConfig {
  id: string;
  tenantId: string;
  nomCabinet: string;
  metier: Metier;
  nomProfessionnel: string;
  specialite?: string;
  adresse?: string;
  horairesOuverture: string;
  dureeRdvParDefautMin: number;
  delaiMinAvantRdvHeures: number;
  numeroTransfertHumain?: string;
  emailNotification?: string;
  langue: string;
  phraseAccueil: string;
  faqCabinet?: Record<string, string>;
  /** Numéro de téléphone Twilio qui route les appels vers cet agent. */
  numeroEntrant?: string;
  actif: boolean;
  /** Avocats : domaines de droit pratiqués par le cabinet (séparés par des virgules). */
  domainesDroit?: string;
  /** Envoyer un lien de paiement à la prise de rendez-vous (première consultation payante). */
  consultationPayante?: boolean;
  montantConsultationEur?: number;
  lienPaiement?: string;
}

export type ToolName =
  | "check_availability"
  | "book_appointment"
  | "cancel_appointment"
  | "reschedule_appointment"
  | "transfer_call"
  | "take_message"
  | "send_notification"
  | "send_confirmation"
  | "check_conflict"
  | "save_intake"
  | "end_call";

export interface ToolCall {
  name: ToolName;
  args: Record<string, unknown>;
}

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface Appointment {
  id: string;
  tenantId: string;
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  motif: string;
  dateHeure: string; // ISO 8601
  dureeMin: number;
  praticien?: string;
  nouveauOuExistant?: "nouveau" | "existant";
  statut: "confirme" | "annule" | "reporte";
  createdAt: string;
}

export interface CallRecord {
  id: string;
  tenantId: string;
  fromNumber: string;
  startedAt: string;
  endedAt?: string;
  durationSec?: number;
  outcome: "rdv_pris" | "transfere" | "message" | "info" | "abandonne";
  transcript: TranscriptTurn[];
  summary?: string;
}

export interface TranscriptTurn {
  role: "caller" | "agent";
  text: string;
  at: string;
}

export interface Tenant {
  id: string;
  nom: string;
  email: string;
  plan: "trial" | "actif" | "suspendu";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: string;
}
