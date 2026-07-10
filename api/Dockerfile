FROM node:22-alpine

WORKDIR /app

RUN corepack enable pnpm

COPY package.json ./
RUN pnpm install

EXPOSE 4001

ENTRYPOINT ["pnpm", "run", "dev"]