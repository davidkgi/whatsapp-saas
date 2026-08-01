# syntax=docker/dockerfile:1
# ──────────────────────────────────────────────────────────────────────────────
# Next.js 16 (standalone) — self-host on a VPS via Easypanel/Docker/Traefik.
# Replaces the Vercel deploy. Build once, run with `node server.js`.
#
# IMPORTANT — NEXT_PUBLIC_* vars are inlined into the client bundle at BUILD time,
# so they must be passed as build args (Easypanel: App → Build → Args), not only
# as runtime env. Everything else (service_role, secrets, OpenAI/OpenRouter,
# CRON_SECRET, ENCRYPTION_KEY…) is read at runtime — set those as runtime env.
# ──────────────────────────────────────────────────────────────────────────────

# ---- deps ---------------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Public (client-side) vars required at build time. Pass with:
#   --build-arg NEXT_PUBLIC_SUPABASE_URL=... etc.  (or Easypanel build args)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npm run build

# ---- runner -------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone output already contains a minimal node_modules + server.js.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
