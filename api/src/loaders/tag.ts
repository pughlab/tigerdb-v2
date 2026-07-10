import DataLoader from "dataloader";
import { runQuery } from "../neo4j.ts";

async function tagBatch(datasetIds: readonly string[]) {
    const query: string = `
        UNWIND $datasetIds AS datasetId
        OPTIONAL MATCH (d:Dataset { datasetID: datasetId })-[:HAS_TAG]->(t:Tag)
        RETURN datasetId, collect(t) AS tags
    `
    const records = await runQuery(query, { datasetIds });
    const tagMap = new Map<string, any>();
    records.forEach(record => {
        const id = record.get("datasetId");
        const tags = record.get("tags");
        const mappedTags = tags.map((node: any) => ({
            ...node.properties,
        }));
        tagMap.set(id, mappedTags);
    });
    return datasetIds.map(id => tagMap.get(id) || []);
}

export const createTagLoader = () => new DataLoader(tagBatch);