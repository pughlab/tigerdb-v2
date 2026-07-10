import { randomUUID } from "node:crypto";
import { GraphQLError } from "graphql";
import { AppContext } from "../../index.ts";
import { assertAuthenticated } from "../../utils/auth.ts";
import { assertHasExtension, splitFilename } from "../../utils/file.ts";
import {
  connectUploadToProcessedDataset,
  createFileStream,
  createMinioUploadNode,
  deleteFileFromMinio,
  getFileRows,
  makePresignedURL,
  processRows,
  putObjectInBucket,
  uploadFileToMinio,
} from "../../services/minio.ts";
import { createProcessedDatasetNode } from "../../services/processedDataset.ts";
import { createHeaderNodes } from "../../services/header.ts";

export default {
  Mutation: {
    uploadFile: async (
      _parent: unknown,
      args: {
        input: {
          bucketName: string;
          file: Promise<any>;
          datasetId: string;
        };
      },
      context: AppContext,
    ) => {
      assertAuthenticated(context);

      const file = await args.input.file;
      const { createReadStream, filename } = file;
      const stream = createReadStream();

      try {
        const objectName = `${randomUUID()}_${filename}`;
        await uploadFileToMinio(args.input.bucketName, objectName, stream);
        return await createMinioUploadNode({
          bucketName: args.input.bucketName,
          objectName,
          filename,
          datasetID: args.input.datasetId,
        });
      } catch (error) {
        console.error("Upload failed:", error);
        throw new GraphQLError("Failed to upload file", {
          extensions: { code: "UPLOAD_FAILED" },
        });
      }
    },
    deleteFile: async (
      _parent: unknown,
      args: {
        input: {
          bucketName: string;
          objectName: string;
        };
      },
      context: AppContext,
    ) => {
      const { bucketName, objectName } = args.input;
      assertAuthenticated(context);

      return await deleteFileFromMinio(bucketName, objectName);
    },
    uploadProcessedHeaders: async (
      _parent: unknown,
      args: {
        input: {
          bucketName: string;
          objectName: string;
          filename: string;
          headers: { name: string; index: number }[];
          selectedDelimiter: string;
          includesHeader: boolean;
        };
      },
      context: AppContext,
    ) => {
      assertAuthenticated(context);
      assertHasExtension(args.input.filename);

      const {
        bucketName,
        objectName,
        filename,
        headers,
        selectedDelimiter,
        includesHeader,
      } = args.input;
      const { basename } = splitFilename(filename);
      const rows = await getFileRows(bucketName, objectName, includesHeader);
      const processedData = processRows(rows, headers, selectedDelimiter);
      const processedFileStream = createFileStream(processedData);
      const { basename: objectBasename } = splitFilename(objectName);
      const newObjectName: string = `processed-${objectBasename}.tsv`;
      await putObjectInBucket(processedFileStream, bucketName, newObjectName);
      const processedDataset: any = await createProcessedDatasetNode({
        bucketName,
        objectName: newObjectName,
        filename: `processed-${basename}.tsv`,
        data: processedData,
        delimiter: selectedDelimiter,
      });
      await createHeaderNodes(headers, processedDataset);
      return await connectUploadToProcessedDataset(
        objectName,
        processedDataset.objectName,
      );
    },
  },
  MinioUpload: {
    presignedURL: (upload: any) => {
      const { bucketName, objectName } = upload;
      return makePresignedURL(bucketName, objectName);
    },
    processedDataset: async (
      upload: any,
      _args: unknown,
      context: AppContext,
    ) => {
      return await context.loaders.processedDatasetObjectNameLoader.load(
        upload.objectName,
      );
    },
    dataset: async (upload: any, _args: unknown, context: AppContext) => {
      return await context.loaders.datasetByObjectNameLoader.load(upload.objectName);
    },
  },
  ProcessedDataset: {
    presignedURL: (dataset: any) => {
      const { bucketName, objectName } = dataset;
      return makePresignedURL(bucketName, objectName);
    },
    upload: async (
      dataset: any,
      _args: unknown,
      context: AppContext,
    ) => {
      return await context.loaders.uploadByObjectNameLoader.load(dataset.objectName);
    },
  },
};
