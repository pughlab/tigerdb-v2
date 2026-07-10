import * as React from "react";
import { type ErrorLike, gql, type OperationVariables } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { useMemo, useState } from "react";
import {
  Button,
  Dimmer,
  Loader,
  Segment,
  Message,
  List,
  Divider,
  Grid,
  Label,
  Icon,
  Modal,
} from "semantic-ui-react";

import { useParams } from "react-router";

import DatasetsList from "../Datasets/DatasetsList";
import useProjectDetailsQuery from "../../../hooks/useProjectDetailsQuery";
import useIsAdmin from "../../../hooks/useIsAdmin";

import ShareProjectModal from "./ShareProjectModal";

const STOP_SHARING_WITH_USER = gql`
  mutation StopSharingWithUser($input: ProjectStopSharingInput!) {
    stopSharingWithUser(input: $input) {
      id
      name
    }
  }
`;

function StopSharingConfirmation({ userName, stopSharing }) {
  const [open, setOpen] = useState(false);
  return (
    <Modal
      closeIcon
      closeOnDimmerClick={false}
      size="small"
      trigger={<Icon name="delete" onClick={() => setOpen(true)} />}
      open={open}
      onClose={() => setOpen(false)}
    >
      <Modal.Content>
        <Divider horizontal content="STOP SHARING" />
        <Modal.Description>
          Are you sure? {userName} will no longer have access to this project.
        </Modal.Description>
      </Modal.Content>
      <Modal.Actions>
        <Button color="red" onClick={() => setOpen(false)}>
          <Icon name="remove" /> No
        </Button>
        <Button
          color="green"
          onClick={() => {
            stopSharing();
            setOpen(false);
          }}
        >
          <Icon name="checkmark" /> Yes
        </Button>
      </Modal.Actions>
    </Modal>
  );
}

function SharedUserLabel({
  projectID,
  user,
  refetch,
  canDelete = false,
}: Readonly<{
  projectID?: string;
  user: { name: string; email: string };
  refetch: (variables?: Partial<OperationVariables> | undefined) => Promise<{
    data: unknown;
    error?: ErrorLike;
  }>;
  canDelete?: boolean;
}>) {
  const { name, email } = user;
  const [stopSharing] = useMutation(STOP_SHARING_WITH_USER, {
    variables: {
      input: {
        email: email,
        id: projectID,
      },
    },
    onCompleted: () => {
      refetch();
    },
  });
  return (
    <Label color="grey" size="medium">
      {name} ({email})
      {canDelete && (
        <StopSharingConfirmation userName={name} stopSharing={stopSharing} />
      )}
    </Label>
  );
}

export default function ProjectDetails() {
  const { projectID } = useParams();
  const {
    project,
    loading: detailsLoading,
    refetch,
  } = useProjectDetailsQuery({ projectID });
  const { isAdmin } = useIsAdmin();
  const { data: ownerData } = useQuery(
    gql`
      query IsProjectOwner($projectID: ID!) {
        isProjectOwner(id: $projectID)
      }
    `,
    { variables: { projectID } },
  );
  const [makeProjectPublic] = useMutation(
    gql`
      mutation MakeProjectPublic($projectID: ID!) {
        makeProjectPublic(id: $projectID) {
          id
          name
          public
        }
      }
    `,
    {
      variables: { projectID },
      onCompleted() {
        refetch();
      },
    },
  );

  const [makeProjectPrivate] = useMutation(
    gql`
      mutation MakeProjectPrivate($projectID: ID!) {
        makeProjectPrivate(id: $projectID) {
          id
          name
          public
        }
      }
    `,
    {
      variables: { projectID },
      onCompleted() {
        refetch();
      },
    },
  );
  const isOwner = ownerData?.isProjectOwner ?? false;
  const sharedUsers = project?.sharedWith ?? [];

  const canMakePublic = useMemo(() => {
    return isAdmin || isOwner;
  }, [isAdmin, isOwner]);

  if (detailsLoading) {
    return (
      <Segment placeholder textAlign="center">
        <Dimmer active inverted>
          <Loader size="large">Loading...</Loader>
        </Dimmer>
      </Segment>
    );
  }

  if (!project) {
    return <Segment placeholder text="Not found!" icon="exclamation triangle" />;
  }

  const { name, description, createdOn, createdBy, public: isPublic, reference: isReference } = project;
  const createdOnDate = new Date(createdOn).toLocaleString("en-US", {
    weekday: "long", // "Sunday"
    year: "numeric", // "2024"
    month: "short", // "Oct"
    day: "numeric", // "2"
    hour: "numeric", // "4"
    minute: "numeric", // "41"
    hour12: true, // 12-hour format with AM/PM
  });

  let publicAndSharing = <></>;

  if (isPublic && canMakePublic) {
    publicAndSharing = (
      <Button
        fluid
        color="facebook"
        icon="lock"
        content="MAKE PROJECT PRIVATE"
        onClick={() => makeProjectPrivate()}
      />
    );
  } else if (canMakePublic) {
    publicAndSharing = (
      <Button.Group fluid widths="2">
        <Button
          color="black"
          icon="lock open"
          content="MAKE PROJECT PUBLIC"
          onClick={() => makeProjectPublic()}
        />
        <Button.Or />
        <ShareProjectModal
          projectID={projectID}
          refetch={refetch}
        />
      </Button.Group>
    );
  }

  return (
    <Grid columns={1}>
      <Grid.Column>
        <Message color="grey">
          <Divider horizontal content="Project Details" />
          <Message.Header content={name} />
          <List size="large">
            <List.Item icon="calendar" content={`${createdOnDate}`} />
            <List.Item icon="user" content={`${createdBy.name}`} />
            {!isPublic && sharedUsers.length > 0 && (
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
                        projectID={projectID}
                      />
                    ))}
                  </div>
                </List.Content>
              </List.Item>
            )}
            {isPublic ? (
              <List.Item icon="lock open" content="Public" />
            ) : (
              <List.Item icon="lock" content="Private" />
            )}
          </List>
          <Message content={description} />
          <Divider horizontal />
          {publicAndSharing}
        </Message>
        <DatasetsList
          project={project}
          isPublicProject={isPublic}
          isReferenceProject={isReference}
          isOwner={isOwner}
          refetch={refetch}
        />
      </Grid.Column>
    </Grid>
  );
}
