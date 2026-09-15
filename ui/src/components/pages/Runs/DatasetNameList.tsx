import * as React from "react";
import { Label, Button, Icon } from "semantic-ui-react";

function DatasetNameTag({
  dataset,
  updateSelectedDatasets,
  projectSelected,
}) {
  const [selected, setSelected] = React.useState(projectSelected || false);

  React.useEffect(() => {
    if (selected) {
      updateSelectedDatasets((prev) => [...prev, dataset]);
    } else {
      updateSelectedDatasets((prev) =>
        prev.filter((item) => item.id !== dataset.id)
      );
    }
  }, [dataset, selected,  updateSelectedDatasets]);

  return (
    <Label
      as={Button}
      color={selected ? "blue" : undefined}
      basic={!selected}
      onClick={(e) => {
        e.stopPropagation();
        setSelected(!selected);
      }}
    >
      <Icon name={selected ? "folder open" : "folder outline"} />
      {`${dataset.name}`}
    </Label>
  );
}

export default function DatasetNameList({
  datasets,
  updateSelectedDatasets,
  projectSelected,
}) {
  const datasetIDs = new Set();
  const distinctDatasets = datasets.filter((dataset) => {
    if (!datasetIDs.has(dataset.id)) {
      datasetIDs.add(dataset.id);
      return true;
    }
    return false;
  });
  return (
    <Label.Group>
      {distinctDatasets.length > 0 ? (
        distinctDatasets.map((dataset) => (
          <DatasetNameTag
            key={dataset.id}
            dataset={dataset}
            updateSelectedDatasets={updateSelectedDatasets}
            projectSelected={projectSelected}
          />
        ))
      ) : (
        <>No datasets available.</>
      )}
    </Label.Group>
  );
}
