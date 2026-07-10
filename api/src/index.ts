import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import express from "express";
import cors from "cors";
import { loadFiles } from "@graphql-tools/load-files";
import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";
import { typeDefs as scalarTypeDefs } from "graphql-scalars";
import { Neo4jGraphQL } from "@neo4j/graphql";
import { decodeJwt } from "jose";
import graphqlUploadExpress from "graphql-upload/graphqlUploadExpress.mjs";
import "dotenv/config";
import DataLoader from "dataloader";
import amqp, { ChannelWrapper } from "amqp-connection-manager";

import { driver } from "./neo4j.js";
import {
  createDatasetByObjectNameLoader,
  createDatasetLoader,
  createDatasetsByTagNameLoader,
} from "./loaders/dataset.ts";
import { createSharedWithLoader } from "./loaders/keycloak.ts";
import { createTagLoader } from "./loaders/tag.ts";
import { createProcessedDatasetByObjectNameLoader, createProcessedDatasetLoader } from "./loaders/processedDataset.ts";
import {
  createUploadLoader,
  createUploadByObjectNameLoader,
} from "./loaders/minio.ts";

export type AppAuth = {
  sub?: string;
  username?: string;
  roles: string[];
  isAuthenticated: boolean;
  name: string;
  email: string;
};

export type AppContext = {
  req: express.Request;
  auth: AppAuth;
  loaders: {
    datasetLoader: DataLoader<string, any>;
    sharedWithLoader: DataLoader<string, any>;
    tagLoader: DataLoader<string, any>;
    tagDatasetLoader: DataLoader<string, any>;
    processedDatasetLoader: DataLoader<string, any>;
    uploadLoader: DataLoader<string, any>;
    uploadByObjectNameLoader: DataLoader<string, any>;
    processedDatasetObjectNameLoader: DataLoader<string, any>;
    datasetByObjectNameLoader: DataLoader<string, any>;
  };
  rabbitChannel: ChannelWrapper;
};

function mapKeycloakClaims(jwt: any): AppAuth {
  const realmRoles: string[] = jwt?.realm_access?.roles ?? [];
  const clientRoles: string[] =
    jwt?.resource_access?.["tigerdb-app"]?.roles ?? [];
  return {
    sub: jwt?.sub,
    username: jwt?.preferred_username,
    roles: [...realmRoles, ...clientRoles],
    isAuthenticated: Boolean(jwt?.sub),
    name: jwt?.name ?? jwt?.preferred_username,
    email: jwt?.email,
  };
}

const BASE_PATH = path.dirname(new URL(import.meta.url).pathname);

const rabbitConnection = amqp.connect([
  `amqp://${process.env.RABBITMQ_USER!}:${process.env.RABBITMQ_PASSWORD!}@${process.env.RABBITMQ_HOST!}:${process.env.RABBITMQ_PORT!}`,
]);
rabbitConnection.on("connect", () => {
  console.log("Connected to RabbitMQ");
});
rabbitConnection.on("disconnect", (params) => {
  console.error("Disconnected from RabbitMQ", params.err);
});
const workflowChannel: ChannelWrapper = rabbitConnection.createChannel({
  json: true,
  setup: (channel: any) =>
    channel.assertQueue(process.env.RABBITMQ_QUEUE, { durable: true }),
});

const typesArray = await loadFiles(
  path.join(BASE_PATH, "schema/typedefs/**/*.graphql"),
  {
    ignoreIndex: true,
    extensions: ["graphql"],
  },
);
const resolversArray = await loadFiles(
  path.join(BASE_PATH, "schema/resolvers/**/*.ts"),
  {
    ignoreIndex: true,
    extensions: ["ts"],
  },
);
const mergedTypeDefs = mergeTypeDefs([...scalarTypeDefs, typesArray]);
const scalarsToRemove: Set<string> = new Set([
  "BigInt",
  "Date",
  "DateTime",
  "Duration",
  "LocalDateTime",
  "LocalTime",
  "Time",
]);
const typeDefs = {
  ...mergedTypeDefs,
  definitions: mergedTypeDefs.definitions.filter((def) => {
    const hasConflict =
      def.kind === "ScalarTypeDefinition" &&
      scalarsToRemove.has(def.name.value);
    return !hasConflict;
  }),
};
const resolvers = mergeResolvers(resolversArray);
const neoSchema = new Neo4jGraphQL({
  typeDefs,
  resolvers,
  driver,
  features: {
    authorization: {
      key: {
        url: process.env.KEYCLOAK_JWKS_URL!,
      },
    },
  },
  debug: true,
});

const schema = await neoSchema.getSchema();

const app = express();
const sslOptions = {
  key: fs.readFileSync(path.join(BASE_PATH, "..", "certificates", "key.pem")),
  cert: fs.readFileSync(path.join(BASE_PATH, "..", "certificates", "cert.pem")),
};
const httpsServer = https.createServer(sslOptions, app);
const server = new ApolloServer<AppContext>({
  schema,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer: httpsServer })],
});
await server.start();

app.use(graphqlUploadExpress());

app.use(
  "/graphql",
  cors<cors.CorsRequest>({ origin: true, credentials: true }),
  express.json(),
  expressMiddleware(server, {
    context: async ({ req }) => {
      const authHeader = req.headers.authorization;
      let auth: AppAuth = {
        roles: [],
        isAuthenticated: false,
        name: "",
        email: "",
      };

      if (authHeader?.startsWith("Bearer ")) {
        try {
          const token = authHeader.slice(7);
          const claims = decodeJwt(token);
          auth = mapKeycloakClaims(claims);
        } catch (e) {
          console.error("Failed to decode JWT token", e);
        }
      }
      const loaders = {
        datasetLoader: createDatasetLoader(),
        sharedWithLoader: createSharedWithLoader(),
        tagLoader: createTagLoader(),
        tagDatasetLoader: createDatasetsByTagNameLoader(),
        processedDatasetLoader: createProcessedDatasetLoader(),
        uploadLoader: createUploadLoader(),
        uploadByObjectNameLoader: createUploadByObjectNameLoader(),
        processedDatasetObjectNameLoader:
          createProcessedDatasetByObjectNameLoader(),
        datasetByObjectNameLoader: createDatasetByObjectNameLoader(),
      };

      return { req, auth, jwt: auth, loaders, rabbitChannel: workflowChannel };
    },
  }),
);

await new Promise((resolve) => {
  httpsServer.listen(
    { port: Number.parseInt(process.env.PORT || "4001") },
    () => resolve(true),
  );
});
