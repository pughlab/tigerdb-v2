FROM node:22-alpine

WORKDIR /app

RUN corepack enable pnpm

COPY pnpm-workspace.yaml pnpm-lock.yaml ./

COPY ui/package.json ./ui/
RUN npm_config_confirmModulesPurge=false pnpm install --filter ui...

WORKDIR /app/ui

EXPOSE 5173

CMD ["pnpm", "run", "dev", "--", "--host", "0.0.0.0"]
