import {
  Card,
  Segment,
  Icon,
  Button,
  Divider,
  Header,
  Label,
  List,
  type SemanticCOLORS,
  Popup,
} from 'semantic-ui-react';
import useRouter from "../../../hooks/useRouter";
import { DeleteRunModal } from "./DeleteRunModal";
import { DatasetReadonlyTag } from "../Datasets/DatasetTag";

export function RunsListItem({ run, refetch }) {
  const { id, name, description, processedDatasets, createdOn, status } = run;
  const creationDate = new Date(createdOn).toDateString();
  const seenTagnames = new Set();
  let tags: any[] = [];

  processedDatasets?.forEach((processedUpload) => {
    const uniqueTags =
      processedUpload.upload?.dataset?.tags?.filter((tag) => {
        if (seenTagnames.has(tag.name)) {
          return false;
        }
        seenTagnames.add(tag.name);
        return true;
      }) || [];
    tags = [...tags, ...uniqueTags];
  });

  let colorStatus: SemanticCOLORS = "black";
  switch (status) {
    case "pending":
      colorStatus = "orange";
      break;
    case "submitted":
      colorStatus = "yellow";
      break;
    case "completed":
      colorStatus = "green";
      break;
    case "failed":
      colorStatus = "red";
      break;
  }

  const { navigate } = useRouter();
  return (
    <Card
      color={colorStatus}
      onClick={() => {
        navigate(id);
      }}
    >
      <Card.Content floated="right" as={Segment} basic>
        <div>
          <Button
            inverted
            floated="left"
            size="tiny"
            color={colorStatus}
            content={run.status.charAt(0).toUpperCase() + run.status.slice(1)}
          />
          <DeleteRunModal run={run} refetch={refetch} />
        </div>
      </Card.Content>
      <Card.Content>
        <Card.Header as={Header}>
          {`${name}`}{" "}
          <Label
            content={
              <Icon style={{ margin: 0 }} name="calendar alternate outline" />
            }
            detail={creationDate}
          />
        </Card.Header>
        <List.Description content={description} />
        <List.Description>
          {processedDatasets.length > 0 && (
            <Divider horizontal content="Data" />
          )}
          <div style={{ textAlign: "center", margin: "10px 0" }}>
            <Popup
              position="top center"
              wide
              trigger={
                <Label basic>
                  <Icon name="unlinkify" />
                  {processedDatasets.length}
                  <Label.Detail>
                    {processedDatasets.length === 1
                      ? "Orphan Dataset"
                      : "Orphan Datasets"}
                  </Label.Detail>
                </Label>
              }
            >
              <Popup.Header>Processed Datasets</Popup.Header>
              <Popup.Content>
                <Label.Group>
                  {processedDatasets.map((processedDataset) => (
                    <Label
                      basic
                      color="green"
                      key={processedDataset.objectName}
                      content={processedDataset.filename}
                    />
                  ))}
                </Label.Group>
              </Popup.Content>
            </Popup>
            <Label basic color="black">
              <Icon name="linkify" />
              {run.referenceDatasetsCount}
              <Label.Detail>
                {run.referenceDatasetsCount === 1
                  ? "Deorphanized Dataset"
                  : "Deorphanized Datasets"}
              </Label.Detail>
            </Label>
          </div>
          {tags.length > 0 && <Divider horizontal content="Tags" />}
          <Label.Group>
            {[...tags]
              .sort((tag1, tag2) => {
                if (tag1.name.toLowerCase() === tag2.name.toLowerCase()) {
                  return 0;
                }
                return tag1.name.toLowerCase() > tag2.name.toLowerCase()
                  ? 1
                  : -1;
              })
              .map((tag) => (
                <DatasetReadonlyTag key={tag.name} tag={tag} />
              ))}
          </Label.Group>
        </List.Description>
      </Card.Content>
    </Card>
  );
}
