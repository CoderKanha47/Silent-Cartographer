# Stage 1: Install dependencies globally and inside the workspace
FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Run clean install handles dependencies for the workspace
RUN npm ci --legacy-peer-deps

# Stage 2: Build the production application
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

# Set environment to production and disable Next.js telemetry collection
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run the production build command inside the web app sub-folder
RUN npm run build --workspace=apps/web

# Stage 3: Minimalist production runner stage to save resource usage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a secure non-root system user for production safety
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy over only the compiled build files needed to run the app
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json

USER nextjs

# Set work directory directly to the web app workspace for runtime execution
WORKDIR /app/apps/web

# Dynamically listen to the port injected by Render/Koyeb
EXPOSE 3000
ENV PORT=3000

#start
CMD ["npm", "start", "--", "-p", "${PORT:-3000}"]