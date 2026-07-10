import {runQuery} from "../neo4j.ts";

export async function upsertKeycloakUser(params: { userId: string, name: string, email: string }) {
    const { userId, name, email } = params;
    const query = `
        MERGE (u:KeycloakUser {keycloakUserID: $userId})
        ON CREATE SET u.name = $name, u.email = $email
        ON MATCH SET u.name = coalesce($name, u.name), u.email = coalesce($email, u.email)
        RETURN u
     `
    const records = await runQuery(query, { userId, name, email });
    const userNode = records[0].get("u");
    return {
        id: userNode.properties.keycloakUserID,
        name: userNode.properties.name,
        email: userNode.properties.email,
    }
}

export async function checkIfUserExists(params: { email: string }) {
    const { email } = params;
    const query = `
        MATCH (u:KeycloakUser {email: $email})
        RETURN u
    `
    const records = await runQuery(query, { email });
    return records.length > 0;
}