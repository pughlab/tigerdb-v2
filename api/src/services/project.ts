import { randomUUID } from "node:crypto";
import { runQuery } from "../neo4j.ts";

function mapProjectNode(node: any) {
    const props = node.properties;
    return {
        ...props,
        id: props.projectID,
        public: props.isPublic,
    }
}

export async function countUnlabelledVariables() {
    const query = `
        MATCH (p:Project)
        OPTIONAL MATCH (p)-[:HAS_DATASET]->(d:Dataset)
        OPTIONAL MATCH (d)-[:HAS_CURATED_DATASET]->(c:CuratedDataset)
        OPTIONAL MATCH (c)-[:HAS_DATASET_VARIABLE]->(v:DatasetVariable)
        RETURN p.name AS name, count(v) AS varCount
    `;
    const records = await runQuery(query);
    return records.map((record: any) => ({
        name: record.get("name"),
        count: record.get("varCount").toInt(),
    }));
}

export async function createProject(params: { input: { name: string; description: string; reference?: boolean }, userId: string }) {
    const { input, userId } = params;
    const query: string = `
        MATCH (u:KeycloakUser {keycloakUserID: $userId})
        MERGE (p:Project { projectID: $projectID })
        ON CREATE SET
            p.name = $name,
            p.description = $description,
            p.isReference = $reference,
            p.isPublic = false,
            p.createdOn = datetime()
        MERGE (p)-[:CREATED_BY]->(u)
        RETURN p
    `

    const records = await runQuery(query, {
        userId,
        projectID: randomUUID(),
        name: input.name,
        description: input.description,
        reference: input.reference ?? false,
    });

    if (records.length === 0) {
        throw new Error("Failed to create project: user not found");
    }

    return mapProjectNode(records[0].get("p"));
}

export async function updateProject(params: { input: { id: string; name?: string; description?: string; reference?: boolean }, userId: string }) {
    const { input, userId } = params;
    const query: string = `
        MATCH (p:Project { projectID: $projectId })-[:CREATED_BY]->(u:KeycloakUser {keycloakUserID: $userId})
        SET 
            p.name = coalesce($name, p.name),
            p.description = coalesce($description, p.description),
            p.isReference = coalesce($reference, p.isReference)
        RETURN p
    `
    const records = await runQuery(query, {
        projectId: input.id,
        userId,
        name: input.name ?? null,
        description: input.description,
        reference: input.reference ?? false,
    })
    if (records.length === 0) {
        throw new Error("Failed to update project: user or project not found, or user is unauthorized");
    }

    return mapProjectNode(records[0].get("p"));
}

export async function deleteProject(params: { input: { id: string; }, userId: string, roles: string[]  }) {
    const { input, userId, roles } = params;
    const isAdmin = roles.includes("admin");
    let query: string = ""
    let records
    if (isAdmin) {
        query = `
            MATCH (p:Project { projectID: $projectId })
            DETACH DELETE p
            RETURN COUNT(p) AS deletedCount
        `
        records = await runQuery(query, { projectId: input.id });
    } else {
        query = `
            MATCH (p:Project { projectID: $projectId })-[:CREATED_BY]->(u:KeycloakUser {keycloakUserID: $userId})
            DETACH DELETE p
            RETURN COUNT(p) AS deletedCount
        `
        records = await runQuery(query, { projectId: input.id, userId });
    }
    if (records.length === 0) {
        throw new Error("Failed to delete project: user or project not found, or user is unauthorized");
    }
    const deletedCount = records[0].get("deletedCount").toInt();
    return deletedCount > 0;
}

export async function addDatasetsToProject(params: { input: { id: string; datasetIds: string[] } }) {
    const { id, datasetIds } = params.input;
    const query = `
        MATCH (p:Project {projectID: $projectId})
        UNWIND $datasetIds AS datasetId
        MATCH (d:Dataset {datasetID: datasetId})
        MERGE (p)-[:HAS_DATASET]->(d)
        RETURN p
    `
    const records = await runQuery(query, { projectId: id, datasetIds });
    if (records.length === 0) {
        throw new Error("Failed to add datasets to project");
    }
    return mapProjectNode(records[0].get("p"));
}

export async function shareProject(params: { input: { id: string; emails: string[] } }) {
    const { id, emails } = params.input;
    const query = `
        MATCH (p:Project {projectID: $projectId})
        UNWIND $emails AS email
        MATCH (u:KeycloakUser {email: email})
        MERGE (p)-[:SHARED_WITH]->(u)
        RETURN p
    `
    const records = await runQuery(query, { projectId: id, emails });
    if (records.length === 0) {
        throw new Error("Failed to share project");
    }
    return mapProjectNode(records[0].get("p"));
}

export async function stopSharing(params: { input: { id: string, email: string } }) {
    const { id, email } = params.input;
    const query = `
        MATCH (p:Project {projectID: $projectId})-[r:SHARED_WITH]->(u:KeycloakUser {email: $email})
        DELETE r
        RETURN p
    `
    const records = await runQuery(query, { projectId: id, email });
    if (records.length === 0) {
        throw new Error("Failed to stop sharing project");
    }
    return mapProjectNode(records[0].get("p"));
}