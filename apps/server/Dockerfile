# 构建上下文为仓库根目录：docker build -f apps/server/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /repo

FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
RUN pnpm install --frozen-lockfile --filter @moments/server...
COPY packages/shared packages/shared
COPY apps/server apps/server
RUN pnpm --filter @moments/shared build \
 && pnpm --filter @moments/server exec prisma generate \
 && pnpm --filter @moments/server build \
 && pnpm deploy --filter @moments/server --prod --legacy /out \
 && cp -r apps/server/dist apps/server/prisma /out/ \
 && cd /out && npx prisma generate

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /out ./
RUN mkdir -p /app/uploads && chown app:app /app/uploads
USER app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/api/v1/health/live || exit 1
# 启动前执行数据库迁移（幂等）
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
