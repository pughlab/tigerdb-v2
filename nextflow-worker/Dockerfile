FROM node:22-alpine AS node

RUN corepack enable

FROM eclipse-temurin:25-jdk-alpine

RUN apk add --no-cache \
    bash \
    curl \
    git \
    graphviz \
    procps \
    coreutils \
    nodejs \
    npm \
&& addgroup -S nextflow && adduser -S nfworker -G nextflow \
&& mkdir /nextflow && chown nfworker:nextflow /nextflow

COPY --from=node /usr/local/ /usr/local/

ENV NEXTFLOW_VERSION=26.04.3
ENV NXF_HOME=/nextflow

USER nfworker
WORKDIR /nextflow
RUN curl -fsSL https://github.com/nextflow-io/nextflow/releases/download/v${NEXTFLOW_VERSION}/nextflow-${NEXTFLOW_VERSION}-dist \
    -o /nextflow/nextflow && \
    chmod +x /nextflow/nextflow && \
    ./nextflow -self-update
ENV PATH="/nextflow:${PATH}"

WORKDIR /work
RUN corepack enable pnpm
COPY package.json ./
RUN pnpm install

CMD ["pnpm", "run", "dev"]