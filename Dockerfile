# ---- stage 1: build the Vue app -------------------------------------------------------------
FROM node:20-slim AS frontend

WORKDIR /build

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
# Reads .env.production, so VITE_API_BASE_URL becomes the relative /api used below.
RUN npm run build

# ---- stage 2: runtime ------------------------------------------------------------------------
FROM node:20-slim

# Prisma's query engine needs OpenSSL at runtime; the slim image does not ship it.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json* ./
# `prisma` is a runtime dependency here, not a dev one: the container runs `prisma migrate deploy`
# on every boot. Left in devDependencies it would be stripped by --omit=dev, and the entrypoint
# would try to fetch the CLI from npm inside the running container — a network call on every start
# that fails outright if npm is unreachable.
RUN npm install --omit=dev

COPY backend/prisma ./prisma
# Generate against the schema before the source is copied, so a code-only change can reuse this layer.
RUN npx prisma generate

COPY backend/src ./src
COPY backend/scripts ./scripts
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# app.js resolves the built frontend at ../../frontend/dist relative to backend/src, so the
# two-directory layout has to survive into the image.
COPY --from=frontend /build/dist /app/frontend/dist

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["/app/docker-entrypoint.sh"]
