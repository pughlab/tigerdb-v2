FROM node:26-alpine

WORKDIR /app

RUN npm install -g corepack@latest && corepack enable && corepack enable pnpm

COPY package.json ./
RUN pnpm install

EXPOSE 4001

ENTRYPOINT ["pnpm", "run", "dev"]