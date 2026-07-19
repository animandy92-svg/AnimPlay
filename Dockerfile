FROM node:20-alpine AS builder
WORKDIR /app

# Install server dependencies
COPY server/package*.json server/
RUN cd server && npm ci

# Install client dependencies
COPY client/package*.json client/
RUN cd client && npm ci

# Build
COPY server/ server/
COPY client/ client/
COPY shared/ shared/
RUN cd server && npm run build
RUN cd client && npm run build

# Production image
FROM node:20-alpine
WORKDIR /app

# Copy server build and production deps
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/package*.json ./
RUN npm ci --only=production

# Copy client build
COPY --from=builder /app/client/dist ./public

EXPOSE 3001
CMD ["node", "dist/index.js"]
