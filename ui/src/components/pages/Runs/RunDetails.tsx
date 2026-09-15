import {
  Button,
  Segment,
  Message,
  List,
  Divider,
  Loader,
  Grid,
  ButtonGroup,
  Dimmer,
  type SemanticICONS,
} from "semantic-ui-react";
import { useParams } from "react-router";

import useSubmitRunMutation from "../../../hooks/useSubmitRunMutation";
import useRunDetailsQuery from "../../../hooks/useRunDetailsQuery";
import useImportGliphMutation from "../../../hooks/useImportGliphMutation";

import ShareRunModal from "./ShareRunModal";
import SharedUserLabel from "./SharedUserLabel.tsx";
import DataSources from "./DataSources.tsx";
import useIsAdmin from "../../../hooks/useIsAdmin";
import RunResults from "./RunResults.tsx";
import RunActionsButton from "./RunActionsButton.tsx";
import RunParametersForm from "./RunParametersForm.tsx";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";

function getStatusColor(status: string): string {
  switch (status) {
    case "submitted":
      return "goldenrod";
    case "completed":
      return "green";
    case "failed":
      return "red";
    default:
      return "orange";
  }
}

function getStatusIcon(status: string): SemanticICONS {
  switch (status) {
    case "submitted":
      return "circle notch";
    case "completed":
      return "check circle";
    case "failed":
      return "times circle";
    default:
      return "circle outline";
  }
}

export default function RunDetails() {
  const { runID = "" } = useParams();
  const {
    run,
    loading: runDetailsLoading,
    refetch,
  } = useRunDetailsQuery({ runID });
  const { isAdmin } = useIsAdmin();
  const submitRun = useSubmitRunMutation();
  const { importGliph, loading: importLoading } = useImportGliphMutation();
  const { data: ownerData } = useQuery(
    gql`
      query IsRunOwner($runID: ID!) {
        isRunOwner(id: $runID)
      }
    `,
    { variables: { runID } },
  );
  const sharedUsers: any[] = run?.sharedWith || [];
  const isOwner = ownerData?.isRunOwner ?? false;

  if (runDetailsLoading) {
    return (
      <Segment placeholder textAlign="center">
        <Dimmer active inverted>
          <Loader size="large">Loading...</Loader>
        </Dimmer>
      </Segment>
    );
  }

  if (!run) {
    return (
      <Segment placeholder text="Not found!" icon="exclamation triangle" />
    );
  }
  const {
    name,
    description,
    createdBy,
    createdOn,
    processedDatasets,
    referenceDatasets,
    status,
    presignedURL,
  } = run;

  const createdOnDate = new Date(createdOn).toLocaleString("en-US", {
    weekday: "long", // "Sunday"
    year: "numeric", // "2024"
    month: "short", // "Oct"
    day: "numeric", // "2"
    hour: "numeric", // "4"
    minute: "numeric", // "41"
    hour12: true, // 12-hour format with AM/PM
  });

  const colorStatus: string = getStatusColor(status);
  const iconStatus: SemanticICONS = getStatusIcon(status);
  let submitButtonText: string;

  switch (status) {
    case "pending":
      submitButtonText = "SUBMIT RUN";
      break;
    case "failed":
      submitButtonText = "RUN FAILED";
      break;
    case "completed":
      submitButtonText = "RUN COMPLETED";
      break;
    default:
      submitButtonText = "RUN SUBMITTED";
  }

  return (
    <Grid>
      <Grid.Column width={16}>
        <ButtonGroup fluid size="huge" attached="top">
          <Button
            content="REFRESH"
            icon="refresh"
            color="black"
            onClick={() => {
              refetch();
            }}
            loading={runDetailsLoading}
          />
          <RunActionsButton
            status={status}
            refetch={refetch}
            loading={runDetailsLoading}
            presignedURL={presignedURL}
            runID={runID}
          />
          <ShareRunModal runID={runID} refetch={refetch} />
        </ButtonGroup>
        <Message color={"grey"}>
          <Divider horizontal content="Run Details" />
          <Message.Header content={name} />
          <List size="large">
            <List.Item icon="calendar" content={`${createdOnDate}`} />
            <List.Item icon="user" content={`${createdBy.email}`} />
            <List.Item icon="info circle" content={`runID: ${runID}`} />
            {!run?.public && sharedUsers?.length > 0 && (
              <List.Item>
                <List.Icon name="users" style={{ paddingTop: "0.5em" }} />
                <List.Content style={{ paddingLeft: "0px" }}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      paddingTop: "0.2em",
                    }}
                  >
                    {sharedUsers.map((user) => (
                      <SharedUserLabel
                        key={user.email}
                        user={user}
                        canDelete={isOwner || isAdmin}
                        refetch={refetch}
                        runID={runID}
                      />
                    ))}
                  </div>
                </List.Content>
              </List.Item>
            )}
            <List.Item style={{ color: colorStatus }}>
              <List.Icon name={iconStatus} loading={status === "submitted"} />
              <List.Content>{`${status.toUpperCase()}`}</List.Content>
            </List.Item>
          </List>
          <Message content={description} />
          <Divider horizontal />
          <List.Description>
            <DataSources
              processedDatasets={processedDatasets}
              referenceDatasets={referenceDatasets}
            />
          </List.Description>
        </Message>
        <RunResults
          status={status}
          presignedURL={presignedURL}
          runID={runID || ""}
          hasGliphResults={run?.tcrCount > 0}
          importGliph={importGliph}
          importLoading={importLoading}
        />
        <RunParametersForm run={run} />
        <Divider horizontal />
        <Button
          fluid
          size="massive"
          color="violet"
          animated="vertical"
          disabled={status !== "pending"}
          onClick={() => {
            submitRun({
              variables: {
                input: { runId: runID },
              },
            }).then(() => refetch());
          }}
          content={submitButtonText}
        />
      </Grid.Column>
    </Grid>
  );
}
