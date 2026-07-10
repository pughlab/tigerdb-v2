import {runQuery, toNeo4jInt} from "../neo4j.ts";

const MINIMUM_COMMUNITY_SIZE = 4;

export async function setUpGraph(runId: string) {
    const query = `
        MATCH (n:Run {runID: $runId})-[:HAS_RESULT]->(t:GliphTCR)
        SET t:Projectable
        RETURN count(t) AS nodesSet
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
                RELATED_TO: { orientation: 'UNDIRECTED' }
            }
        )
    `;
    await runQuery(query, { graphName });
}

export async function runAlgorithms(graphName: string, parameters: {
    theta?: number;
    gamma?: number;
    maxLevels?: number;
} = {}) {
    const defaultParameters = {
        theta: 0.01,
        gamma: 10,
        maxLevels: 20,
    };
    const cleanParameters = Object.fromEntries(
        Object.entries(parameters).filter(([_, v]) => v !== undefined)
    )
    const { theta, gamma, maxLevels }: {
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
    await runQuery(leidenQuery, { graphName, theta, gamma, maxLevels: toNeo4jInt(maxLevels) });
    await runQuery(kcoreQuery, { graphName });
}

export async function getGraph(graphName: string) {
    const query = `
        CALL gds.graph.nodeProperties.stream($graphName, ['communityId', 'kcoreIndex'])
        YIELD nodeId, nodeProperty, propertyValue
        WITH nodeId,
            max(CASE WHEN nodeProperty = 'communityId' THEN propertyValue END) AS communityId,
            max(CASE WHEN nodeProperty = 'kcoreIndex' THEN propertyValue END) AS kcore
        WHERE kcore >= $kcoreValue
        MATCH (n) WHERE id(n) = nodeId
        OPTIONAL MATCH (n)-[:RELATED_TO]-(target)
        RETURN 
            n.id AS id,
            n.source AS source,
            n.v_gene AS v_gene,
            n.cdr3b AS label,
            communityId AS group,
            kcore,
            collect(target.id) AS targetIds
    `
    return await runQuery(query, { graphName, kcoreValue: toNeo4jInt(MINIMUM_COMMUNITY_SIZE - 1) });
}

export async function dropGraph(graphName: string) {
    const query = `
        CALL gds.graph.exists($graphName) YIELD exists
        WITH exists WHERE exists
        CALL gds.graph.drop($graphName) YIELD graphName
        RETURN graphName
    `
    await runQuery(query, { graphName });
}

export async function tearDown() {
    const query = "MATCH (n:Projectable) REMOVE n:Projectable";
    await runQuery(query);
}

export function buildGraphData(records: any[]) {
    const colors: Record<string, string> = {
        pattern: '#ffffff',
        default: '#1f77b4',
        'human': '#ff0000',
        'chlamydiatrachomatis': '#32a852',
        'enterobacteriaceaebacterium': '#265c34',
        'm.tuberculosis': '#199139',
        's-pneumoniae': '#06c739',
        'salmonellatyphimurium': '#033611',
        'cef': '#FFF9C4',
        'cmv': '#FFF176',
        'ebv': '#FFEB3B',
        'influenza': '#FDD835',
        'denv': '#FBC02D',
        'hbv': '#FDD835',
        'hcv': '#FFD600',
        'hpv': '#FBC02D',
        'hsv': '#FFC107',
        'htlv1': '#FFB300',
        'mcpyv': '#EAB308',
        'yfv': '#CA8A04'
    }
    const nodes: any[] = [];
    const links: any[] = [];
    const validNodeIds: Set<string> = new Set<string>();
    records.forEach((record: any) => {
        const id: string = record.get('id');
        const source: string = record.get('source');

        validNodeIds.add(id);

        nodes.push({
            id,
            source,
            v_gene: record.get('v_gene'),
            group: record.get('group').toInt(),
            kcore: record.get('kcore').toInt(),
            label: record.get('label'),
            color: colors[source?.toLowerCase()] || colors.default,
        });
    });
    records.forEach((record: any) => {
        const sourceId: string = record.get("id");
        const tcrSource: string = record.get("source");
        const group: number = record.get("group").toInt();
        const targetIds: string[] = record.get("targetIds");

        targetIds.forEach((id: string) => {
            if (id && validNodeIds.has(id) && sourceId < id) {
                links.push({
                    source: sourceId,
                    target: id,
                    group,
                    color: colors[tcrSource?.toLowerCase()] || colors.default,
                });
            }
        })
    });
    return { nodes, links };
}

export async function createTCRNodes(runId: string, presignedURL: string) {
    const query: string = `
        CALL apoc.periodic.iterate(
            'CALL apoc.load.csv($presignedURL, {sep: ",", header: true, failOnError: false}) YIELD list WHERE list IS NOT NULL AND size(list) > 0 RETURN list',
            '
                WITH list 
                WHERE size(list) >= 17
                WITH list[11] as clusterId,
                    list[12] as cdr3,
                    list[13] as vGene,
                    list[14] as jGene,
                    list[16] as sample
                WHERE clusterId IS NOT NULL AND cdr3 IS NOT NULL AND sample IS NOT NULL
                MERGE (t:GliphTCR {id: sample + "_" + cdr3})
                ON CREATE SET 
                    t.cdr3b = cdr3,
                    t.v_gene = vGene,
                    t.j_gene = jGene,
                    t.sample = sample,
                    t.source = split(sample, ":")[0]
    
                WITH t, clusterId
                MATCH (r:Run {runID: $runId})
                MERGE (r)-[:HAS_RESULT]->(t)
                MERGE (c:TempCluster {id: clusterId + "_" + $runId})
                ON CREATE SET c.runID = $runId, c.clusterId = clusterId
                MERGE (t)-[:TEMP_IN_CLUSTER]->(c)
            ',
            { 
                batchSize: 5000, 
                iterateList: true, 
                parallel: false,
                retries: 3, 
                params: { presignedURL: $presignedURL, runId: $runId } 
            }
        )
    `;
    await runQuery(query, {
        runId,
        presignedURL
    });
}

export async function createTCREdges(runId: string) {
    const query: string = `
        CALL apoc.periodic.iterate(
            "MATCH (c:TempCluster {runID: $runId}) RETURN c",
            "MATCH (t1:GliphTCR)-[:TEMP_IN_CLUSTER]->(c)<-[:TEMP_IN_CLUSTER]-(t2:GliphTCR)
                WHERE id(t1) < id(t2)
                WITH t1, t2, collect(DISTINCT c.clusterId) AS clusterIDs
                MERGE (t1)-[rel:RELATED_TO]-(t2)
                SET rel.clusterIDs = apoc.coll.toSet(coalesce(rel.clusterIDs, []) + clusterIDs)",
            { batchSize: 50, parallel: false, params: { runId: $runId } }
        ) 
        YIELD batches, total, errorMessages
        RETURN batches, total, errorMessages
    `;
    await runQuery(query, { runId });
}

export async function removeTemporaryClusters(runId: string) {
    const query: string = `
        CALL apoc.periodic.iterate(
            "MATCH (c:TempCluster {runID: $runId}) RETURN c",
            "DETACH DELETE c",
            { batchSize: 1000, parallel: false, params: { runID: $runId } }
        )
    `;
    await runQuery(query, { runId });
}