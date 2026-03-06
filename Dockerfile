# syntax=docker/dockerfile:1

# --- Build stage ---
FROM node:24-bookworm-slim AS build

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . ./
# Build in `--remote` mode so the SSR server uses ASTRO_DB_REMOTE_URL at runtime.
# IMPORTANT: the DB URL is inlined into the server bundle during build.
# Use the same file: URL that the runtime container will mount as a volume.
RUN mkdir -p /data
ENV ASTRO_DB_REMOTE_URL=file:/data/wryteon.sqlite
RUN npm run build -- --remote

# Prune dev dependencies for smaller runtime image
RUN npm prune --omit=dev


# --- Runtime stage ---
FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Runtime needs app deps + built output + Astro DB config
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/astro.config.mjs ./astro.config.mjs
COPY --from=build /app/db ./db
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

# Create a writable data dir for persistent DB (bind/volume mount recommended)
RUN mkdir -p /data/uploads

COPY docker/start.sh /usr/local/bin/wryteon-start
RUN chmod +x /usr/local/bin/wryteon-start

EXPOSE 4321

CMD ["/usr/local/bin/wryteon-start"]
