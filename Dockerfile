FROM node:22-slim AS base

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

# Migra o banco e, se SEED_ADMIN_PASSWORD estiver definido, garante o superadmin
# (idempotente: não altera um admin que já existe).
CMD ["sh", "-c", "npx prisma migrate deploy && if [ -n \"$SEED_ADMIN_PASSWORD\" ]; then node prisma/seed.mjs; fi && npm run start"]
