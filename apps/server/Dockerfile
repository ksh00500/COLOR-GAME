FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/game-core/package.json packages/game-core/package.json
RUN pnpm install --frozen-lockfile --filter @color-game/server...

FROM deps AS build
COPY apps/server apps/server
COPY packages/shared-types packages/shared-types
COPY packages/game-core packages/game-core
RUN pnpm --filter @color-game/server build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
COPY --from=build /app ./
EXPOSE 8080
CMD ["pnpm", "--filter", "@color-game/server", "start"]

