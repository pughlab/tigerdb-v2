import * as React from "react";
import { Message } from "semantic-ui-react";
import DisplayTableFromPresignedURL from "../../common/table/DisplayTableFromPresignedURL.tsx";
import GliphGraph from "./graph/GliphGraph.tsx";

export default function ResultVisualization({
  runID,
  presignedURL,
  hasGliphResults,
  importGliph,
  importLoading,
  viewMode,
  updateSelectedNode,
}: Readonly<{
  runID: string;
  presignedURL?: string;
  hasGliphResults: boolean;
  importGliph: unknown;
  importLoading: boolean;
  viewMode: "table" | "graph";
  updateSelectedNode: React.Dispatch<
    React.SetStateAction<{
      id: string;
      label: string;
      source: string;
      v_gene: string;
      group: number | string;
    } | null>
  >;
}>) {
  if (!presignedURL) {
    return (
      <Message
        warning
        content="No presignedURL available for results preview."
      />
    );
  }

  if (viewMode === "table") {
    return <DisplayTableFromPresignedURL presignedURL={presignedURL} />;
  }

  return (
    <GliphGraph
      runID={runID}
      hasGliphResults={hasGliphResults}
      presignedURL={presignedURL}
      importGliph={importGliph}
      importLoading={importLoading}
      updateSelectedNode={updateSelectedNode}
    />
  );
}