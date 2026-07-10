import { runQuery } from "../neo4j.ts";
import { randomUUID } from "node:crypto";
import { makePresignedURL } from "./minio.ts";
import { getHeaderNodes } from "./header.ts";

function mapCuratedDatasetNode(node: any) {
  const props = node.properties;
  return {
    ...props,
    id: props.curatedDatasetID,
  };
}

export async function createCuratedDataset(params: {
  input: {
    datasetId: string;
    bucketName: string;
    objectName: string;
    delimiter: string;
  };
}) {
  const { input } = params;
  const query = `
        MATCH (d:Dataset { datasetID: $datasetId })
        CREATE (cd:CuratedDataset { curatedDatasetID: $curatedDatasetId })
        CREATE (d)-[:HAS_CURATED_DATASET]->(cd)
        RETURN cd
    `;
  const records = await runQuery(query, {
    datasetId: input.datasetId,
    curatedDatasetId: randomUUID(),
  });
  if (records.length === 0) {
    throw new Error("Dataset not found");
  }
  return mapCuratedDatasetNode(records[0].get("cd"));
}

export async function createCuratedDatasetVariables(
  curatedDatasetId: string,
  bucketName: string,
  objectName: string,
  delimiter: string,
) {
  const presignedURL = await makePresignedURL(bucketName, objectName);
  const internalDockerURL = presignedURL.replace('localhost', 'tigerdb-gateway');
  const headers = await getHeaderNodes(objectName);
  const query = `
        CALL apoc.periodic.iterate(
            'CALL apoc.load.csv($presignedURL, {sep: $selectedDelimiter}) YIELD list',
            'MATCH (b:CuratedDataset {curatedDatasetID: $curatedDatasetId}) 
            CREATE (a:DatasetVariable {datasetVariableID: apoc.create.uuid(), ${headers.map((header) => `${header.name.replace(/[^a-zA-Z0-9]/g, "")}: list[${header.index}]`).join(", ")} }), 
            (b)-[:HAS_DATASET_VARIABLE]->(a) 
            RETURN a',
            { batchSize: 10000, iterateList: true, parallel: true, params: { curatedDatasetId: $curatedDatasetId, presignedURL: $internalDockerURL, selectedDelimiter: $selectedDelimiter } }
        )
    `;
  await runQuery(query, {
    curatedDatasetId,
    internalDockerURL,
    selectedDelimiter: delimiter,
  });
}
