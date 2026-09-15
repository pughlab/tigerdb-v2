import React, {
  useState,
  useMemo,
} from "react";
import {
  Segment,
  Loader,
  Dimmer,
  Header,
  Message,
  Icon,
  Button,
} from "semantic-ui-react";
import useGliphGraphQuery from "../../../hooks/useGliphGraphQuery.ts";
import Graph from "./Graph.tsx";

export default function GraphWrapper({
  runID,
  presignedURL,
  hasGliphResults,
  importGliph,
  importLoading,
  updateSelectedNode,
}: Readonly<{
  runID: string;
  presignedURL: string;
  hasGliphResults: boolean;
  importGliph: any;
  importLoading: boolean;
  updateSelectedNode: React.Dispatch<React.SetStateAction<any>>;
}>) {
  const { data, loading, error, refetch } = useGliphGraphQuery(runID);
  const [hasData, setHasData] = useState(hasGliphResults);

  const graphData = useMemo(() => {
    if (data?.nodes && data?.links) {
      return ({
        nodes: data.nodes.map((n: any) => ({ ...n })),
        links: data.links.map((l: any) => ({ ...l })),
      })
    }
    return { nodes: [], links: [] }
  }, [data]);

  if (loading)
    return (
      <Segment placeholder basic style={{ height: "500px" }}>
        <Dimmer active inverted>
          <Loader size="large">Loading Graph...</Loader>
        </Dimmer>
      </Segment>
    );
  if (hasData && error)
    return <Message error content={`Error loading graph: ${error.message}`} />;

  if (!hasData) {
    return (
      <Segment placeholder style={{ height: "500px" }}>
        <Header icon>
          <Icon name="connectdevelop" />
          Click below to import GLIPH results for this run.
        </Header>
        <Button
          size="large"
          fluid
          color="teal"
          icon="eye"
          content="VISUALIZE GRAPH"
          disabled={!presignedURL}
          loading={importLoading}
          onClick={() => {
            if (importGliph && presignedURL) {
              console.log(`Importing from presignedURL: ${presignedURL}`);
              importGliph({
                variables: {
                  input: {
                    runId: runID,
                    presignedURL,
                  },
                },
              })
                .then(() => {
                  void refetch();
                  setHasData(true);
                })
                .catch((e: any) => console.error(e));
            }
          }}
        />
      </Segment>
    );
  }

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "6px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Graph data={graphData} onNodeClick={(node) => updateSelectedNode(node)} />
    </div>
  );
}
