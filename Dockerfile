FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG SITE_URL
ARG PUBLIC_INDEXABLE=false
ENV SITE_URL=$SITE_URL PUBLIC_INDEXABLE=$PUBLIC_INDEXABLE
RUN npm run build
ENV NODE_ENV=production DATA_DIR=/data/apex ADMIN_ACCESS_FILE=/data/owner-access.md ALLOW_OPAQUE_ORIGIN=false
EXPOSE 5300
CMD ["node", "server/index.mjs"]
