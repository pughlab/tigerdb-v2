import { Button, Divider, Grid, Header, Label, Popup } from "semantic-ui-react";
import DisplayTableFromPresignedURL from "../../common/table/DisplayTableFromPresignedURL.tsx";
import { DatasetReadonlyTag } from "../Datasets/DatasetTag.tsx";

export default function DataSources({ processedDatasets, referenceDatasets }) {
  const seenTagNames = new Set();
  let tags: {
    name: string;
    category: string;
  }[] = [];

  referenceDatasets.map((reference) => {
    const uniqueTags =
      reference.dataset?.tags?.filter((tag) => {
        if (seenTagNames.has(tag.name)) {
          return false;
        }
        seenTagNames.add(tag.name);
        return true;
      }) || [];
    tags = [...tags, ...uniqueTags];
  });

  return (
    <>
      <Divider horizontal content="Data" />
      <Grid columns={2} divided>
        <Grid.Row>
          <Grid.Column>
            <Header
              sub
              size="huge"
              style={{ textAlign: "center", marginBottom: "10px" }}
            >
              Orphan TCRs{" "}
              {processedDatasets.length > 0
                ? `(${processedDatasets.length})`
                : ""}
            </Header>
            {processedDatasets.length > 0
              ? processedDatasets.map((processedDataset) => (
                  <Popup
                    key={processedDataset.filename}
                    wide="very"
                    content={
                      <DisplayTableFromPresignedURL
                        presignedURL={processedDataset.presignedURL}
                        delimiter={"\t"}
                        rowsToShow={5}
                        header={false}
                        color="green"
                      />
                    }
                    trigger={
                      <Button
                        key={"button." + processedDataset.objectName}
                        as="div"
                        labelPosition="right"
                      >
                        <Button basic color="green">
                          {processedDataset.filename}
                        </Button>
                        <Label
                          as="a"
                          download={processedDataset.filename}
                          href={processedDataset.presignedURL}
                          pointing="left"
                          color="green"
                          icon="cloud download"
                        />
                      </Button>
                    }
                  />
                ))
              : null}
          </Grid.Column>
          <Grid.Column>
            <Header
              sub
              size="huge"
              style={{ textAlign: "center", marginBottom: "10px" }}
            >
              Deorphanized TCRs{" "}
              {referenceDatasets.length > 0
                ? `(${referenceDatasets.length})`
                : ""}
            </Header>
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
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </>
  );
}