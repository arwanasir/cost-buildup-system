FROM node:20-alpine AS base
ENV NPM_HOME = "/npm"
ENV PATH = "$NPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

RUN npm install --frozen-lockfile || npm install

FROM base AS dev
WORKDIR /app

COPY --from=deps /app/node_modules   ./node_modules
COPY . .
EXPOSE 3000
CMD [ "npm","run","start:dev" ]


FROM base AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

RUN npm prune --prod

FROM node:20-alpine AS prod
WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/src/main.js"]