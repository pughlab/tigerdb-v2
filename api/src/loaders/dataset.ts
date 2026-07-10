import DataLoader from "dataloader";
import { runQuery } from "../neo4j.ts";

async function datasetBatch(projectIds: readonly string[]) {
    const query: string = `
        UNWIND $projectIds AS projectId
        OPTIONAL MATCH (p:Project { projectID: projectId })-[:HAS_DATASET]->(d:Dataset)
        RETURN projectId, collect(d) AS datasets
    `
    const records = await runQuery(query, { projectIds });
    const datasetMap = new Map<string, any>();
    records.forEach((record) => {
        const id = record.get("projectId");
        const datasets = record.get("datasets") || [];
        const mappedDatasets = datasets.map((node:any) => ({
            ...node.properties,
            id: node.properties.datasetID
        }));
        datasetMap.set(id, mappedDatasets);
    })
    return projectIds.map(id => datasetMap.get(id) || []);
}

async function datasetsByTagName(tagNames: readonly string[]) {
    const query: string = `
        UNWIND $tagNames AS tagName
        OPTIONAL MATCH (d:Dataset)-[:HAS_TAG]->(t:Tag { name: tagName })
        RETURN tagName, collect(d) AS datasets
    `
    const records = await runQuery(query, { tagNames });
    const datasetMap = new Map<string, any>();
    records.forEach((record) => {
        const name = record.get("tagName");
        const datasets = record.get("datasets") || [];
        const mappedDatasets = datasets.map((node:any) => ({
            ...node.properties,
            id: node.properties.datasetID
        }));
        datasetMap.set(name, mappedDatasets);
    })
    return tagNames.map(name => datasetMap.get(name) || []);
}

async function datasetByObjectName(objectNames: readonly string[]) {
  const query: string = `
    UNWIND $objectNames AS objectName
    OPTIONAL MATCH (u:MinioUpload { objectName: objectName })<-[:HAS_FILE]-(d:Dataset)
    RETURN objectName, d AS dataset
  `;
  const records = await runQuery(query, { objectNames });
  const datasetMap = new Map<string, any>();
  records.forEach((record) => {
    const name = record.get("objectName");
    const datasetNode = record.get("dataset");
    if (datasetNode?.properties) {
      const mappedDataset = {
        ...datasetNode.properties,
        id: datasetNode.properties.datasetID
      }
      datasetMap.set(name, mappedDataset);
    } else {
      datasetMap.set(name, null);
    }
  });
  return objectNames.map(name => datasetMap.get(name) || null);
}

export const createDatasetLoader = () => new DataLoader(datasetBatch)
export const createDatasetsByTagNameLoader = () => new DataLoader(datasetsByTagName)
export const createDatasetByObjectNameLoader = () => new DataLoader(datasetByObjectName);