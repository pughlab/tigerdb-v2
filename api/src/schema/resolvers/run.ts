import { AppContext } from "../../index.ts";
import {
  changeRunStatus,
  createRun,
  createRunFiles,
  deleteRun,
  findPublicRun,
  findRunWithCreator,
  getTCRCount,
  shareRun,
  stopSharingRun,
  updateRunParameters,
} from "../../services/run.ts";
import {
  createBucketIfNotExists, deleteBucket, getFinalLogs,
  listBucketObjects,
  makePresignedURL, setUpScriptsBucket,
  uploadFile,
} from "../../services/storage.ts";
import { assertAuthenticated } from "../../utils/auth.ts";
import { GraphQLError } from "graphql";

export default {
  Mutation: {
    createRun: async (
      _parent: unknown,
      args: {
        input: {
          name: string;
          description: string;
          processedDatasetNames: string[];
          referenceDatasetNames: string[];
          parameters?: {
            outPrefix?: string;
            localMinpValue?: number;
            pDepth?: number;
            globalConvergenceCutoff?: number;
            simulationDepth?: number;
            kmerMinDepth?: number;
            localMinOVE?: number;
            allAAInterchangeable?: number;
          };
        };
      },
      context: AppContext,
    ) => {
      const run = await createRun({
        input: args.input,
        authInfo: context.auth,
      });
      await createBucketIfNotExists(`run-${run.id}`);
      return run;
    },
    deleteRun: async (
      _parent: unknown,
      args: {
        input: {
          runId: string;
        };
      },
      context: AppContext,
    ) => {
      const { isAuthenticated } = context.auth;
      const runWasDeleted: boolean = await deleteRun(args.input.runId, isAuthenticated);
      if (runWasDeleted) {
        const bucketWasDeleted = await deleteBucket(`run-${args.input.runId}`);
        return bucketWasDeleted ? "Run deleted successfully" : "Run deleted, but files remain on the server";
      }
      return "Run was not deleted";
    },
    shareRun: async (
      _parent: unknown,
      args: {
        input: {
          runId: string;
          emails: string[];
        };
      },
      context: AppContext,
    ) => {
      assertAuthenticated(context);

      return await shareRun({ input: args.input, userId: context.auth.sub });
    },
    stopSharingRun: async (
      _parent: unknown,
      args: {
        input: {
          runId: string;
          email: string;
        };
      },
      context: AppContext,
    ) => {
      assertAuthenticated(context);

      return stopSharingRun({ input: args.input, userId: context.auth.sub });
    },
    updateRunParameters: async (
      _parent: unknown,
      args: {
        input: {
          runId: string;
          outPrefix?: string;
          localMinpValue?: number;
          pDepth?: number;
          globalConvergenceCutoff?: number;
          simulationDepth?: number;
          kmerMinDepth?: number;
          localMinOVE?: number;
          allAAInterchangeable?: number;
        };
      },
    ) => {
      return await updateRunParameters({ input: args.input });
    },
    submitRun: async (
      _parent: unknown,
      args: {
        input: {
          runId: string;
        };
      },
      context: AppContext,
    ) => {
      const { runId } = args.input;
      const { workflowChannel } = context;
      let run;
      if (context.auth.isAuthenticated) {
        run = await findRunWithCreator(runId, context.auth.sub as string);
      } else {
        run = await findPublicRun(runId);
      }
      if (!run) {
        throw new GraphQLError("Run not found");
      }

      await setUpScriptsBucket();
      const bucketName = `run-${run.id}`;
      const { datasetsTsv, parameterFile, inputPaths } =
        await createRunFiles(run);
      const paths: string[] = [
        ...inputPaths,
        `s3://${bucketName}/parameter_file.txt`,
        `s3://${bucketName}/datasets.tsv`,
      ];
      await uploadFile(
        bucketName,
        "parameter_file.txt",
        Buffer.from(parameterFile),
      );
      await uploadFile(bucketName, "datasets.tsv", Buffer.from(datasetsTsv));

      const workflowId = `workflow-${run.id}`;
      await workflowChannel.sendToQueue(process.env.RABBITMQ_QUEUE!, {
        workflowId,
        bucketName,
        paths,
        runId: run.id,
        outPrefix: run.outPrefix,
      });
      return await changeRunStatus(run.id, "submitted", workflowId);
    },
  },
  Run: {
    presignedURL: async (run: any) => {
      const bucketName = `run-${run.id}`;
      const bucketItemNames: (string | undefined)[] = (
        await listBucketObjects(bucketName)
      ).map((item) => item.Key);
      const objectName: string | undefined = bucketItemNames.find((name) =>
        name?.includes("cluster.csv"),
      );
      if (!objectName) {
        return "";
      }
      return makePresignedURL(bucketName, objectName);
    },
    referenceDatasetsCount: (run: any) => run?.referenceDatasets?.length || 0,
    tcrCount: async (run: any) => {
      return await getTCRCount(run.id);
    },
    sharedWith: async (run: any, _args: unknown, context: AppContext) => {
      return await context.loaders.runSharedWithLoader.load(run.id);
    },
    logs: async (run: any) => {
      const bucketName: string = `run-${run.id}`;
      return await getFinalLogs(bucketName);
    },
  },
};
