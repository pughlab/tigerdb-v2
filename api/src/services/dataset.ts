import { randomUUID } from "node:crypto";
import { runQuery } from "../neo4j.ts";
import {minioClient} from "../minio.ts";

function mapDatasetNode(node: any) {
    const props = node.properties;
    return {
        ...props,
        id: props.datasetID
    }
}

export async function createDataset(params: { input: { projectId: string; name: string }; userId: string }) {
    const { input, userId } = params;
    const datasetId = randomUUID();
    const bucketName = `dataset-${datasetId}`;
    const datasetQuery: string = `
        MATCH (p:Project { projectID: $projectId })-[:CREATED_BY]->(u:KeycloakUser { keycloakUserID: $userId })
        CREATE (d:Dataset { datasetID: $datasetId, name: $name, createdOn: datetime(), bucketName: $bucketName })
        CREATE (p)-[:HAS_DATASET]->(d)
        RETURN d
    `
    const datasetRecords = await runQuery(datasetQuery, {
        datasetId,
        bucketName,
        projectId: input.projectId,
        name: input.name,
        userId
    });
    if (datasetRecords?.length === 0) {
        throw new Error("Project not found or user not authorized");
    }
    const datasetNode = datasetRecords[0].get("d");

    // attempt to create the bucket and rollback the created dataset if it fails
    try {
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            await minioClient.makeBucket(bucketName);
        }
        return mapDatasetNode(datasetNode);
    } catch (error) {
        console.error("Failed to create bucket, rolling back dataset creation...", error);
        const rollbackQuery = `
            MATCH (d:Dataset { datasetID: $datasetId })
            DETACH DELETE d 
        `;
        await runQuery(rollbackQuery, { datasetId }).catch(rollbackError => {
            console.error("Failed to rollback database", rollbackError);
        });

        throw new Error("Failed to create dataset storage");
    }
}

export async function updateDataset(params: { input: { datasetId: string; name: string }, userId: string }) {
    const { input, userId } = params;

    const query = `
        MATCH (d:Dataset { datasetID: $datasetId })<-[:HAS_DATASET]-(p:Project)-[:CREATED_BY]->(u:KeycloakUser { keycloakUserID: $userId })
        SET d.name = $name
        RETURN d
    `

    const records = await runQuery(query, { name: input.name, datasetId: input.datasetId, userId });

    if (records?.length === 0) {
        throw new Error("Dataset not found or user not authorized");
    }
    return mapDatasetNode(records[0].get("d"));
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