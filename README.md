# Secrétaire IA — Plateforme SaaS (v0.1)

Secrétaire IA vocale pour cabinets et entreprises : elle décroche le téléphone, qualifie l'appel,
prend / annule / déplace les rendez-vous, répond aux questions pratiques et transfère à un humain
en cas d'urgence. Livré comme un **SaaS multi-cabinets** que tu héberges, modifies et revends.

> **Statut : v0.1 — socle fonctionnel.** Le moteur vocal, le tableau de bord, le modèle de données,
> les tools et Stripe sont en place et cohérents. Certaines briques de production (vraie intégration
> calendrier, envoi SMS/email réel, robustesse temps-réel) sont balisées `TODO production` dans le code.
> C'est une base solide sur laquelle construire, pas encore un produit fini prêt pour 1 000 cabinets.

---

## 🎬 Voir la secrétaire IA en action (30 secondes, zéro installation)

Aucune clé, aucune dépendance requise :

```bash
node demo/simulate-call.mjs            # scénario médecin — prise de RDV
node demo/simulate-call.mjs medecin urgence   # scénario urgence — transfert + message 15/112
node demo/simulate-call.mjs avocat     # variante avocat
```

Tu verras une conversation téléphonique complète se dérouler, avec l'exécution des *tools*
(vérifier les dispos, réserver, confirmer, transférer). C'est la boucle réelle du moteur, en version
« mock » scriptée — parfaite pour comprendre le produit et le **montrer à un prospect**.

---

## 🧠 Vérité d'ingénieur : ce que « 100 % maison » veut dire

Personne ne construit son propre réseau téléphonique — même Retell et Vapi s'appuient sur un opérateur.
Ta plateforme repose donc sur **Twilio** pour la ligne (l'opérateur). En revanche, **tout ce qui est
au-dessus t'appartient** : l'orchestration vocale, le choix de la reconnaissance vocale et de la voix,
la logique IA, les données, le tableau de bord, la facturation. C'est ça, posséder sa stack — et c'est
ce qui te permet de la revendre.

```
   Appelant  ──📞──►  Twilio (opérateur)  ──webhook──►  VOICE-SERVER (à toi)
                                                          │
                    ┌─────────────────────────────────────┼───────────────────────────┐
                    ▼                     ▼                ▼                            ▼
              Reconnaissance         Cerveau (LLM)     Synthèse vocale            Tools (RDV, notifs)
              vocale (STT)           + prompt métier   (TTS)                       │
              Deepgram / mock        OpenAI / mock     ElevenLabs / mock           ▼
                                                                            DASHBOARD (Next.js)
                                                                            Prisma · Stripe · multi-cabinets
```

Chaque brique (STT, LLM, TTS) est un **adaptateur interchangeable** (`apps/voice-server/src/providers/`).
Tu peux passer de Deepgram à Whisper, d'OpenAI à un modèle open-source, d'ElevenLabs à une autre voix,
sans toucher au reste.

---

## 🏗️ Architecture du dépôt

```
secretaire-ia-saas/
├── prompt/secretaire-ia-prompt.json   ← le "cerveau" : prompt système + variantes métier + tools
├── marketing/                         ← page vitrine (landing) + logo — statique, zéro dépendance
├── demo/simulate-call.mjs             ← démo hors-ligne (aucune dépendance)
├── packages/shared/                   ← types + constructeur de prompt (partagés)
├── apps/
│   ├── voice-server/                  ← MOTEUR VOCAL maison (Twilio Media Streams + STT/LLM/TTS)
│   │   └── src/
│   │       ├── index.ts               ← webhook Twilio + serveur WebSocket audio
│   │       ├── session.ts             ← orchestration d'un appel (la boucle STT→LLM→TTS→tools)
│   │       ├── dashboard-api.ts       ← pont vers le dashboard (résout l'agent, exécute les tools)
│   │       └── providers/             ← stt.ts · llm.ts · tts.ts · telephony.ts (réel + mock)
│   └── dashboard/                     ← SaaS Next.js (multi-cabinets)
│       ├── prisma/schema.prisma       ← modèle de données multi-tenant
│       ├── app/                       ← pages (agent, appels, RDV, facturation) + API routes
│       └── lib/                       ← db · auth · stripe
└── .env.example                       ← toutes les variables (tout marche en mode "mock")
```

---

## 🚀 Lancer en local (mode démo, sans clé)

Prérequis : Node.js ≥ 18.17.

```bash
# 1. Dépendances
npm install

# 2. Base de données + jeu d'exemple (PostgreSQL — ex. base gratuite Neon)
#    Mets ton URL Postgres dans .env (DATABASE_URL), puis :
npm run db:setup           # crée les tables + un cabinet de démo
#    (Astuce : pour un essai 100% local sans Postgres, repasse provider = "sqlite"
#     dans apps/dashboard/prisma/schema.prisma et DATABASE_URL="file:./dev.db".)

# 3a. Tableau de bord  →  http://localhost:3000   (connexion : demo@cabinet.fr / demo1234)
npm run dev:dashboard

# 3b. Moteur vocal (dans un autre terminal)
npm run dev:voice          # écoute sur http://localhost:8080
```

En mode `PROVIDER_MODE=mock` (défaut), tout fonctionne sans Twilio ni clé d'API : idéal pour
développer l'interface et la logique.

---

## 🌐 Déployer en ligne

Guide pas-à-pas (Neon Postgres + Vercel pour le dashboard + Railway pour le moteur vocal) :
**voir [`DEPLOYMENT.md`](./DEPLOYMENT.md)**.

---

## 🔌 Passer en production (mode `real`)

1. **Copie `.env.example` → `.env`** et mets `PROVIDER_MODE=real`.
2. **Twilio** (opérateur téléphonique) : crée un compte, achète un numéro +33, et configure le
   webhook *Voice* du numéro vers `https://<ton-domaine>/voice` (POST). Renseigne `TWILIO_*`.
   Expose ton moteur local avec un tunnel (`ngrok http 8080`) et mets l'URL WSS dans `PUBLIC_WS_URL`.
3. **Reconnaissance vocale** : clé `DEEPGRAM_API_KEY` (streaming fr-FR).
4. **Cerveau** : `OPENAI_API_KEY` (ou branche un autre LLM dans `providers/llm.ts`).
5. **Voix** : `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` (voix française).
6. **Paiement** : `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, et configure le webhook Stripe vers
   `/api/stripe/webhook` (`STRIPE_WEBHOOK_SECRET`).
7. **Base de données** : passe `schema.prisma` en `postgresql` et mets `DATABASE_URL` sur ton Postgres.
8. **Déploiement** : le dashboard se déploie bien sur Vercel ; le moteur vocal a besoin d'un hébergeur
   qui tient les WebSockets longs (Railway, Fly.io, Render, un VPS…).

### Le point calendrier (Doctolib)
Doctolib n'a **pas d'API publique ouverte**. Dans `app/api/tools/route.ts`, la création de RDV écrit
dans ta base ; branche là ta vraie stratégie (Google Calendar via son API, logiciel métier, ou
validation humaine). Voir le tutoriel du projet pour les 3 stratégies.

---

## 🧩 Les *tools* de l'agent (là où l'IA agit)

Définis dans `prompt/secretaire-ia-prompt.json`, exécutés par `app/api/tools/route.ts` :

| Tool | Rôle |
|---|---|
| `check_availability` | Propose des créneaux (à brancher sur le vrai agenda) |
| `book_appointment` | Crée le RDV en base |
| `cancel_appointment` / `reschedule_appointment` | Annule / déplace (après vérif. d'identité) |
| `transfer_call` | Transfère l'appel à un humain (Twilio) |
| `take_message` / `send_notification` | Message + alerte au cabinet |
| `send_confirmation` | SMS/email de confirmation à l'appelant |
| `end_call` | Raccroche proprement |

---

## 💰 Le modèle pour vendre

- **SaaS par abonnement** : offre unique tout compris à 279,99 €/mois, page facturation Stripe déjà intégrée.
- **Onboarding rapide** : chaque cabinet remplit sa fiche dans « Mon agent » — le prompt s'adapte
  automatiquement à son métier (médecin, chirurgien, avocat, entrepreneur).
- **Argument de vente** : ne rate plus aucun appel, disponible 24/7, conforme AI Act (l'agent
  s'annonce comme assistant virtuel). La démo `simulate-call.mjs` est ton meilleur argument.

---

## ⚖️ Conformité (à cadrer avant de commercialiser)

- **RGPD** : information de l'appelant, base légale, minimisation, durée de conservation.
- **AI Act (art. 50, applicable au 2 août 2026)** : transparence — l'agent doit indiquer que c'est une IA
  (déjà intégré au prompt et aux phrases d'accueil).
- **Données de santé** (médecins/chirurgiens) : hébergement **HDS** recommandé, collecte minimale.
- Fais valider tes mentions et contrats par un juriste. Ce code ne constitue pas un conseil juridique.

---

## 🗺️ Ce qui reste à faire (prochaines itérations)

- Intégration calendrier réelle (Google Calendar / Cal.com) dans `check_availability` + `book_appointment`.
- Envoi SMS/email réel (Twilio, Brevo) pour `send_confirmation` / `send_notification`.
- Streaming TTS phrase-par-phrase + gestion fine des interruptions (barge-in) pour un rendu plus naturel.
- Résumé d'appel automatique (LLM) et scoring des leads.
- Rôles/équipe, multi-praticiens, facturation à l'usage (minutes).

Bon build — et bonnes ventes. 🚀
