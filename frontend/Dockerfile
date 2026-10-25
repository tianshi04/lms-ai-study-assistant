# ====================================================================
# MULTI-STAGE DOCKERFILE FOR NEXT.JS FRONTEND (PNPM & STANDALONE)
# ====================================================================

# --------------------------------------------------------------------
# Stage 1: Base image with pnpm package manager
# --------------------------------------------------------------------
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@9

# --------------------------------------------------------------------
# Stage 2: Install dependencies with caching
# --------------------------------------------------------------------
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependency specifications
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./

# Install dependencies using cached pnpm store
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# --------------------------------------------------------------------
# Stage 3: Build the Next.js standalone application
# --------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ENV=production

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ENV=$NEXT_PUBLIC_ENV

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Compile production standalone build
RUN pnpm run build

# --------------------------------------------------------------------
# Stage 4: Minimal production runtime image (~88MB)
# --------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# 1. Tạo user non-root và thư mục cache với quyền sở hữu chính xác
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p .next/cache && \
    chown -R nextjs:nodejs .next

# 2. Copy assets với quyền sở hữu của user nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# 3. Healthcheck chuẩn native Node.js (dùng fetch có sẵn trong Node 22)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
