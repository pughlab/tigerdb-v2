import React, { useMemo, useState } from "react";
import {
  Form,
  Input,
  Segment,
  Message,
  List,
  Divider,
  Container,
} from "semantic-ui-react";

import AddDatasetModal from "./AddDatasetModal";
import useIsAdmin from "../../../hooks/useIsAdmin";
import useIsCurator from "../../../hooks/useIsCurator";
import DatasetListItem from "./DatasetsListItem.tsx";

export default function DatasetsList({ project, isPublicProject, isReferenceProject, isOwner, refetch }) {
  const { id, datasets } = project;

  const { isAdmin } = useIsAdmin();
  const { isCurator } = useIsCurator();

  const [searchText, setSearchText] = useState("");
  const filteredDatasets = useMemo(() => {
    if (searchText.trim() === "") {
      return datasets
    }
    return datasets.filter((dataset) =>
      dataset.name.toLowerCase().includes(searchText.toLowerCase()),
    )
  }, [datasets, searchText])

  let datasetList: React.JSX.Element;
  if (filteredDatasets.length === 0) {
    datasetList =
      isAdmin || isCurator || isOwner ? (
        <AddDatasetModal projectID={id} refetch={refetch} />
      ) : (
        <Message info>No datasets found.</Message>
      );
  } else {
    datasetList = (
      <Container>
        <List selection size="large" key="dataset">
          {(isAdmin || isCurator || isOwner) && (
            <>
              <AddDatasetModal projectID={id} refetch={refetch} />
              <Divider horizontal />
            </>
          )}
          {filteredDatasets.map((dataset) => (
            <DatasetListItem
              key={dataset.id}
              isPublicProject={isPublicProject}
              isReferenceProject={isReferenceProject}
              isOwner={isOwner}
              refetch={refetch}
              permissions={{ isAdmin, isCurator }}
              {...{ dataset }}
            />
          ))}
        </List>
      </Container>
    );
  }

  return (
    <>
      <Divider horizontal />
      <Message>
        <Divider horizontal content="Datasets" />
        <Segment basic></Segment>

        <Form>
          <Form.Field
            control={Input}
            label="Search datasets"
            placeholder="Names and descriptions"
            value={searchText}
            onChange={(_e, { value }) => setSearchText(value)}
          />
        </Form>
        <Divider horizontal />
        {datasetList}
      </Message>
    </>
  );
}
