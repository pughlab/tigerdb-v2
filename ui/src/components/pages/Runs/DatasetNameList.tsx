import { gql } from "@apollo/client";
import { useLazyQuery } from "@apollo/client/react";
import * as React from "react";
import { Label, Button, Icon } from "semantic-ui-react";

function DatasetNameTag({
  dataset,
  updateSelectedDatasets,
  updateAvailableUploads,
  projectSelected,
}) {
  const [selected, setSelected] = React.useState(projectSelected || false);
  const [getProcessedUploads] = useLazyQuery(
    gql`
      query processedDatasets($datasetID: ID!) {
        processedDatasets(
          where: { minioUpload: { dataset: { datasetID: $datasetID } } }
        ) {
          objectName
          bucketName
          filename
          minioUpload {
            dataset {
              datasetID
              name
            }
          }
        }
      }
    `,
    {
      fetchPolicy: "network-only",
    }
  );

  React.useEffect(() => {
    if (selected) {
      updateSelectedDatasets((prev) => [...prev, dataset]);
      getProcessedUploads({ variables: { datasetID: dataset.datasetID } })
        .then((response) => {
          if (response?.data && selected) {
            updateAvailableUploads((prev) => [
              ...prev,
              ...(response.data as { processedDatasets: unknown[] }).processedDatasets,
            ]);
          }
        });
    } else {
      updateSelectedDatasets((prev) =>
        prev.filter((item) => item.datasetID !== dataset.datasetID)
      );
      updateAvailableUploads((prev) =>
        prev.filter(
          (item) => item.minioUpload.dataset.datasetID !== dataset.datasetID
        )
      );
    }
  }, [dataset, getProcessedUploads, selected, updateAvailableUploads, updateSelectedDatasets]);

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
  updateAvailableUploads,
  projectSelected,
}) {
  const datasetIDs = new Set();
  const distinctDatasets = datasets.filter((dataset) => {
    if (!datasetIDs.has(dataset.datasetID)) {
      datasetIDs.add(dataset.datasetID);
      return true;
    }
    return false;
  });
  return (
    <Label.Group>
      {distinctDatasets.length > 0 ? (
        distinctDatasets.map((dataset) => (
          <DatasetNameTag
            key={dataset.datasetID}
            dataset={dataset}
            updateSelectedDatasets={updateSelectedDatasets}
            updateAvailableUploads={updateAvailableUploads}
            projectSelected={projectSelected}
          />
        ))
      ) : (
        <>No datasets available.</>
      )}
    </Label.Group>
  );
}
