FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["pnpm", "run", "start:dev"]

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build
RUN pnpm prune --prod

FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
