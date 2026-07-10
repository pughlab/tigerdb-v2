import * as React from "react";
import { Button, ButtonOr, Dimmer, Grid, Header, Icon, Image, Message, Segment } from "semantic-ui-react";
import tigerdbLogo from "../../logos/tigerdb.png";
import Logs from "./Logs.tsx";
import TCRInfo from "./graph/TCRInfo.tsx";
import ResultVisualization from "./ResultVisualization.tsx";

export default function RunResults({
  status,
  presignedURL,
  runID,
  hasGliphResults,
  importGliph,
  importLoading,
}: Readonly<{
  status: string;
  presignedURL?: string;
  runID: string;
  hasGliphResults: boolean;
  importGliph: unknown;
  importLoading: boolean;
}>) {
  const [viewMode, setViewMode] = React.useState<"table" | "graph">("table");
  const [selectedNode, setSelectedNode] = React.useState<{
    id: string;
    label: string;
    source: string;
    v_gene: string;
    group: number | string;
  } | null>(null);

  if (!status?.trim()) return null;

  if (status === "submitted") {
    return (
      <Segment placeholder>
        <Image size="large" src={tigerdbLogo} centered />
        <Dimmer active inverted>
          <Logs />
        </Dimmer>
      </Segment>
    );
  }

  if (status === "completed") {
    return (
      <Segment placeholder>
        <Segment.Group>
          <Segment>
            <Grid columns={3}>
              <Grid.Column width={4} />
              <Grid.Column width={8} textAlign="center">
                <Header as="h3">
                  Viewing GLIPH2 clusters from{" "}
                  <span style={{ color: "#6434C9" }}>TIGERdb_cluster.csv</span>
                </Header>
              </Grid.Column>
              <Grid.Column width={4} textAlign="right">
                <Button.Group size="small" attached="top">
                  <Button
                    active={viewMode === "table"}
                    onClick={() => setViewMode("table")}
                    icon="table"
                    content="Table"
                    color={viewMode === "table" ? "violet" : undefined}
                  />
                  <ButtonOr />
                  <Button
                    active={viewMode === "graph"}
                    onClick={() => setViewMode("graph")}
                    icon="connectdevelop"
                    content="Graph"
                    color={viewMode === "graph" ? "teal" : undefined}
                  />
                </Button.Group>
              </Grid.Column>
            </Grid>
          </Segment>
          <ResultVisualization
            runID={runID}
            presignedURL={presignedURL}
            hasGliphResults={hasGliphResults}
            importGliph={importGliph}
            importLoading={importLoading}
            viewMode={viewMode}
            updateSelectedNode={setSelectedNode}
          />
          {selectedNode && <TCRInfo node={selectedNode} />}
        </Segment.Group>
        <Message color="green">
          <Header as="h3" icon>
            <Icon name="check circle" color="green" />
            RUN COMPLETED - READY TO DOWNLOAD
          </Header>
        </Message>
      </Segment>
    );
  }

  return null;
}