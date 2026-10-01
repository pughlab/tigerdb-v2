import { randomUUID } from "node:crypto";
import { runQuery } from "../neo4j.ts";
import { createBucketIfNotExists } from "./storage.ts";

function mapDatasetNode(node: any) {
  const props = node.properties;
  return {
    ...props,
    id: props.datasetID,
  };
}

export async function createDataset(params: {
  input: { projectId: string; name: string };
  userId: string;
}) {
  const { input, userId } = params;
  const datasetId = randomUUID();
  const bucketName = `dataset-${datasetId}`;
  const datasetQuery: string = `
    MATCH (p:Project { projectID: $projectId })-[:CREATED_BY]->(u:KeycloakUser { keycloakUserID: $userId })
    CREATE (d:Dataset { datasetID: $datasetId, name: $name, createdOn: datetime(), bucketName: $bucketName })
    CREATE (p)-[:HAS_DATASET]->(d)
    RETURN d
  `;
  const datasetRecords = await runQuery(datasetQuery, {
    datasetId,
    bucketName,
    projectId: input.projectId,
    name: input.name,
    userId,
  });
  if (datasetRecords?.length === 0) {
    throw new Error("Project not found or user not authorized");
  }
  const datasetNode = datasetRecords[0].get("d");

  // attempt to create the bucket and rollback the created dataset if it fails
  try {
    await createBucketIfNotExists(bucketName);
    return mapDatasetNode(datasetNode);
  } catch (error) {
    console.error(
      "Failed to create bucket, rolling back dataset creation...",
      error,
    );
    const rollbackQuery = `
      MATCH (d:Dataset { datasetID: $datasetId })
      DETACH DELETE d 
    `;
    await runQuery(rollbackQuery, { datasetId }).catch((rollbackError) => {
      console.error("Failed to rollback database", rollbackError);
    });

    throw new Error("Failed to create dataset storage");
  }
}

async function hasRuns(datasetId: string) {
  const query: string = `
    MATCH (d:Dataset {datasetID: $datasetId})
    WITH d
    OPTIONAL MATCH (d)-[:HAS_FILE]->(u:Upload)
    OPTIONAL MATCH (u)-[:HAS_PROCESSED_FILE]->(p:ProcessedDataset)
    OPTIONAL MATCH (p)-[:HAS_RUN]->(x:Run)
    WITH count(x) as numberOfRuns
    RETURN numberOfRuns > 0 AS hasRuns
  `;
  const records = await runQuery(query, { datasetId });
  return records[0].get("hasRuns");
}

export async function updateDataset(params: {
  input: { datasetId: string; name: string };
  userId: string;
}) {
  const { input, userId } = params;

  const query = `
    MATCH (d:Dataset { datasetID: $datasetId })<-[:HAS_DATASET]-(p:Project)-[:CREATED_BY]->(u:KeycloakUser { keycloakUserID: $userId })
    SET d.name = $name
    RETURN d
  `;

  const records = await runQuery(query, {
    name: input.name,
    datasetId: input.datasetId,
    userId,
  });

  if (records?.length === 0) {
    throw new Error("Dataset not found or user not authorized");
  }
  return mapDatasetNode(records[0].get("d"));
}

async function deleteHeaders(datasetId: string, userId: string) {
  const query: string = `
    MATCH (d:Dataset { datasetID: $datasetId })<-[:HAS_DATASET]-(p:Project)-[:CREATED_BY]->(u:KeycloakUser { keycloakUserID: $userId })
    MATCH (d)-[:HAS_FILE]->()-[:HAS_PROCESSED_FILE]->()-[:HAS_HEADER]-(h:Header)
    MATCH (x:ProcessedDataset)-[r:HAS_HEADER]-(h)
    WITH h, r, COUNT { (h)--() } AS degree
    FOREACH (_ IN CASE WHEN degree <= 1 THEN [1] ELSE [] END | DETACH DELETE h)
    FOREACH (_ IN CASE WHEN degree > 1 THEN [1] ELSE [] END | DELETE r)
  `;

  await runQuery(query, {
    datasetId,
    userId,
  });
}

async function deleteProcessedDatasets(datasetId: string, userId: string) {
  const query: string = `
    MATCH (d:Dataset { datasetID: $datasetId })<-[:HAS_DATASET]-(p:Project)-[:CREATED_BY]->(u:KeycloakUser { keycloakUserID: $userId })
    MATCH (d)-[:HAS_FILE]->()-[r:HAS_PROCESSED_FILE]->(pd:ProcessedDataset)
    WITH pd, r, COUNT { (pd)-->() } AS exitDegree
    FOREACH (_ IN CASE WHEN exitDegree <= 0 THEN [1] ELSE [] END | DETACH DELETE pd)
    FOREACH (_ IN CASE WHEN exitDegree > 0 THEN [1] ELSE [] END | DELETE r)
  `;

  await runQuery(query, { datasetId, userId });
}

async function deleteDatasetVariables(datasetId: string, userId: string) {
  const query: string = `
    CALL apoc.periodic.iterate(
      '
        MATCH (d:Dataset { datasetID: $datasetId })<-[:HAS_DATASET]-(p:Project)-[:CREATED_BY]->(u:KeycloakUser { keycloakUserID: $userId })
        MATCH (d)-[:HAS_CURATED_DATASET]->()-[:HAS_DATASET_VARIABLE]->(v:DatasetVariable)
        RETURN elementId(v) AS nodeId
      ',
      '
        MATCH (v:DatasetVariable) WHERE elementId(v) = nodeId
        DETACH DELETE v
      ',
      {
        batchSize: 5000,
        parallel: false,
        params: { datasetId: $datasetId, userId: $userId }
      }
    )
    YIELD failedBatches
    WITH failedBatches
    WHERE failedBatches = 0
    MATCH (d:Dataset { datasetID: $datasetId })<-[:HAS_DATASET]-(p:Project)-[:CREATED_BY]->(u:KeycloakUser { keycloakUserID: $userId })
    MATCH (d)-[:HAS_CURATED_DATASET]->(cd:CuratedDataset)
    DETACH DELETE cd
  `;

  await runQuery(query, { datasetId, userId });
}

async function deleteAnnotationVariables(datasetId: string, userId: string) {
  const query: string = `
    CALL apoc.periodic.iterate(
      '
        MATCH (d:Dataset { datasetID: $datasetId })<-[:HAS_DATASET]-(p:Project)-[:CREATED_BY]->(u:KeycloakUser { keycloakUserID: $userId })
        MATCH (d)-[:HAS_CURATED_ANNOTATION]->()-[:HAS_ANNOTATION_VARIABLE]->(v:AnnotationVariable)
        RETURN elementId(v) AS nodeId
      ',
      '
        MATCH (v:AnnotationVariable) WHERE elementId(v) = nodeId
        DETACH DELETE v
      ',
      {
        batchSize: 5000,
        parallel: false,
        params: { datasetId: $datasetId, userId: $userId }
      }
    )
    YIELD failedBatches
    WITH failedBatches
    WHERE failedBatches = 0
    MATCH (d:Dataset { datasetID: $datasetId })<-[:HAS_DATASET]-(p:Project)-[:CREATED_BY]->(u:KeycloakUser { keycloakUserID: $userId })
    MATCH (d)-[:HAS_CURATED_ANNOTATION]->(ca:CuratedAnnotation)
    DETACH DELETE ca
  `;

  await runQuery(query, { datasetId, userId });
}

export async function deleteDataset(params: {
  input: { datasetId: string };
  userId: string;
}) {
  const { input, userId } = params;

  const hasRunsResult = await hasRuns(input.datasetId);
  if (hasRunsResult) {
    throw new Error("Cannot delete dataset with associated runs");
  }

  await deleteHeaders(input.datasetId, userId);
  await deleteProcessedDatasets(input.datasetId, userId);
  await deleteDatasetVariables(input.datasetId, userId);
  await deleteAnnotationVariables(input.datasetId, userId);

  const query: string = `
    MATCH (d:Dataset { datasetID: $datasetId })<-[:HAS_DATASET]-(p:Project)-[:CREATED_BY]->(u:KeycloakUser { keycloakUserID: $userId })
    WITH d
    MATCH (d)-[:HAS_FILE]->(u:Upload)
    DETACH DELETE u, d
    RETURN count(u) AS deletedUploads, count(d) AS deletedDatasets
  `;
  const records = await runQuery(query, { datasetId: input.datasetId, userId });
  return records.length > 0 && records[0].get("deletedDatasets").toNumber() > 0;
}

export async function isCurated(dataset: any) {
  const query: string = `RETURN exists((:Dataset { datasetID: $datasetId })-[:HAS_CURATED_DATASET]->(:CuratedDataset)) AS curated`;
  const records = await runQuery(query, { datasetId: dataset.id });
  return records[0].get("curated");
}

export async function isAnnotated(dataset: any) {
  const query: string = `RETURN exists((:Dataset { datasetID: $datasetId })-[:HAS_CURATED_ANNOTATION]->(:CuratedAnnotation)) AS annotated`;
  const records = await runQuery(query, { datasetId: dataset.id });
  return records[0].get("annotated");
}
