# ============================================================
#  Moteur vocal — Secrétaire IA
#  Image pour Railway / Fly.io / Render / VPS (tient les WebSockets longs).
#  Le dashboard Next.js, lui, se déploie sur Vercel (pas ce Dockerfile).
# ============================================================
FROM node:20-slim

WORKDIR /app

# Monorepo npm workspaces : on copie tout le dépôt puis on installe.
COPY . .
RUN npm install --no-audit --no-fund

# Railway/Fly fournissent PORT automatiquement ; le serveur le lit en priorité.
ENV NODE_ENV=production
EXPOSE 8080

# Démarre le moteur vocal (webhook /voice + WebSocket /media, endpoint /health).
CMD ["npm", "--workspace", "@secretaire-ia/voice-server", "run", "start"]
