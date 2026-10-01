import type { AppContext } from "../../index.ts";
import { assertAuthenticated } from "../../utils/auth.ts";
import {
  createDataset,
  deleteDataset,
  isAnnotated,
  isCurated,
  updateDataset,
} from "../../services/dataset.ts";
import { deleteBucket } from "../../services/storage.ts";

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
    deleteDataset: async (
      _parent: unknown,
      args: { input: { datasetId: string } },
      context: AppContext,
    ) => {
      assertAuthenticated(context);
      const datasetWasDeleted = await deleteDataset({ input: args.input, userId: context.auth.sub });
      if (datasetWasDeleted) {
        const bucketName: string = `dataset-${args.input.datasetId}`;
        const bucketWasDeleted = await deleteBucket(bucketName);
        return bucketWasDeleted ? "Dataset deleted successfully" : "Dataset was deleted, but files remain on the server";
      }
      return "Dataset was not deleted";
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
