import { runQuery, toNeo4jInt } from "../neo4j.ts";
import { listBucketObjects, makePresignedURL } from "./storage.ts";

const MINIMUM_COMMUNITY_SIZE = 4;
const colors: Record<string, string> = {
  pattern: "#ffffff",
  default: "#1f77b4",
  human: "#ff0000",
  chlamydiatrachomatis: "#32a852",
  enterobacteriaceaebacterium: "#265c34",
  "m.tuberculosis": "#199139",
  "s-pneumoniae": "#06c739",
  salmonellatyphimurium: "#033611",
  cef: "#FFF9C4",
  cmv: "#FFF176",
  ebv: "#FFEB3B",
  influenza: "#FDD835",
  denv: "#FBC02D",
  hbv: "#FDD835",
  hcv: "#FFD600",
  hpv: "#FBC02D",
  hsv: "#FFC107",
  htlv1: "#FFB300",
  mcpyv: "#EAB308",
  yfv: "#CA8A04",
};

async function checkGraphExists(graphName: string) {
  const query = `
    CALL gds.graph.exists($graphName) YIELD exists
    RETURN exists
  `;
  const records = await runQuery(query, { graphName });
  return records[0].get("exists");
}

async function dropGraph(graphName: string) {
  const query = `
    CALL gds.graph.drop($graphName) YIELD graphName
    RETURN graphName
  `;
  await runQuery(query, { graphName });
}

export async function getNodeDetails(cdr3b: string) {
  const query = `
    MATCH (p:Project)-->(d:Dataset)-->(:CuratedAnnotation)-->(v:AnnotationVariable {cdr3b: $cdr3b})
    RETURN p, d, v LIMIT 1
  `;
  const records = await runQuery(query, { cdr3b });
  if (records.length === 0) {
    return {
      projectID: "",
      projectName: "",
      datasetID: "",
      datasetName: "",
      variableID: "",
      cdr3b: cdr3b,
      v_gene: "",
      j_gene: "",
      trav: "",
      traj: "",
      mhc: null,
      mhcClass: null,
      epitopeGene: null,
      epitopeAAseq: null,
      epitopeSpecies: null,
      mutation: null,
      recognizesWTEpitope: null,
      uniProt: null,
      reference: null,
    };
  }
  const record = records[0];
  const project = record.get("p").properties;
  const dataset = record.get("d").properties;
  const variable = record.get("v").properties;
  return {
    projectID: project.projectID,
    projectName: project.name,
    datasetID: dataset.datasetID,
    datasetName: dataset.name,
    variableID: variable.annotationVariableID,
    cdr3b: variable.cdr3b,
    v_gene: variable.trbv,
    j_gene: variable.trbj,
    trav: variable.trav,
    traj: variable.traj,
    mhc: variable.mhc,
    mhcClass: variable.mhcClass,
    epitopeGene: variable.epitopeGene,
    epitopeAAseq: variable.epitopeAAseq,
    epitopeSpecies: variable.epitopeSpecies,
    mutation: variable.mutation,
    recognizesWTEpitope: variable.recognizesWTEpitope,
    uniProt: variable.uniProt,
    reference: variable.reference,
  };
}

export async function setUpGraph(runId: string) {
  const query = `
    CALL apoc.periodic.iterate(
      'MATCH (n:Run {runID: $runId})-[:HAS_RESULT]->(t:GliphTCR) RETURN t',
      'SET t:Projectable',
      {
        batchSize: 10000,
        parallel: false,
        params: { runId: $runId }
      }
    )
    YIELD total
    RETURN total AS nodesSet
  `;
  const records = await runQuery(query, { runId });
  if (records.length === 0) {
    throw new Error("There was an error setting up the graph");
  }
  return records[0].get("nodesSet").toInt() > 0;
}

export async function projectGraph(graphName: string) {
  const query = `
    CALL gds.graph.project(
      $graphName,
      'Projectable',
      {
        RELATED_TO: { 
          type: 'RELATED_TO',
          orientation: 'UNDIRECTED',
          aggregation: 'SINGLE'
        }
      }
    )
  `;
  await runQuery(query, { graphName });
}

export async function runAlgorithms(
  graphName: string,
  parameters: {
    theta?: number;
    gamma?: number;
    maxLevels?: number;
  } = {},
) {
  const defaultParameters = {
    theta: 0.01,
    gamma: 10,
    maxLevels: 20,
  };
  const cleanParameters = Object.fromEntries(
    Object.entries(parameters).filter(([_, v]) => v !== undefined),
  );
  const {
    theta,
    gamma,
    maxLevels,
  }: {
    theta?: number;
    gamma?: number;
    maxLevels?: number;
  } = { ...defaultParameters, ...cleanParameters };
  const leidenQuery: string = `
      CALL gds.leiden.mutate(
        $graphName, {
          theta: $theta,
          gamma: $gamma,
          maxLevels: $maxLevels,
          mutateProperty: 'communityId'
        }
      )
    `;
  const kcoreQuery: string = `
    CALL gds.kcore.mutate(
      $graphName,
      { mutateProperty: 'kcoreIndex' }
    )
  `;
  await runQuery(leidenQuery, {
    graphName,
    theta,
    gamma,
    maxLevels: toNeo4jInt(maxLevels),
  });
  await runQuery(kcoreQuery, { graphName });
}

async function getNodes(
  graphName: string,
  minCommunitySize: number = MINIMUM_COMMUNITY_SIZE,
  cdr3bContains?: string,
  maxNodes: number = 0,
) {
  const query = `
    CALL gds.graph.nodeProperties.stream($graphName, ['communityId', 'kcoreIndex'])
      YIELD nodeId, nodeProperty, propertyValue
      WITH nodeId,
        max(CASE WHEN nodeProperty = 'communityId' THEN propertyValue END) AS communityId,
        max(CASE WHEN nodeProperty = 'kcoreIndex' THEN propertyValue END) AS kcore
      WITH communityId, collect({nodeId: nodeId, kcore: kcore}) AS members
      WHERE size(members) >= $minCommunitySize
      UNWIND members AS member
      MATCH (n:GliphTCR) WHERE id(n) = member.nodeId
      AND ($cdr3bContains IS NULL OR $cdr3bContains = '' OR toLower(n.cdr3b) CONTAINS toLower($cdr3bContains))
      RETURN 
        id(n) AS id,
        n.source AS source,
        n.v_gene AS v_gene,
        n.j_gene AS j_gene,
        n.cdr3b AS label,
        n.hla_a AS hla_a,
        n.hla_b AS hla_b,
        n.hla_c AS hla_c,
        n.hla_dpa1 AS hla_dpa1,
        n.hla_dpb1 AS hla_dpb1,
        n.hla_dqa1 AS hla_dqa1,
        n.hla_dqb1 AS hla_dqb1,
        n.hla_drb1 AS hla_drb1,
        n.hla_drb3 AS hla_drb3,
        n.hla_drb4 AS hla_drb4,
        n.hla_drb5 AS hla_drb5,
        communityId AS group,
        member.kcore AS kcore
      ${maxNodes === 0 ? "" : "LIMIT $maxNodes"}
  `;
  return await runQuery(query, {
    graphName,
    minCommunitySize: toNeo4jInt(minCommunitySize),
    cdr3bContains: cdr3bContains || null,
    maxNodes: toNeo4jInt(maxNodes),
  });
}

async function getLinks(activeNodeIds: string[]) {
  if (activeNodeIds.length === 0) return [];

  const query = `
    UNWIND $activeNodeIds AS sourceId
    MATCH (n1:GliphTCR WHERE id(n1) = sourceId)-[:RELATED_TO]->(n2:GliphTCR)
    WHERE id(n2) IN $activeNodeIds
    RETURN DISTINCT id(n1) AS source, id(n2) AS target
  `;
  return await runQuery(query, { activeNodeIds });
}

export async function getGraph(
  graphName: string,
  options?: {
    minCommunitySize?: number;
    cdr3bContains?: string;
    maxNodes?: number;
  },
) {
  const nodeRecords = await getNodes(graphName, options?.minCommunitySize, options?.cdr3bContains, options?.maxNodes);
  const nodes = nodeRecords.map((record) => {
    const source = record.get("source");
    return {
      id: record.get("id"),
      source,
      v_gene: record.get("v_gene"),
      j_gene: record.get("j_gene"),
      group: record.get("group").toInt(),
      kcore: record.get("kcore").toInt(),
      label: record.get("label"),
      hla_a: record.get("hla_a"),
      hla_b: record.get("hla_b"),
      hla_c: record.get("hla_c"),
      hla_dpa1: record.get("hla_dpa1"),
      hla_dpb1: record.get("hla_dpb1"),
      hla_dqa1: record.get("hla_dqa1"),
      hla_dqb1: record.get("hla_dqb1"),
      hla_drb1: record.get("hla_drb1"),
      hla_drb3: record.get("hla_drb3"),
      hla_drb4: record.get("hla_drb4"),
      hla_drb5: record.get("hla_drb5"),
      color: colors[source?.toLowerCase()] || colors.default,
    };
  });
  const activeNodeIds = nodes.map((node) => node.id);
  const linkRecords = await getLinks(activeNodeIds);
  const links = linkRecords.map((record) => ({
    source: record.get("source"),
    target: record.get("target"),
  }));
  return { nodes, links };
}

export async function tearDown(graphName: string) {
  const graphExists = await checkGraphExists(graphName);
  if (graphExists) {
    await dropGraph(graphName);
  }
  const query = `
    CALL apoc.periodic.iterate(
      'MATCH (n:Projectable) RETURN n',
      'REMOVE n:Projectable',
      {
        batchSize: 10000,
        parallel: false,
        iterateList: true
      }
    )
  `;
  await runQuery(query);
}

export async function createTCRNodes(runId: string) {
  const bucketName: string = `run-${runId}`;
  const bucketObjects = await listBucketObjects(bucketName);
  const clusterFile = bucketObjects.find((obj) =>
    obj.Key?.includes("cluster.csv"),
  )?.Key;
  if (!clusterFile) {
    throw new Error(`Graph input file not found for run ${runId}`);
  }
  const presignedURL = await makePresignedURL(bucketName, clusterFile, { internal: true });
  const query: string = `
    CALL apoc.periodic.iterate(
      'CALL apoc.load.csv($presignedURL, {sep: ",", header: true, failOnError: false}) YIELD list WHERE list IS NOT NULL AND size(list) > 0 RETURN list',
      '
      WITH list 
      WHERE size(list) >= 17
      WITH list,
          list[11] as clusterId,
          list[1] as patternSeq,
          list[5] as score,
          list[4] as size,
          list[12] as cdr3,
          list[13] as vGene,
          list[14] as jGene,
          list[16] as sample,
          list[18] as hlaA,
          list[19] as hlaB,
          list[20] as hlaC,
          list[21] as hlaDPA1,
          list[22] as hlaDPB1,
          list[23] as hlaDQA1,
          list[24] as hlaDQB1,
          list[25] as hlaDRB1,
          list[26] as hlaDRB3,
          list[27] as hlaDRB4,
          list[28] as hlaDRB5
      WHERE clusterId IS NOT NULL AND cdr3 IS NOT NULL AND sample IS NOT NULL
      MERGE (t:GliphTCR {id: sample + "_" + cdr3})
      ON CREATE SET 
          t.cdr3b = cdr3,
          t.v_gene = vGene,
          t.j_gene = jGene,
          t.sample = sample,
          t.source = split(sample, ":")[0],
          t.hla_a = hlaA,
          t.hla_b = hlaB,
          t.hla_c = hlaC,
          t.hla_dpa1 = hlaDPA1,
          t.hla_dpb1 = hlaDPB1,
          t.hla_dqa1 = hlaDQA1,
          t.hla_dqb1 = hlaDQB1,
          t.hla_drb1 = hlaDRB1,
          t.hla_drb3 = hlaDRB3,
          t.hla_drb4 = hlaDRB4,
          t.hla_drb5 = hlaDRB5
      WITH t, clusterId
      MATCH (r:Run {runID: $runId})
      MERGE (r)-[:HAS_RESULT]->(t)
      MERGE (c:TempCluster {id: clusterId})
      MERGE (t)-[:TEMP_IN_CLUSTER {runID: $runId}]->(c)
      ',
      { 
        batchSize: 10000, 
        iterateList: true, 
        parallel: false, 
        retries: 3, 
        params: { presignedURL: $presignedURL, runId: $runId }
      }
    )
  `;
  await runQuery(query, {
    runId,
    presignedURL,
  });
}

export async function createTCREdges(runId: string) {
  const query: string = `
    CALL apoc.periodic.iterate(
      "
        MATCH (c:TempCluster)
        WHERE (c)<-[:TEMP_IN_CLUSTER {runID: $runId}]-()
        RETURN c
      ",
      "
        MATCH (c)<-[:TEMP_IN_CLUSTER {runID: $runId}]-(t:GliphTCR)
        WITH c, collect(t) AS tcrs
        WHERE size(tcrs) > 1
        UNWIND apoc.coll.combinations(tcrs, 2) AS pair
        WITH c,
          (CASE WHEN id(pair[0]) < id(pair[1]) THEN pair[0] ELSE pair[1] END) AS t1,
          (CASE WHEN id(pair[0]) < id(pair[1]) THEN pair[1] ELSE pair[0] END) AS t2
        MERGE (t1)-[rel:RELATED_TO]->(t2)
        ON CREATE SET rel.clusterIDs = [c.id]
        ON MATCH SET rel.clusterIDs = CASE
          WHEN c.id IN rel.clusterIDs THEN rel.clusterIDs
          ELSE rel.clusterIDs + c.id
        END
      ",
      {
        batchSize: 100,
        parallel: false,
        params: { runId: $runId }
      }
  )`;
  await runQuery(query, { runId });
}

export async function removeTemporaryClusters(runId: string) {
  const query: string = `
    CALL apoc.periodic.iterate(
      "MATCH (c:TempCluster)<-[r:TEMP_IN_CLUSTER {runID: $runId}]-() RETURN r, c",
      "DELETE r 
        WITH c WHERE NOT (c)<--()
        DELETE c
      ",
      { batchSize: 10000, parallel: false, params: { runId: $runId } }
    )
  `;
  await runQuery(query, { runId });
}
