import DataLoader from "dataloader";
import { runQuery } from "../neo4j.ts";

async function uploadBatch(datasetIds: readonly string[]) {
  const query: string = `
    UNWIND $datasetIds AS datasetId
    OPTIONAL MATCH (d:Dataset { datasetID: datasetId })-[:HAS_FILE]->(u:Upload)
    RETURN datasetId, collect(u) AS uploads
  `;
  const records = await runQuery(query, { datasetIds });
  const uploadsMap = new Map<string, any>();
  records.forEach((record) => {
    const id = record.get("datasetId");
    const uploads = record.get("uploads") || [];
    const mappedUploads = uploads.map((node: any) => ({
      ...node.properties,
      objectName: node.properties.objectName
    }));
    uploadsMap.set(id, mappedUploads);
  });
  return datasetIds.map((id: string) => uploadsMap.get(id) || []);
}

async function uploadByObjectName(objectNames: readonly string[]) {
  const query: string = `
    UNWIND $objectNames AS objectName
    OPTIONAL MATCH (p:ProcessedDataset { objectName: objectName })<-[:HAS_PROCESSED_FILE]-(u:Upload)
    RETURN objectName, u AS upload
  `;
  const records = await runQuery(query, { objectNames });
  const uploadMap = new Map<string, any>();
  records.forEach((record) => {
    const name = record.get("objectName");
    const uploadNode = record.get("upload");
    uploadMap.set(name, uploadNode?.properties ?? null);
  });
  return objectNames.map((name: string) => uploadMap.get(name) || null);
}

export const createUploadLoader = () => new DataLoader(uploadBatch);
export const createUploadByObjectNameLoader = () => new DataLoader(uploadByObjectName);
