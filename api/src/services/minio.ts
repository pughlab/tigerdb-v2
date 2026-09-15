import { BucketItem } from "minio";
import { minioClient, presignClient } from "../minio.ts";
import { runQuery } from "../neo4j.ts";

const ONE_DAY_IN_SECONDS: number = 24 * 60 * 60;

export async function createBucketIfNotExists(bucketName: string) {
  const exists: boolean = await minioClient.bucketExists(bucketName);
  if (!exists) {
    await minioClient.makeBucket(bucketName);
  }
}

export async function listBucketObjects(
  bucketName: string,
): Promise<BucketItem[]> {
  try {
    const exists: boolean = await minioClient.bucketExists(bucketName);
    if (exists) {
      return await new Promise((resolve, reject) => {
        let objects: BucketItem[] = [];
        const stream = minioClient.listObjectsV2(bucketName, "", true);
        stream.on("data", (obj: BucketItem) => objects.push(obj));
        stream.on("end", () => resolve(objects));
        stream.on("error", (err: Error) => reject(err));
      });
    }
    return [];
  } catch (error) {
    throw new Error(
      `There was an error listing the bucket's objects: ${error}`,
    );
  }
}

export async function uploadFileToMinio(
  bucketName: string,
  objectName: string,
  stream: any,
) {
  await createBucketIfNotExists(bucketName);
  await minioClient.putObject(bucketName, objectName, stream);
  console.log(
    `File uploaded to MinIO bucket ${bucketName} with object name ${objectName}`,
  );
}

export async function createMinioUploadNode(params: {
  bucketName: string;
  objectName: string;
  filename: string;
  datasetID: string;
}) {
  const query = `
        MATCH (d:Dataset {datasetID: $datasetID})
        CREATE (m:MinioUpload {
            bucketName: $bucketName,
            objectName: $objectName,
            filename: $filename
        })
        MERGE (d)-[:HAS_FILE]->(m)
        RETURN m
    `;

  const records = await runQuery(query, params);

  if (records.length === 0) {
    throw new Error("Dataset not found");
  }

  return records[0].get("m").properties;
}

export async function deleteFileFromMinio(
  bucketName: string,
  objectName: string,
) {
  const exists = await minioClient.bucketExists(bucketName);
  if (!exists) {
    throw new Error("Bucket does not exist");
  }
  await minioClient.removeObject(bucketName, objectName);
  const query = `
        MATCH (m:MinioUpload { bucketName: $bucketName, objectName: $objectName })
        DETACH DELETE m
        RETURN m
    `;
  const records = await runQuery(query, { bucketName, objectName });
  return records.length > 0;
}

export async function getFileRows(
  bucketName: string,
  objectName: string,
  includesHeader: boolean,
) {
  const stream = await minioClient.getObject(bucketName, objectName);
  const chunks: Uint8Array<ArrayBufferLike>[] = [];
  await stream.forEach((chunk) => {
    chunks.push(chunk);
  });
  const text = Buffer.concat(chunks).toString("utf-8");
  let rows = text.split("\n");

  if (includesHeader) {
    rows = rows.slice(1);
  }

  return rows;
}

export function processRows(
  rows: string[],
  headers: { name: string; index: number }[],
  selectedDelimiter: string,
) {
  return rows.map((row: string) => {
    const cells = row.split(selectedDelimiter);
    return headers.reduce((acc: { [key: string]: string }, header) => {
      const { name, index } = header;
      acc[name] = cells[index];
      return acc;
    }, {});
  });
}

export function createFileStream(processedData: any[]) {
  const requiredKeys = [
    "cdr3b",
    "trbv",
    "trbj",
    "cdr3a",
    "subject:condition",
    "count",
  ];
  const defaults: { [key: string]: string } = {
    cdr3a: "NA",
    cdr3b: "NA",
    trbj: "NA",
    "subject:condition": "TIGERDB:Default",
    count: "1",
    trbv: "NA",
  };

  const processedFile = processedData.map((row: any): string => {
    const formattedRow = requiredKeys.map((key: string) => {
      const value = row[key] || defaults[key];
      return typeof value === "string" ? value.replaceAll("\r", "") : value;
    });
    return formattedRow.join("\t");
  });
  return Buffer.from(processedFile.join("\n"));
}

export async function putObjectInBucket(
  file: any,
  bucketName: string,
  objectName: string,
) {
  const stream = await file;
  return await uploadFileToMinio(bucketName, objectName, stream);
}

export async function connectUploadToProcessedDataset(
  objectName: string,
  processedDatasetObjectName: string,
) {
  const query = `
        MATCH (m:MinioUpload { objectName: $objectName })
        MATCH (p:ProcessedDataset { objectName: $processedDatasetObjectName })
        MERGE (m)-[:HAS_PROCESSED_FILE]->(p)
        RETURN m
    `;
  const results = await runQuery(query, {
    objectName,
    processedDatasetObjectName,
  });
  if (results.length === 0) {
    throw new Error("Upload not found or processed dataset not found");
  }

  return results[0].get("m").properties;
}

export async function makePresignedURL(bucketName: string, objectName: string) {
  try {
    return await presignClient.presignedGetObject(
      bucketName,
      objectName,
      ONE_DAY_IN_SECONDS,
    );
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to create presigned URL: ${error}`);
  }
}

export async function getFinalLogs(bucketName: string, objectName: string = "final.log") {
  try {
    const dataStream = await minioClient.getObject(bucketName, objectName);
    return new Promise((resolve, _reject) => {
      const chunks: any[] = [];

      dataStream.on("data", (chunk: any) => {
        chunks.push(chunk);
      });

      dataStream.on("end", () => {
        resolve(Buffer.concat(chunks).toString("utf-8"));
      });

      dataStream.on("error", (error: any) => {
        console.error(
          `Error getting logs for bucket ${bucketName} from MinIO:`,
          error,
        );
        resolve("");
      });
    });
  } catch (error) {
    console.error(
      `Error getting logs for bucket ${bucketName} from MinIO:`,
      error,
    );
    return "";
  }
}
