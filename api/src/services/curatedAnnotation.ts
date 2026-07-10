import {runQuery} from "../neo4j.ts";
import {randomUUID} from "node:crypto";
import {makePresignedURL} from "./minio.ts";

function mapCuratedAnnotationNode(node: any) {
    const props = node.properties;
    return {
        ...props,
        id: node.properties.curatedAnnotationID
    }
}

export async function createCuratedAnnotation(params: {
    input: {
        datasetId: string;
        bucketName: string;
        objectName: string;
    }
}) {
    const { input } = params;
    const query = `
        MATCH (d:Dataset {datasetID: $datasetId})
        CREATE (ca:CuratedAnnotation { curatedAnnotationID: $curatedAnnotationId })
        CREATE (d)-[:HAS_CURATED_ANNOTATION]->(ca)
        RETURN ca
    `
    const records = await runQuery(query, {
        datasetId: input.datasetId,
        curatedAnnotationId: randomUUID(),
    });
    if (records.length === 0) {
        throw new Error("Dataset not found");
    }
    return mapCuratedAnnotationNode(records[0].get("ca"));
}

export async function createAnnotationVariables(curatedAnnotationId: string, bucketName: string, objectName: string) {
    const inputFields = [
        { name: 'cdr3b', index: 0 },
        { name: 'cdr3a', index: 1 },
        { name: 'trbv', index: 2 },
        { name: 'trav', index: 3 },
        { name: 'trbj', index: 4 },
        { name: 'traj', index: 5 },
        { name: 'mhc', index: 6 },
        { name: 'mhcClass', index: 7 },
        { name: 'epitopeAAseq', index: 8 },
        { name: 'epitopeGene', index: 9 },
        { name: 'mutation', index: 10 },
        { name: 'recognizesWTEpitope', index: 11 },
        { name: 'epitopeSpecies', index: 12 },
        { name: 'antigenClass', index: 13 },
        { name: 'reference', index: 14 },
        { name: 'uniProt', index: 15 },
        { name: 'notes', index: 16 },
    ];

    const query = `
        CALL apoc.periodic.iterate(
            'CALL apoc.load.csv($presignedURL, {sep: "\t", header: true}) YIELD list',
            'MATCH (b:CuratedAnnotation {curatedAnnotationID: $curatedAnnotationId}) 
            CREATE (a:AnnotationVariable {annotationVariableID: apoc.create.uuid(), ${inputFields.map(field => `${field.name}: list[${field.index}]`).join(', ')} }), 
            (b)-[:HAS_ANNOTATION_VARIABLE]->(a) 
            RETURN a',
            { batchSize: 10000, iterateList: true, parallel: true, params: { curatedAnnotationId: $curatedAnnotationId, presignedURL: $presignedURL, inputFields: $inputFields } }
        )
    `
    const presignedURL = await makePresignedURL(bucketName, objectName);
    const internalDockerURL = presignedURL.replace(
      "localhost",
      "tigerdb-gateway",
    );
    await runQuery(query, { curatedAnnotationId, presignedURL: internalDockerURL, inputFields });
}

export async function generateTags(curatedAnnotationId: string, datasetId: string) {
    const query = `
        MATCH (b:CuratedAnnotation {curatedAnnotationID: $curatedAnnotationId})-[:HAS_ANNOTATION_VARIABLE]->(a:AnnotationVariable)
        WHERE a.epitopeSpecies IS NOT NULL AND a.antigenClass IS NOT NULL
        WITH a, toLower(a.epitopeSpecies) AS rawSpecies, toLower(a.antigenClass) AS rawClass
        WITH a,
        CASE WHEN rawSpecies = 'human' THEN rawSpecies ELSE rawClass END AS tCategory,
        CASE WHEN rawSpecies = 'human' THEN rawClass ELSE rawSpecies END AS tName
        WHERE tName <> '' AND tName IS NOT NULL
        MATCH (d:Dataset {datasetID: $datasetId})
        MERGE (t:Tag {name: tName})
        ON CREATE SET t.category = tCategory
        ON MATCH SET t.category = tCategory
        MERGE (d)-[:HAS_TAG]->(t)
        MERGE (a)-[:HAS_TAG]->(t)
    `
    await runQuery(query, { curatedAnnotationId, datasetId })
}

export async function countEpitopes() {
    const query = `
        MATCH (a:AnnotationVariable)
        RETURN a.epitopeSpecies AS epitopeSpecies, count(a) AS count
        UNION ALL
        MATCH (n:DatasetVariable)
        RETURN "Unlabelled" AS epitopeSpecies, count(n) AS count
    `;
    const records = await runQuery(query);
    return records.map(record => ({
        epitopeSpecies: record.get("epitopeSpecies"),
        count: record.get("count").toInt()
    }));
}