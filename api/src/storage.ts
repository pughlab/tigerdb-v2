import { S3Client } from "@aws-sdk/client-s3";

const credentials = {
  accessKeyId: process.env.S3_ACCESS_KEY || "versitygw",
  secretAccessKey: process.env.S3_SECRET_KEY || "versitygw",
};

export const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: process.env.S3_ENDPOINT || "http://versitygw:7070",
  forcePathStyle: true,
  credentials,
});

export const s3PresignClient = new S3Client({
  region: "us-east-1",
  endpoint: process.env.S3_PRESIGN_ENDPOINT || "http://localhost:7070",
  forcePathStyle: true,
  credentials,
});

export const s3InternalPresignClient = new S3Client({
  region: "us-east-1",
  endpoint:
    process.env.S3_INTERNAL_PRESIGN_ENDPOINT || "http://gateway:7070",
  forcePathStyle: true,
  credentials,
});