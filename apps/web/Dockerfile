FROM node:22-alpine
WORKDIR /app

# Copy global and workspace lock maps from the build context
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Execute a clean monorepo structural installation pass
RUN npm install --legacy-peer-deps

# Shift focus inside the web app workspace directory
WORKDIR /app/apps/web

EXPOSE 3000

# Fire up Next.js dev server locally
CMD ["npm", "run", "dev"]