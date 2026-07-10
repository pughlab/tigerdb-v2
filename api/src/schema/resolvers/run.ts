import { AppContext } from "../../index.ts";
import {
  changeRunStatus,
  createRun,
  createRunFiles, findPublicRun,
  findRunWithCreator,
  shareRun,
  stopSharingRun,
  updateRunParameters,
} from "../../services/run.ts";
import {
  createBucketIfNotExists,
  listBucketObjects,
  makePresignedURL,
  uploadFileToMinio,
} from "../../services/minio.ts";
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
      const { rabbitChannel } = context;
      let run;
      if (context.auth.isAuthenticated) {
        run = await findRunWithCreator(runId, context.auth.sub as string);
      } else {
        run = await findPublicRun(runId);
      }
      if (!run) {
        throw new GraphQLError("Run not found");
      }

      const bucketName = `run-${run.id}`;
      const { datasetsTsv, parameterFile, inputPaths } =
        await createRunFiles(run);
      const paths: string[] = [
        ...inputPaths,
        `s3://${bucketName}/parameter_file.txt`,
        `s3://${bucketName}/datasets.tsv`,
      ];
      await uploadFileToMinio(
        bucketName,
        "parameter_file.txt",
        Buffer.from(parameterFile),
      );
      await uploadFileToMinio(
        bucketName,
        "datasets.tsv",
        Buffer.from(datasetsTsv),
      );

      const workflowId = `workflow-${run.id}`;
      await rabbitChannel.sendToQueue(process.env.RABBITMQ_QUEUE!, {
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
      ).map((item) => item.name);
      const objectName: string | undefined = bucketItemNames.find((name) =>
        name?.includes("cluster.csv"),
      );
      if (!objectName) {
        // throw new GraphQLError(`No results found in bucket ${bucketName}`);
        return ""
      }
      return makePresignedURL(bucketName, objectName);
    },
    referenceDatasetsCount: (run: any) => run?.referenceDatasets?.length || 0,
    tcrCount: (run: any)=> run?.tcrs?.length || 0,
  },
};
