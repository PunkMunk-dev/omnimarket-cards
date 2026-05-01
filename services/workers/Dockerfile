FROM node:20-slim

WORKDIR /app

# Copy manifests first for better layer caching.
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY services/workers/package.json ./services/workers/package.json

RUN npm install

# Copy source files and build worker artifacts.
COPY packages ./packages
COPY services ./services
COPY tsconfig*.json ./

RUN npm run build:shared && npm run build:worker

ENV NODE_ENV=production

CMD ["npm", "run", "worker:start"]
