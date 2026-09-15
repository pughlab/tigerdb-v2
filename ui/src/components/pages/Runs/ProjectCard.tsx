import React, { useState, useMemo } from 'react';
import DatasetNameList from "./DatasetNameList";
import ProcessedUploadsList from "./ProcessedUploadsList";
import { DatasetReadonlyTag } from "../Datasets/DatasetTag";
import { Button, Card, Header, Icon, Label, Popup, Divider } from "semantic-ui-react";

export function ProjectCard({
  project,
  updateSelectedUploads,
  selectedProjectIDs,
  toggleProjectID,
  selectedAll,
}) {
  const color: "black" | "facebook" = project.public ? "black" : "facebook";
  const selected = selectedAll || selectedProjectIDs.includes(project.id);
  const [selectedDatasets, setSelectedDatasets] = useState([]);

  const allUploads: any[] = useMemo(() => {
    return [];
  }, []);
  let allTags: any[] = [];
  const seenTagNames = new Set();

  const availableUploads = useMemo(() => {
    const newUploads = [];
    selectedDatasets.forEach((dataset: any) => {
      dataset.uploads?.forEach((upload: any) => {
        if (upload.processedDataset) {
          newUploads.push(upload.processedDataset);
        }
      });
    });
    return newUploads;
  }, [selectedDatasets]);

  React.useEffect(() => {
    if (selected) {
      updateSelectedUploads((prev) => [...prev, ...allUploads]);
    } else {
      updateSelectedUploads((prev) =>
        prev.filter((upload) => !allUploads.includes(upload)),
      );
    }
  }, [allUploads, selected, updateSelectedUploads]);

  const datasets = project.datasets;
  datasets.forEach((dataset) => {
    const uniqueTags = dataset.tags?.filter((tag) => {
      if (seenTagNames.has(tag.name)) {
        return false;
      }
      seenTagNames.add(tag.name);
      return true;
    });
    allTags = [...allTags, ...uniqueTags];
    dataset.uploads?.forEach((upload) => {
      if (project.reference) {
        allUploads.push(upload);
      } else if (upload.processedDataset) {
        allUploads.push(upload.processedDataset);
      }
    });
  });

  return (
    <Card
      key={`card-${project.id}`}
      link
      //@ts-ignore
      color={color}
      onClick={() => {
        toggleProjectID(project.id);
      }}
    >
      <Popup
        size="large"
        wide="very"
        inverted
        position="top center"
        trigger={
          <Button attached="top" color={color} basic={!selected}>
            <Icon
              name={selected ? "folder open" : "folder outline"}
              size="large"
            />
          </Button>
        }
      >
        {project.public ? "Public" : "Private"} project
      </Popup>
      <Card.Content extra>
        <Header size="small">
          <Header.Content>{project.name}</Header.Content>
        </Header>
      </Card.Content>
      <Card.Content>
        <Label.Group>
          <Label
            as={Button}
            //@ts-ignore
            color={color}
            content={
              <Icon
                style={{ margin: 0 }}
                name={project.isPublic ? "lock open" : "lock"}
              />
            }
            detail={project.isPublic ? "Public" : "Private"}
          />
          <Label
            content={<Icon style={{ margin: 0 }} name="user" />}
            detail={project.createdBy.name}
          />
        </Label.Group>
        {project.reference ? (
          <React.Fragment key="reference-data">
            <Divider horizontal content="Datasets" />
            {datasets.length > 0
              ? datasets.map((dataset) => (
                  <Label key={`reference-dataset-${dataset.id}`}>
                    {dataset.name}
                  </Label>
                ))
              : "No datasets available."}
            {allTags.length > 0 && (
              <Divider horizontal content="Dataset tags" />
            )}
            {allTags.map((tag) => (
              <DatasetReadonlyTag key={tag.name} tag={tag} />
            ))}
            {datasets.length > 0 && (
              <Divider horizontal content="Reference uploads" />
            )}
            {datasets.map((dataset) =>
              dataset.uploads.map((upload) => (
                <Label key={`reference-upload-${upload.objectName}`}>
                  {upload.filename}
                </Label>
              )),
            )}
          </React.Fragment>
        ) : (
          <React.Fragment key="query-data">
            {allTags.length > 0 && <Divider horizontal content="Tags" />}
            {allTags.map((tag) => (
              <DatasetReadonlyTag key={tag.name} tag={tag} />
            ))}
            <Divider horizontal content="Select datasets" />
            <DatasetNameList
              datasets={datasets}
              updateSelectedDatasets={setSelectedDatasets}
              projectSelected={selected}
            />
            <Divider horizontal content="Select processed uploads" />
            <ProcessedUploadsList
              uploads={project.reference ? allUploads : availableUploads}
              updateSelectedUploads={updateSelectedUploads}
              projectSelected={selected}
            />
          </React.Fragment>
        )}
      </Card.Content>
    </Card>
  );
}
