import DataLoader from "dataloader";
import { runQuery } from "../neo4j.ts";

async function processedDatasetBatch(
  runIds: readonly string[],
): Promise<any[]> {
  const query = `
        UNWIND $runIds AS runId
        OPTIONAL MATCH (p:ProcessedDataset)-[:HAS_RUN]->(run:Run { runID: $runId })
        RETURN runId, collect(p) AS processedDatasets;
    `;
  const records = await runQuery(query, { runIds });
  const processedDatasetsMap = new Map<string, any>();
  records.forEach((record) => {
    const id = record.get("runId");
    const processedDatasets = record.get("processedDatasets");
    const mappedDatasets = processedDatasets.map((node: any) => ({
      ...node.properties,
    }));
    processedDatasetsMap.set(id, mappedDatasets);
  });
  return runIds.map((id: string) => processedDatasetsMap.get(id) || []);
}

async function processedDatasetByUploadObjectName(
  objectNames: readonly string[],
): Promise<any> {
  const query: string = `
    UNWIND $objectNames AS objectName
    OPTIONAL MATCH (:Upload { objectName: objectName })-[:HAS_PROCESSED_FILE]->(p:ProcessedDataset)
    RETURN objectName, p AS dataset
  `;
  const records = await runQuery(query, { objectNames });
  const datasetMap = new Map<string, any>();
  records.forEach((record) => {
    const name = record.get("objectName");
    const datasetNode = record.get("dataset");
    const dataset = datasetNode ? { ...datasetNode.properties } : null;
    datasetMap.set(name, dataset);
  });
  return objectNames.map((name: string) => datasetMap.get(name) || null);
}

export const createProcessedDatasetLoader = () => new DataLoader(processedDatasetBatch);
export const createProcessedDatasetByObjectNameLoader = () =>
  new DataLoader(processedDatasetByUploadObjectName);
