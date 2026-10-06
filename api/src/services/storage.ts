import {
  _Object,
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand, DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  paginateListObjectsV2,
  waitUntilObjectNotExists,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, s3PresignClient, s3InternalPresignClient } from "../storage.ts";
import { runQuery } from "../neo4j.ts";

const ONE_HOUR_IN_SECONDS: number = 3600;

export interface PresignedURLOptions {
  internal?: boolean;
  expiresIn?: boolean;
}

async function checkIfBucketExists(bucketName: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return true;
  } catch (error) {
    if (error.name === "NotFound") {
      return false;
    }
    if (error.name === "Forbidden") {
      return true;
    }
    throw error;
  }
}

async function emptyBucket(bucketName: string) {
  try {
    const paginator = paginateListObjectsV2({ client: s3Client }, { Bucket: bucketName });
    const objectKeys = [];
    for await (const { Contents } of paginator) {
      objectKeys.push(...Contents.map(obj => ({ Key: obj.Key})))
    }
    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: objectKeys,
        },
      })
    );
  } catch (error) {
    console.error(`Failed to empty bucket ${bucketName}. ${error.name}: ${error.message}`)
  }
}

export async function createBucketIfNotExists(bucketName: string) {
  const exists: boolean = await checkIfBucketExists(bucketName);
  if (!exists) {
    await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
  }
}

export async function listBucketObjects(bucketName: string) {
  try {
    const exists: boolean = await checkIfBucketExists(bucketName);
    if (exists) {
      const objects: _Object[] = [];
      const response = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
        }),
      );
      response.Contents?.forEach((obj) => objects.push(obj));
      return objects;
    }
    return [];
  } catch (error) {
    throw new Error(
      `There was an error listing the bucket's objects: ${error}`,
    );
  }
}

export async function uploadFile(
  bucketName: string,
  objectName: string,
  stream: any,
) {
  try {
    await createBucketIfNotExists(bucketName);
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: objectName,
        Body: stream,
      },
    });
    await upload.done();
    console.log(`Uploaded object ${objectName} to bucket ${bucketName}`);
  } catch (error) {
    throw new Error(
      `Failed to upload object ${objectName} to bucket ${bucketName}: ${error}`,
    );
  }
}

export async function createUploadNode(params: {
  bucketName: string;
  objectName: string;
  filename: string;
  datasetID: string;
}) {
  const query: string = `
    MATCH (d:Dataset {datasetID: $datasetID})
    CREATE (u:Upload {
      bucketName: $bucketName,
      objectName: $objectName,
      filename: $filename
    })
    MERGE (d)-[:HAS_FILE]->(u)
    RETURN u
  `;

  const records = await runQuery(query, params);

  if (records.length === 0) {
    throw new Error("Dataset not found");
  }

  return records[0].get("u").properties;
}

export async function deleteFile(bucketName: string, objectName: string) {
  const exists: boolean = await checkIfBucketExists(bucketName);
  if (!exists) {
    throw new Error("Bucket does not exist");
  }
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: objectName,
      }),
    );
    await waitUntilObjectNotExists(
      { client: s3Client, maxWaitTime: 30 },
      { Bucket: bucketName, Key: objectName },
    );
    const query = `
      MATCH (u:Upload { bucketName: $bucketName, objectName: $objectName })
      DETACH DELETE u
      RETURN u
    `;
    const records = await runQuery(query, { bucketName, objectName });
    return records.length > 0;
  } catch (error) {
    console.error(
      `There was an error while deleting the file from storage`,
      error,
    );
    return false;
  }
}

export async function deleteBucket(bucketName: string) {
  const exists: boolean = await checkIfBucketExists(bucketName);
  if (exists) {
    try {
      await emptyBucket(bucketName);
      await s3Client.send(
        new DeleteBucketCommand({
          Bucket: bucketName,
        }),
      );
      return true;
    } catch (error) {
      console.error(`There was an error while deleting the bucket`, error);
      return false;
    }
  } else {
    return false;
  }
}

export async function getFileRows(
  bucketName: string,
  objectName: string,
  includesHeader: boolean,
) {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: objectName,
    }),
  );
  const fileContent = await response.Body?.transformToString();
  if (!fileContent) {
    return [];
  }

  let rows: string[] = fileContent.split("\n");

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
  return await uploadFile(bucketName, objectName, stream);
}

export async function connectUploadToProcessedDataset(
  objectName: string,
  processedDatasetObjectName: string,
) {
  const query = `
    MATCH (u:Upload { objectName: $objectName })
    MATCH (p:ProcessedDataset { objectName: $processedDatasetObjectName })
    MERGE (u)-[:HAS_PROCESSED_FILE]->(p)
    RETURN u
  `;
  const results = await runQuery(query, {
    objectName,
    processedDatasetObjectName,
  });
  if (results.length === 0) {
    throw new Error("Upload not found or processed dataset not found");
  }

  return results[0].get("u").properties;
}

export async function makePresignedURL(bucketName: string, objectName: string, options: PresignedURLOptions = {}) {
  const { internal = false, expiresIn = ONE_HOUR_IN_SECONDS } = options;
  const client = internal ? s3InternalPresignClient : s3PresignClient;
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: objectName,
  });
  return await getSignedUrl(client, command, { expiresIn: expiresIn as number });

}

export async function getFinalLogs(bucketName: string, objectName: string = "final.log") {
  return await s3Client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: objectName,
    }),
  );
}