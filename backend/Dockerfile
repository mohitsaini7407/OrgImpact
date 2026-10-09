FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json prisma.config.ts tsconfig.json ./
COPY prisma ./prisma

# Prisma client generation reads this URL during image build but does not connect to it.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/orgimpact

RUN mkdir -p src && npm ci
COPY src ./src
RUN npx prisma generate && npm run build
RUN npm prune --omit=dev --ignore-scripts

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 10000
CMD ["npm", "start"]
