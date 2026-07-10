import type { AppContext } from "../../index.ts";
import { assertAuthenticated } from "../../utils/auth.ts";
import {
  createDataset,
  isAnnotated,
  isCurated,
  updateDataset,
} from "../../services/dataset.ts";

export default {
  Mutation: {
    createDataset: async (
      _parent: unknown,
      args: { input: { projectId: string; name: string } },
      context: AppContext,
    ) => {
      assertAuthenticated(context);

      return createDataset({ input: args.input, userId: context.auth.sub });
    },
    updateDataset: async (
      _parent: unknown,
      args: { input: { datasetId: string; name: string } },
      context: AppContext,
    ) => {
      assertAuthenticated(context);

      return updateDataset({ input: args.input, userId: context.auth.sub });
    },
  },
  Dataset: {
    createdOn: async (dataset: any) => {
      return new Date(dataset.createdOn.toString()).toISOString();
    },
    tags: async (dataset: any, _args: unknown, context: AppContext) => {
      return await context.loaders.tagLoader.load(dataset.id);
    },
    uploads: async (dataset: any, _args: unknown, context: AppContext) => {
      return await context.loaders.uploadLoader.load(dataset.id);
    },
    curated: async (dataset: any) => {
      return await isCurated(dataset);
    },
    annotated: async (dataset: any) => {
      return await isAnnotated(dataset);
    },
  }
};
