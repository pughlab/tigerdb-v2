import { runQuery } from "../neo4j.ts";

export async function createHeaderNodes(
  headers: { name: string; index: number }[],
  processedDataset: any,
) {
  const query = `
        MATCH (p:ProcessedDataset {
          bucketName: $bucketName,
          objectName: $objectName
        })
        UNWIND $headers AS header
        MERGE (h:Header)
        ON CREATE SET
            h.name = header.name,
            h.index = header.index
        MERGE (p)-[:HAS_HEADER]->(h)
    `;
  await runQuery(query, {
    bucketName: processedDataset.bucketName,
    objectName: processedDataset.objectName,
    headers,
  });
}

export async function getHeaderNodes(objectName: string) {
  const query = `
        MATCH (p:ProcessedDataset { objectName: $objectName })-[:HAS_HEADER]->(h:Header)
        RETURN h
    `;
  const results = await runQuery(query, { objectName });
  if (results.length === 0) {
    throw new Error("No headers found for the specified processed dataset");
  }
  return results.map((record) => record.get("h").properties);
}
