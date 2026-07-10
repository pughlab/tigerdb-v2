import { runQuery } from "../neo4j.ts";

function mapTagNode(node: any) {
    const props = node.properties;
    return {
        ...props
    }
}

export async function upsertTag(params: { input: { name: string; category: string } }) {
    const { input } = params;
    const query: string = `
        MERGE (t:Tag { name: $name })
        ON CREATE SET 
            t.category = $category
        RETURN t
    `

    const records = await runQuery(query, {
        name: input.name,
        category: input.category,
    })

    return mapTagNode(records[0].get("t"));
}

export async function addTagToDataset(params: { input: { name: string; datasetId: string } }) {
    const { input } = params;
    const query: string = `
        MATCH (d:Dataset { datasetID: $datasetId })
        MATCH (t:Tag { name: $name })
        MERGE (d)-[:HAS_TAG]->(t)
        RETURN t
    `
    const records = await runQuery(query, {
        name: input.name,
        datasetId: input.datasetId
    });

    if (records.length === 0) {
        throw new Error("Dataset or tag not found");
    }

    return mapTagNode(records[0].get("t"));
}

export async function removeTagFromDataset(params: { input: { name: string; datasetId: string } }) {
    const { input } = params;
    const query: string = `
        MATCH (d:Dataset { datasetID: $datasetId })-[r:HAS_TAG]->(t:Tag { name: $name })
        DELETE r
        RETURN t
    `

    const records = await runQuery(query, {
        name: input.name,
        datasetId: input.datasetId
    });

    if (records.length === 0) {
        throw new Error("Dataset or tag not found");
    }

    return mapTagNode(records[0].get("t"));
}

export async function deleteTag(params: { name: string }) {
    const { name } = params;

    const checkQuery: string = `
        MATCH (t:Tag { name: $name })<-[:HAS_TAG]-(:Dataset)
        RETURN t
    `
    const checkRecords = await runQuery(checkQuery, { name });
    if (checkRecords.length > 0) {
        throw new Error("This tag is associated to at least one dataset.");
    }

    const deleteQuery: string = `
        MATCH (t:Tag { name: $name })
        DELETE t
        RETURN t
    `
    const records = await runQuery(deleteQuery, { name });
    if (records.length === 0) {
        throw new Error("Tag not found");
    }
    return name;
}