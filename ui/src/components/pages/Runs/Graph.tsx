import {
  Cosmograph,
  type CosmographDataPrepConfig,
  CosmographProvider,
  prepareCosmographData,
  type CosmographConfig,
  type CosmographRef,
} from "@cosmograph/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { scaleOrdinal } from "d3-scale";
import { schemePaired } from "d3-scale-chromatic";

type GraphNode = {
  id: string;
  group?: string | number;
  color?: string;
  source?: string;
  [key: string]: string | number | undefined;
};

type GraphLink = {
  source: string;
  target: string;
  [key: string]: string | number | undefined;
};

const IGNORED_KEYS: Set<string> = new Set([
  "__typename",
  "color",
  "projectID",
  "datasetID",
  "variableID",
  "size",
  "value",
]);
const HLA_LOCI = [
  { key: "hla_a", value: "hla_a", text: "HLA-A" },
  { key: "hla_b", value: "hla_b", text: "HLA-B" },
  { key: "hla_c", value: "hla_c", text: "HLA-C" },
  { key: "hla_dpa1", value: "hla_dpa1", text: "HLA-DPA1" },
  { key: "hla_dpb1", value: "hla_dpb1", text: "HLA-DPB1" },
  { key: "hla_dqa1", value: "hla_dqa1", text: "HLA-DQA1" },
  { key: "hla_dqb1", value: "hla_dqb1", text: "HLA-DQB1" },
  { key: "hla_drb1", value: "hla_drb1", text: "HLA-DRB1" },
  { key: "hla_drb3", value: "hla_drb3", text: "HLA-DRB3" },
  { key: "hla_drb4", value: "hla_drb4", text: "HLA-DRB4" },
  { key: "hla_drb5", value: "hla_drb5", text: "HLA-DRB5" },
];

function nodeMatchesSearchTerm(node: any, searchTerm: string): boolean {
  const lower: string = searchTerm.toLowerCase();
  const filteredNode = Object.keys(node)
    .filter((key) => !IGNORED_KEYS.has(key))
    .reduce((obj, key) => {
      obj[key] = node[key];
      return obj;
    }, {} as any);
  return Object.values(filteredNode).some(
    (value) => typeof value === "string" && value.toLowerCase().includes(lower),
  );
}

function communityMatchesSearchTerm(
  values: GraphNode[],
  searchTerm: string,
): boolean {
  return values.some((value) => nodeMatchesSearchTerm(value, searchTerm));
}

function getHlaLabel(node: any, locus?: string): string {
  if (locus) {
    const val = node[locus];
    return val && val !== "NA" && val.trim() !== "" ? val : "Unknown";
  }
  const hlaFields = [
    "hla_a",
    "hla_b",
    "hla_c",
    "hla_dpa1",
    "hla_dpb1",
    "hla_dqa1",
    "hla_dqb1",
    "hla_drb1",
    "hla_drb3",
    "hla_drb4",
    "hla_drb5",
  ];
  const hlas = hlaFields
    .map((field) => node[field])
    .filter((val) => val && val !== "NA" && val.trim() !== "");
  return hlas.length > 0 ? hlas.join(", ") : "Unknown";
}

export default function Graph({
  data,
  onNodeClick,
}: Readonly<{
  data: { nodes: GraphNode[]; links: GraphLink[] };
  onNodeClick?: (node: any) => void;
}>) {
  const { nodes, links } = data;
  const cosmograph = useRef<CosmographRef>(null);
  const colorScale = useMemo(() => scaleOrdinal(schemePaired), []);
  const [is3D, setIs3D] = useState<boolean>(false);
  const [hiddenCommunityIds, setHiddenCommunityIds] = useState<
    Set<string | number>
  >(new Set());
  const [hiddenSourceIds, setHiddenSourceIds] = useState<Set<string>>(
    new Set(),
  );
  const [hiddenHLAs, setHiddenHLAs] = useState<Set<string>>(new Set());
  const [colorMode, setColorMode] = useState<"source" | "community" | "hla">(
    "community",
  );
  const [hlaLocus, setHlaLocus] = useState<string>("hla_a");
  const [minimumCommunitySize, setMinimumCommunitySize] = useState(0);
  const [filterMode, setFilterMode] = useState<"community" | "node">(
    "community",
  );
  const [searchText, setSearchText] = useState<string>("");

  const showAllCommunities = useCallback(() => {
    setHiddenCommunityIds(new Set());
  }, []);

  const showAllSources = useCallback(() => {
    setHiddenSourceIds(new Set());
  }, []);

  const showAllHLAs = useCallback(() => {
    setHiddenHLAs(new Set());
  }, []);

  const getComponentColor = useCallback((condition: boolean) => {
    return condition ? "teal" : "grey";
  }, []);

  const toggleCommunity = useCallback((communityId: string | number) => {
    setHiddenCommunityIds((prev) => {
      const next = new Set(prev);
      if (next.has(communityId)) {
        next.delete(communityId);
      } else {
        next.add(communityId);
      }
      return next;
    });
  }, []);

  const hideCommunity = useCallback((communityId: string | number) => {
    setHiddenCommunityIds((prev) => {
      const next = new Set(prev);
      next.add(communityId);
      return next;
    });
  }, []);

  const toggleSource = useCallback((sourceId: string) => {
    setHiddenSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });
  }, []);

  const toggleHLA = useCallback((hla: string) => {
    setHiddenHLAs((prev) => {
      const next = new Set(prev);
      if (next.has(hla)) {
        next.delete(hla);
      } else {
        next.add(hla);
      }
      return next;
    });
  }, []);

  const communities = useMemo(() => {
    const communitiesMap = new Map<string | number, GraphNode[]>();
    const communityIds = Array.from(
      new Set(nodes.map((node) => node.group)),
    ).filter((id) => id !== undefined && id !== null);
    communityIds.forEach((communityId) => {
      const points = nodes.filter((node) => node.group === communityId);
      communitiesMap.set(communityId, points);
    });
    return communitiesMap;
  }, [nodes]);

  const communityIdsBySize = useMemo(() => {
    const communitiesMap = new Map<number, (string | number)[]>();
    communities.forEach((nodes, communityId) => {
      if (!communitiesMap.has(nodes.length)) {
        communitiesMap.set(nodes.length, []);
      }
      communitiesMap.get(nodes.length)?.push(communityId);
    });
    return communitiesMap;
  }, [communities]);

  const largestCommunitySize = useMemo(() => {
    return Math.max(...Array.from(communityIdsBySize.keys()));
  }, [communityIdsBySize]);

  const smallestCommunitySize = useMemo(() => {
    return Math.min(...Array.from(communityIdsBySize.keys()));
  }, [communityIdsBySize]);

  const nodesBySource = useMemo(() => {
    const sourcesMap = new Map<string, GraphNode[]>();
    const sources = Array.from(new Set(nodes.map((node) => node.source)));
    sources.forEach((source) => {
      const points = nodes.filter((node) => node.source === source);
      sourcesMap.set(source as string, points);
    });
    return sourcesMap;
  }, [nodes]);

  const hideAllCommunities = useCallback(() => {
    setHiddenCommunityIds(new Set(communities.keys()));
  }, [communities]);

  const hideAllSources = useCallback(() => {
    setHiddenSourceIds(new Set(nodesBySource.keys()));
  }, [nodesBySource]);

  const sourceColors = useMemo(() => {
    const colors = new Map<string, string>();
    Array.from(nodesBySource.keys()).forEach((source) => {
      colors.set(source, nodesBySource.get(source)?.[0]?.color || "#ffffff");
    });
    return colors;
  }, [nodesBySource]);

  const visibleNodes = useMemo(() => {
    const initialNodes = nodes.filter(
      (node) =>
        !hiddenCommunityIds.has(node.group ?? "") &&
        (communities.get(node.group ?? "")?.length ?? 0) >=
          minimumCommunitySize &&
        !hiddenSourceIds.has(node.source || "") &&
        !hiddenHLAs.has(getHlaLabel(node, hlaLocus)),
    );
    if (searchText.trim() !== "" && filterMode === "node") {
      return initialNodes.filter((node) =>
        nodeMatchesSearchTerm(node, searchText),
      );
    }
    return initialNodes;
  }, [
    nodes,
    filterMode,
    searchText,
    hiddenCommunityIds,
    communities,
    minimumCommunitySize,
    hiddenSourceIds,
    hiddenHLAs,
    hlaLocus,
  ]);

  const visibleLinks = useMemo(() => {
    const visibleIds = new Set(visibleNodes.map((node) => node.id));
    return links.filter(
      (link) => visibleIds.has(link.source) && visibleIds.has(link.target),
    );
  }, [links, visibleNodes]);

  const getNodeColor = useCallback(
    (node: unknown): string => {
      switch (colorMode) {
        case "source":
          return (node as GraphNode).color || "#ffffff";
        case "community":
          return colorScale(String((node as GraphNode).group)) || "#ffffff";
        case "hla": {
          const hlaLabel: string = getHlaLabel(node, hlaLocus);
          return hlaLabel === "Unknown" ? "#ffffff" : colorScale(hlaLabel);
        }
        default:
          return "#ffffff";
      }
    },
    [colorMode, colorScale, hlaLocus],
  );

  const nodesByHLA = useMemo(() => {
    const hlaMap = new Map<string, GraphNode[]>();
    const hlas = Array.from(
      new Set(nodes.map((node) => getHlaLabel(node, hlaLocus))),
    );
    hlas.forEach((hla) => {
      const points = nodes.filter(
        (node) => getHlaLabel(node, hlaLocus) === hla,
      );
      hlaMap.set(hla, points);
    });
    return hlaMap;
  }, [nodes, hlaLocus]);

  const hideAllHLAs = useCallback(() => {
    setHiddenHLAs(new Set(nodesByHLA.keys()));
  }, [nodesByHLA]);

  const hlaColors = useMemo(() => {
    const colors = new Map<string, string>();
    Array.from(nodesByHLA.keys()).forEach((hla) => {
      colors.set(hla, hla === "Unknown" ? "#ffffff" : colorScale(hla));
    });
    return colors;
  }, [nodesByHLA, colorScale]);

  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const getPointColor = useCallback((id: string) => {
    const node = nodesById.get(id);
    return node ? getNodeColor(node) : "#ffffff";
  }, [nodesById, getNodeColor]);

  const [config, setConfig] = useState<CosmographConfig>({
    enableSimulation: true,
    pointSphereShading: true,
    pointDepthFade: 0,
    pointSizeStrategy: "degree",
    pointSizeRange: [6, 10],
    pointSizeScale: 1.5,
    linkOpacity: 0.15,
    simulationGravity: 0.25,
    simulationRepulsion: 1.5,
    simulationLinkSpring: 0.7,
    simulationLinkDistance: 60,
    simulationDecay: 5000,
    cameraFov: 45,
    enableDrag: true,
    selectPointOnClick: true,
    showClusterLabels: true,
    fitViewOnInit: true,
    fitViewDelay: 700,
    transitionDuration: 800,
    linkColorInterpolateFromEndpoints: true,
    simulationAlphaOnDrag: 0,
    pointSamplingDistance: 0,
    linkSamplingDistance: 0,
    pointOcclusionCulling: false,
    linkVisibilityDistanceRange: [0, 100000],
    preservePointPositionsOnDataUpdate: true,
  });

  useEffect(() => {
    const dataPrepConfig: CosmographDataPrepConfig = {
      points: {
        pointIdBy: "id",
        pointLabelBy: "label",
        pointClusterBy: "group",
      },
      links: {
        linkSourceBy: "source",
        linkTargetsBy: ["target"],
      },
    };
    prepareCosmographData(dataPrepConfig, visibleNodes, visibleLinks).then(
      (result) => {
        if (result) {
          const { points, links: graphLinks, cosmographConfig } = result;
          setConfig((prevConfig) => ({
            ...prevConfig,
            ...cosmographConfig,
            points,
            links: graphLinks,
          }));
        }
      },
    );
  }, [visibleNodes, visibleLinks]);

  useEffect(() => {
    if (filterMode === "community" && searchText.trim() !== "") {
      Array.from(communities.entries()).forEach(([key, value]) => {
        if (!communityMatchesSearchTerm(value, searchText)) {
          hideCommunity(key);
        }
      });
    }
  }, [communities, filterMode, hideCommunity, searchText]);

  function updateDimensions(nextIs3D: boolean): void {
    if (nextIs3D === is3D) return;
    setIs3D(nextIs3D);
    cosmograph.current?.fitView();
  }

  return (
    <CosmographProvider>
      <div
        style={{
          width: "100%",
          height: "100vh",
          backgroundColor: "#000000",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            color: "#ffffff",
            fontSize: "1rem",
            fontWeight: "bold",
            zIndex: 1,
          }}
        >
          GLIPH Graph
        </div>
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 48,
            display: "flex",
            gap: 8,
            zIndex: 1,
          }}
        >
          <span style={{ color: "#ffffff", fontSize: "0.9rem" }}>
            Colour by
          </span>
          <button
            type={"button"}
            aria-pressed={colorMode === "community"}
            style={{
              backgroundColor: getComponentColor(colorMode === "community"),
              fontSize: "0.9rem",
              fontWeight: "bold",
            }}
            onClick={() => setColorMode("community")}
          >
            Community
          </button>
          <button
            type={"button"}
            aria-pressed={colorMode === "source"}
            style={{
              backgroundColor: getComponentColor(colorMode === "source"),
              fontSize: "0.9rem",
              fontWeight: "bold",
            }}
            onClick={() => setColorMode("source")}
          >
            Source
          </button>
          <button
            type={"button"}
            aria-pressed={colorMode === "hla"}
            style={{
              backgroundColor: getComponentColor(colorMode === "hla"),
              fontSize: "0.9rem",
              fontWeight: "bold",
            }}
            onClick={() => setColorMode("hla")}
          >
            HLA
          </button>
          {colorMode === "hla" && (
            <select>
              {HLA_LOCI.map((locus) => (
                <option
                  key={locus.key}
                  value={locus.value}
                  onChange={(e) => setHlaLocus(e.target.value)}
                >
                  {locus.text}
                </option>
              ))}
            </select>
          )}
        </div>
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 84,
            zIndex: 1,
            width: "255px",
            height: "360px",
            padding: "10px",
            borderRadius: "6px",
            color: "#000000",
            fontSize: "0.8rem",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            overflowY: "auto",
            textAlign: "left",
          }}
        >
          {colorMode === "community" && (
            <>
              <h3 style={{ marginTop: "0", marginBottom: "0" }}>
                {communities.size} communities
              </h3>
              <div
                style={{ top: 0, marginTop: 2, display: "flex", gap: "4px" }}
              >
                <button
                  type={"button"}
                  style={{
                    backgroundColor: "teal",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    marginBottom: "10px",
                  }}
                  onClick={() => hideAllCommunities()}
                >
                  Hide all
                </button>
                <button
                  type={"button"}
                  style={{
                    backgroundColor: "teal",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    marginBottom: "10px",
                  }}
                  onClick={() => showAllCommunities()}
                >
                  Show all
                </button>
              </div>
              {Array.from(communities.keys())
                .sort(
                  (a, b) =>
                    (communities.get(b)?.length || 0) -
                    (communities.get(a)?.length || 0),
                )
                .map((id) => {
                  const numberOfNodes = communities.get(id)?.length || 0;
                  return (
                    <button
                      type="button"
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "4px",
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: 0,
                        width: "100%",
                        textAlign: "left",
                      }}
                      onClick={() => toggleCommunity(id)}
                    >
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          backgroundColor: colorScale(id.toString()),
                          marginRight: "10px",
                          borderRadius: "50%",
                        }}
                      />
                      <div
                        style={{
                          textDecoration:
                            hiddenCommunityIds.has(id) ||
                            (communities.get(id)?.length ?? 0) <
                              minimumCommunitySize
                              ? "line-through"
                              : "none",
                        }}
                      >
                        Community {id} ({numberOfNodes}{" "}
                        {numberOfNodes === 1 ? "node" : "nodes"})
                      </div>
                    </button>
                  );
                })}
            </>
          )}
          {colorMode === "source" && (
            <>
              <h3 style={{ marginTop: "0", marginBottom: "0" }}>
                {nodesBySource.size} sources
              </h3>
              <div
                style={{ top: 0, marginTop: 2, display: "flex", gap: "4px" }}
              >
                <button
                  type={"button"}
                  style={{
                    backgroundColor: "teal",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    marginBottom: "10px",
                  }}
                  onClick={() => hideAllSources()}
                >
                  Hide all
                </button>
                <button
                  type={"button"}
                  style={{
                    backgroundColor: "teal",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    marginBottom: "10px",
                  }}
                  onClick={() => showAllSources()}
                >
                  Show all
                </button>
              </div>
              {Array.from(nodesBySource.keys())
                .sort(
                  (a, b) =>
                    (nodesBySource.get(b)?.length || 0) -
                    (nodesBySource.get(a)?.length || 0),
                )
                .map((source) => {
                  const numberOfNodes = nodesBySource.get(source)?.length || 0;
                  return (
                    <button
                      type="button"
                      key={source}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "4px",
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: 0,
                        width: "100%",
                        textAlign: "left",
                      }}
                      onClick={() => toggleSource(source)}
                    >
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          backgroundColor: sourceColors.get(source),
                          marginRight: "10px",
                          borderRadius: "50%",
                        }}
                      />
                      <div
                        style={{
                          textDecoration: hiddenSourceIds.has(source)
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {source} ({numberOfNodes}{" "}
                        {numberOfNodes === 1 ? "node" : "nodes"})
                      </div>
                    </button>
                  );
                })}
            </>
          )}
          {colorMode === "hla" && (
            <>
              <h3 style={{ marginTop: "0", marginBottom: "0" }}>
                {nodesByHLA.size} HLAs
              </h3>
              <div
                style={{ top: 0, marginTop: 2, display: "flex", gap: "4px" }}
              >
                <button
                  type={"button"}
                  style={{
                    backgroundColor: "teal",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    marginBottom: "10px",
                  }}
                  onClick={() => hideAllHLAs()}
                >
                  Hide all
                </button>
                <button
                  type={"button"}
                  style={{
                    backgroundColor: "teal",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    marginBottom: "10px",
                  }}
                  onClick={() => showAllHLAs()}
                >
                  Show all
                </button>
              </div>
              {Array.from(nodesByHLA.keys())
                .sort(
                  (a, b) =>
                    (nodesByHLA.get(b)?.length || 0) -
                    (nodesByHLA.get(a)?.length || 0),
                )
                .map((hla, index) => {
                  const numberOfNodes = nodesByHLA.get(hla)?.length || 0;
                  return (
                    <button
                      type="button"
                      key={hla}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "4px",
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: 0,
                        width: "100%",
                        textAlign: "left",
                      }}
                      onClick={() => toggleHLA(hla)}
                    >
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          backgroundColor: hlaColors.get(hla),
                          marginRight: "10px",
                          borderRadius: "50%",
                        }}
                      />
                      <div
                        style={{
                          textDecoration: hiddenHLAs.has(hla)
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {hla} ({numberOfNodes}{" "}
                        {numberOfNodes === 1 ? "node" : "nodes"})
                      </div>
                    </button>
                  );
                })}
            </>
          )}
        </div>
        <div
          style={{
            position: "absolute",
            right: 12,
            bottom: 30,
            zIndex: 1,
            backgroundColor: "rgba(255,255,255,0.8)",
            borderRadius: "6px",
            color: "#000000",
            fontSize: "0.8rem",
            padding: "6px",
            textAlign: "left",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: "bold" }}>
            Filters
          </h3>
          <div style={{ display: "flex", alignItems: "left", gap: "4px" }}>
            <span>Minimum Community Size: </span>
            <input
              type={"range"}
              min={smallestCommunitySize}
              max={largestCommunitySize}
              placeholder={"Minimum Community Size"}
              value={minimumCommunitySize}
              onChange={(e) => setMinimumCommunitySize(e.target.value)}
            />
            <span>{Math.max(minimumCommunitySize, smallestCommunitySize)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "left", gap: "4px" }}>
            <span>Filter mode: </span>
            <button
              type={"button"}
              aria-pressed={filterMode === "community"}
              style={{
                backgroundColor: filterMode === "community" ? "teal" : "grey",
                fontSize: "0.8rem",
                fontWeight: "bold",
              }}
              onClick={() => setFilterMode("community")}
            >
              Community
            </button>
            <button
              type={"button"}
              aria-pressed={filterMode === "node"}
              style={{
                backgroundColor: filterMode === "node" ? "teal" : "grey",
                fontSize: "0.8rem",
                fontWeight: "bold",
              }}
              onClick={() => setFilterMode("node")}
            >
              Node
            </button>
          </div>
          <div style={{ margin: "inherit", paddingRight: "5px" }}>
            <input
              type={"text"}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={"Search..."}
              style={{
                color: "#000000",
                backgroundColor: "#ffffff",
                width: "100%",
              }}
            />
          </div>
        </div>
        {visibleNodes.length > 0 ? (
          <Cosmograph
            key={is3D ? "3d-mode" : "2d-mode"}
            ref={cosmograph}
            spaceDimensions={is3D ? 3 : 2}
            pointZBy={is3D ? "z" : undefined}
            onPointClick={
              onNodeClick !== undefined
                ? (index) => {
                    const nodeData = visibleNodes[index];
                    onNodeClick(nodeData);
                  }
                : undefined
            }
            {...config}
            pointColorBy={"id"}
            pointColorByFn={getPointColor}
          />
        ) : (
          <div
            style={{
              display: "flex",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            All nodes are hidden
          </div>
        )}
        <div
          style={{
            position: "absolute",
            right: 12,
            top: 12,
            display: "flex",
            gap: 8,
          }}
        >
          <button
            type={"button"}
            aria-pressed={!is3D}
            style={{
              backgroundColor: !is3D ? "teal" : "grey",
              fontSize: "1rem",
              fontWeight: "bold",
            }}
            onClick={() => updateDimensions(false)}
          >
            2D
          </button>
          <button
            type={"button"}
            aria-pressed={is3D}
            style={{
              backgroundColor: is3D ? "teal" : "gray",
              fontSize: "1rem",
              fontWeight: "bold",
            }}
            onClick={() => updateDimensions(true)}
          >
            3D
          </button>
        </div>
      </div>
    </CosmographProvider>
  );
}
