# Imagem de produção do Programa Formar (AWS Lightsail Containers).
# Build:  docker build -t programa-formar .
# Roda o servidor Next.js "standalone" como usuário sem privilégios, na porta 3000.

# ---------- 1) Dependências ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- 2) Build ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_DEPLOYMENT_ID
ENV NEXT_DEPLOYMENT_ID=$NEXT_DEPLOYMENT_ID
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- 3) Execução ----------
FROM node:22-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 app && useradd --system --uid 1001 --gid app app

COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
# Fontes usadas na geração dos PDFs.
COPY --from=build --chown=app:app /app/assets ./assets

USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/saude').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
