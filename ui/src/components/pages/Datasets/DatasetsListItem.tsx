import { useState } from "react";
import {
  List,
  Divider,
  Segment,
  Header,
  Label,
  Icon,
  Button,
  Popup,
} from "semantic-ui-react";

import { tagColors, DatasetTag } from "./DatasetTag";
import AddTagModal from "./AddTagModal";
import MinioBucket from "../../common/minio";
import useDeleteDatasetMutation from "../../../hooks/useDeleteDatasetMutation";

export default function DatasetListItem({
  dataset,
  isPublicProject,
  isReferenceProject,
  isOwner,
  refetch,
  permissions
}) {
  const { id: datasetID, name, tags: datasetTags, curated, annotated } = dataset;
  const [isMinioBucketOpen, setIsMinioBucketOpen] = useState(false);
  const [tags, setTags] = useState(
    datasetTags.reduce(
      (acc, tag) => [
        ...acc,
        { name: tag.name, category: tag.category },
      ],
      [],
    ),
  );
  const { isAdmin, isCurator } = permissions;
  const { deleteDataset, loading: isDeleting } =
    useDeleteDatasetMutation(refetch);

  return (
    <>
      <List.Item
        as={Segment}
        onClick={() => setIsMinioBucketOpen(!isMinioBucketOpen)}
      >
        <List.Content floated="right" basic>
          <Icon
            size="large"
            name={isMinioBucketOpen ? "chevron up" : "chevron down"}
          />
        </List.Content>
        <List.Content floated="right" basic>
          {(isAdmin || isCurator) && (
            <Popup
              inverted
              position="top center"
              content="Delete Dataset"
              trigger={
                <Button
                  color="red"
                  icon="trash"
                  loading={isDeleting}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      globalThis.confirm(
                        "Are you sure you want to delete this dataset?",
                      )
                    ) {
                      deleteDataset({ variables: { datasetID } });
                    }
                  }}
                />
              }
            />
          )}
        </List.Content>
        <List.Content>
          <List.Header as={Header}>
            {`${name}`}
            <Label content="Dataset" color="blue" />
          </List.Header>
          <Divider />
          {tags
            .sort((tag1, tag2) => {
              if (tag1.name.toLowerCase() === tag2.name.toLowerCase()) {
                return 0;
              }
              return tag1.name.toLowerCase() > tag2.name.toLowerCase() ? 1 : -1;
            })
            .map((tag) => (
              <DatasetTag
                key={tag.name}
                tag={tag}
                datasetID={datasetID}
                setTags={setTags}
                canDelete={!isPublicProject && (isAdmin || isCurator)}
              />
            ))}
          {(isAdmin || isCurator) && (
            <AddTagModal
              datasetID={datasetID}
              setTags={setTags}
              categories={Object.keys(tagColors)}
            />
          )}
        </List.Content>
      </List.Item>
      {isMinioBucketOpen && (
        <MinioBucket
          datasetID={`${datasetID}`}
          isReference={isReferenceProject}
          isPublic={isPublicProject}
          isOwner={isOwner}
          curated={curated}
          annotated={annotated}
        />
      )}{" "}
      <Divider horizontal hidden />
    </>
  );
}
