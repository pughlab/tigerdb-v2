import {
  createTCREdges,
  createTCRNodes,
  getGraph,
  getNodeDetails,
  projectGraph,
  removeTemporaryClusters,
  runAlgorithms,
  setUpGraph,
  tearDown,
} from "../../services/graph.ts";

export default {
  Query: {
    graph: async (
      _parent: unknown,
      args: {
        runId: string;
        options?: {
          minCommunitySize?: number;
          cdr3bContains?: string;
          maxNodes?: number;
        };
      },
    ) => {
      const { runId, options } = args;
      const graphName = `run-${runId}-graph`;
      try {
        const graphIsSetup = await setUpGraph(runId);
        if (graphIsSetup) {
          await projectGraph(graphName);
          await runAlgorithms(graphName);
          const { nodes, links } = await getGraph(graphName, options);
          return { nodes, links };
        }
        return {
          nodes: [],
          links: [],
        };
      } finally {
        await tearDown(graphName);
      }
    },
    node: async (_parent: unknown, args: { cdr3b: string }) => {
      const { cdr3b } = args;
      return await getNodeDetails(cdr3b);
    },
  },
  Mutation: {
    importResults: async (
      _parent: unknown,
      args: {
        input: {
          runId: string;
          presignedURL: string;
        };
      },
    ) => {
      const { runId, presignedURL } = args.input;
      const internalDockerURL = presignedURL.includes("localhost")
        ? presignedURL.replace("localhost", "tigerdb-gateway")
        : presignedURL;
      try {
        await createTCRNodes(runId, internalDockerURL);
        await createTCREdges(runId);
        await removeTemporaryClusters(runId);
        return true;
      } catch {
        return false;
      }
    },
  },
  Graph: {
    nodes: (parent: any) => {
      return parent.nodes;
    },
    links: (parent: any) => {
      return parent.links;
    },
  },
};
