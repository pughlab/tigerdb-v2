import neo4j from "neo4j-driver";
import "dotenv/config";

export const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
);

export async function runQuery(query: string, parameters: object = {}) {
  const session = driver.session();
  try {
    const result = await session.run(query, parameters);
    return result.records;
  } catch (error) {
    console.error("Failed to run query", error);
    throw error;
  } finally {
    await session.close();
  }
}

export function toNeo4jInt(n: number) {
  return neo4j.int(n);
}
