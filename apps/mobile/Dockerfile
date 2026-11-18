# 构建上下文为仓库根目录：docker build -f apps/mobile/Dockerfile .
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/mobile/package.json apps/mobile/
RUN pnpm install --frozen-lockfile --filter @moments/mobile...
COPY packages/shared packages/shared
COPY apps/mobile apps/mobile
RUN pnpm --filter @moments/mobile build

FROM nginx:1.27-alpine
COPY apps/mobile/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/mobile/dist /usr/share/nginx/html
EXPOSE 80
