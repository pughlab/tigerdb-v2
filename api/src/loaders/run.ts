import DataLoader from "dataloader";
import { runQuery } from "../neo4j.ts";

async function sharedUserBatch(runIds: readonly string[]) {
    const query: string = `
      UNWIND $runIds AS runId
      OPTIONAL MATCH (r:Run { runID: runId })-[:SHARED_WITH]->(u:KeycloakUser)
      RETURN runId, collect(u) AS users
    `
    const records = await runQuery(query, { runIds });
    const userMap = new Map<string, any>();
    records.forEach(record => {
      const id = record.get("runId");
      const users = record.get("users");
      const mappedUsers = users.map((node: any) => ({
        id: node.properties.keycloakUserID,
        ...node.properties,
      }));
      userMap.set(id, mappedUsers);
    });
    return runIds.map(id => userMap.get(id) || []);
}

export const createRunSharedWithLoader = () => new DataLoader(sharedUserBatch);