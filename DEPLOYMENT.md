# Déploiement en ligne — Secrétaire IA

Ce guide met la plateforme en ligne en **3 services** :

| Service | Rôle | Hébergeur conseillé | Pourquoi |
|---|---|---|---|
| **Base de données** | Postgres multi-cabinets | **Neon** (neon.tech) | Gratuit, serverless, prêt en 1 min |
| **Dashboard** (`apps/dashboard`) | SaaS Next.js (agent, appels, RDV, facturation) | **Vercel** | Déploiement Git natif pour Next.js |
| **Moteur vocal** (`apps/voice-server`) | Webhook Twilio + WebSocket audio temps réel | **Railway** (ou Fly.io / Render) | Tient les WebSockets longs (Vercel ne le fait pas) |

> Tu peux déployer **d'abord en mode `mock`** (sans aucune clé Twilio/IA) pour voir le dashboard et le moteur en ligne, puis passer en `real` quand tu veux prendre de vrais appels. L'ordre ci-dessous fait exactement ça.

---

## Étape 1 — Base de données Postgres (Neon)

1. Crée un compte sur **https://neon.tech** → **New Project**.
2. Copie l'**URL de connexion** (« Connection string »), du type :
   `postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`
3. Garde-la de côté : c'est ta variable `DATABASE_URL`.

**Créer les tables + un cabinet de démo** (à lancer une fois, depuis ton ordinateur, dans le dépôt cloné) :

```bash
DATABASE_URL="postgresql://...neon...?sslmode=require" \
  npm --workspace @secretaire-ia/dashboard run db:setup
```

Ça crée le schéma et le compte de démo `demo@cabinet.fr` / `demo1234`.

---

## Étape 2 — Dashboard sur Vercel

1. Va sur **https://vercel.com** → **Add New… → Project** → importe le dépôt GitHub `secretaire-ia-saas`.
2. **Root Directory** : `apps/dashboard` (bouton *Edit* à côté de Root Directory).
   Vercel détecte Next.js et le monorepo automatiquement ; laisse *Build Command* et *Output* par défaut (le build lance `prisma generate && next build`).
3. **Environment Variables** (onglet *Environment Variables*) :

   | Variable | Valeur |
   |---|---|
   | `DATABASE_URL` | l'URL Neon de l'étape 1 |
   | `AUTH_SECRET` | une longue chaîne aléatoire (ex. `openssl rand -hex 32`) |
   | `NEXT_PUBLIC_APP_URL` | l'URL finale du site (ex. `https://secretaire-ia-saas.vercel.app`) |

   *(Stripe est optionnel au début ; ajoute `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` quand tu actives la facturation.)*
4. **Deploy**. Tu obtiens une URL `https://...vercel.app` : c'est ton tableau de bord en ligne. Connecte-toi avec `demo@cabinet.fr` / `demo1234`.

---

## Étape 3 — Moteur vocal sur Railway

1. Va sur **https://railway.app** → **New Project → Deploy from GitHub repo** → choisis `secretaire-ia-saas`.
2. Railway détecte le **`Dockerfile`** à la racine et construit le moteur vocal automatiquement.
3. **Variables** (onglet *Variables*) :

   | Variable | Valeur (démarrage en mock) |
   |---|---|
   | `PROVIDER_MODE` | `mock` |
   | `DASHBOARD_API_URL` | l'URL Vercel de l'étape 2 |
   | `PUBLIC_WS_URL` | `wss://<ton-domaine-railway>/media` (voir point 4) |

   *(`PORT` est fourni automatiquement par Railway — le serveur l'utilise.)*
4. **Générer un domaine** : onglet *Settings → Networking → Generate Domain*. Tu obtiens `xxxx.up.railway.app`.
   Reviens mettre `PUBLIC_WS_URL = wss://xxxx.up.railway.app/media`, puis **redeploy**.
5. Vérifie : ouvre `https://xxxx.up.railway.app/health` → doit afficher `ok`.

À ce stade, dashboard + moteur vocal sont **en ligne**. Il reste à brancher la téléphonie pour de vrais appels.

---

## Étape 4 — Passer aux vrais appels (mode `real`)

1. **Twilio** : crée un compte, achète un **numéro +33**. Dans la config *Voice* du numéro, mets le webhook :
   `https://<ton-domaine-railway>/voice` (méthode **POST**).
2. Sur **Railway**, ajoute/complète les variables puis passe `PROVIDER_MODE=real` :

   | Variable | Valeur |
   |---|---|
   | `PROVIDER_MODE` | `real` |
   | `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | depuis Twilio |
   | `DEEPGRAM_API_KEY` | reconnaissance vocale fr-FR (deepgram.com) |
   | `OPENAI_API_KEY` + `LLM_MODEL` (`gpt-4o`) | le cerveau |
   | `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` | la voix française |

3. **Redeploy** Railway. Appelle ton numéro Twilio : l'agent décroche. 🎉

> **Agenda** : par défaut les RDV sont écrits en base. Pour un vrai calendrier, branche Google Calendar dans `apps/dashboard/app/api/tools/route.ts` (voir README). Tu peux démarrer en validation manuelle et automatiser ensuite.

---

## Étape 5 — Facturation Stripe (quand tu vends)

1. Crée un **produit + prix** sur Stripe (ex. 279,99 €/mois) → récupère le `price_id`.
2. Variables côté **Vercel** : `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, puis configure le webhook Stripe vers
   `https://<ton-app>.vercel.app/api/stripe/webhook` et colle `STRIPE_WEBHOOK_SECRET`.

---

## Récapitulatif des variables

**Dashboard (Vercel)** : `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `STRIPE_SECRET_KEY`*, `STRIPE_PRICE_ID`*, `STRIPE_WEBHOOK_SECRET`*
**Moteur vocal (Railway)** : `PROVIDER_MODE`, `DASHBOARD_API_URL`, `PUBLIC_WS_URL`, `TWILIO_*`†, `DEEPGRAM_API_KEY`†, `OPENAI_API_KEY`†, `LLM_MODEL`†, `ELEVENLABS_*`†

\* pour la facturation · † pour le mode `real` (vrais appels)

## Notes

- Le schéma Prisma est en **PostgreSQL**. Pour un test 100% local sans Postgres, tu peux repasser `provider = "sqlite"` et `DATABASE_URL="file:./dev.db"` — mais Vercel exige Postgres.
- Le build de production ignore volontairement les erreurs de typage strict / lint (`next.config.js`, bloc MVP). À réactiver une fois le code durci.
- La **démo d'appel** (`node demo/simulate-call.mjs`) reste utilisable sans rien installer, même sans déploiement.
