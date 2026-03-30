# ── Stage 1: Build React client ──────────────────────────────────────────────
FROM node:20-alpine AS client-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: Production server ───────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy server source
COPY server/ ./server/

# Copy built client from stage 1
COPY --from=client-builder /app/client/dist ./client/dist

# Persist SQLite database via volume
VOLUME ["/app/server/data"]

ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001

CMD ["node", "server/index.js"]
