import DataLoader from "dataloader";
import { runQuery } from "../neo4j.ts";

async function sharedWithBatch(projectIds: readonly string[]) {
    const query: string = `
        UNWIND $projectIds AS projectId
        OPTIONAL MATCH (p:Project { projectID: projectId })-[:SHARED_WITH]->(u:KeycloakUser)
        RETURN projectId, collect(u) AS users
    `
    const records = await runQuery(query, { projectIds });
    const sharedWithMap = new Map<string, any>();
    records.forEach((record) => {
        const id = record.get("projectId");
        const users = record.get("users") || [];
        const mappedUsers = users.map((node:any) => ({
            id: node.properties.keycloakUserID,
            name: node.properties.name,
            email: node.properties.email,
        }));
        sharedWithMap.set(id, mappedUsers);
    })
    return projectIds.map(id => sharedWithMap.get(id) || []);
}

export const createSharedWithLoader = () => new DataLoader(sharedWithBatch);