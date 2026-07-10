import {
    buildGraphData, createTCREdges, createTCRNodes,
    dropGraph,
    getGraph,
    projectGraph, removeTemporaryClusters,
    runAlgorithms,
    setUpGraph,
    tearDown
} from "../../services/graph.ts";

export default {
    Query: {
        graph: async (
            _parent: unknown,
            args: { runId: string },
        )=> {
            const { runId } = args;
            const graphName = `run-${runId}-graph`;
            try {
                const graphIsSetup = await setUpGraph(runId);
                if (graphIsSetup) {
                    await projectGraph(graphName);
                    await runAlgorithms(graphName);
                    const records = await getGraph(graphName);
                    const { nodes, links } = buildGraphData(records);
                    return { nodes, links };
                }
                return {
                    nodes: [],
                    links: []
                }
            } finally {
                await dropGraph(graphName);
                await tearDown();
            }
        }
    },
    Mutation: {
        importResults: async (
            _parent: unknown,
            args: {
                input: {
                    runId: string;
                    presignedURL: string;
                }
            }
        ) => {
            const { runId, presignedURL } = args.input;
            try {
                await createTCRNodes(runId, presignedURL);
                await createTCREdges(runId);
                await removeTemporaryClusters(runId);
                return true;
            } catch {
                return false;
            }
        }
    },
    Graph: {
        nodes: (parent: any) => {
            return parent.nodes;
        },
        links: (parent: any) => {
            return parent.links;
        }
    }
}