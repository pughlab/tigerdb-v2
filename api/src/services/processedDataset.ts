import {runQuery} from "../neo4j.ts";

export async function createProcessedDatasetNode(properties: {
    objectName: string;
    bucketName: string;
    filename: string;
    data: any[];
    delimiter: string;
}) {
    const { objectName, bucketName, filename, data, delimiter } = properties;
    const query: string = `
        MERGE (p:ProcessedDataset {
            objectName: $objectName,
            bucketName: $bucketName,
            filename: $filename,
            rows: $rows,
            delimiter: $delimiter
        })
        ON CREATE SET
            p.createdAt = datetime()
        RETURN p
    `
    const records = await runQuery(query, {
        objectName,
        bucketName,
        filename,
        delimiter,
        rows: data.length
    })
    return records[0].get("p").properties;
}