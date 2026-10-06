import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Header, Label, Message, Divider, Grid } from "semantic-ui-react";
import { useParams } from "react-router";
import DatasetContent from "./DatasetContent.tsx";

export default function DatasetDetails() {
  const { datasetID } = useParams();

  const { data, refetch } = useQuery(
    gql`
      query DatasetDetails($datasetID: ID!) {
        datasets(where: { datasetID: $datasetID }) {
          datasetID
          name
        }
      }
    `,
    { variables: { datasetID: datasetID } },
  );

  if (!data?.datasets) {
    return null;
  }

  const [{ name, description }]: [
    { datasetID: string; name: string; description: string },
  ] = data.datasets;

  return (
    <Grid>
      <Grid.Column width={16}>
        <Message>
          <Divider horizontal content="Dataset Details" />
          <Header content={name} subheader={description} />
          <Divider horizontal />
          <Label
            onClick={() => {
              refetch();
            }}
          >
            Study
          </Label>
          <Divider horizontal />
        </Message>
      </Grid.Column>
      <Grid.Row divided>
        <Grid.Column width={10}>
          <Divider horizontal content="Dataset Files" />
          <DatasetContent datasetID={`${datasetID}`} />
        </Grid.Column>
      </Grid.Row>
    </Grid>
  );
}
