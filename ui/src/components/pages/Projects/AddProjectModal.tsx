import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import * as React from "react";
import {
  Button,
  Form,
  Input,
  Modal,
  TextArea,
  Icon,
  Divider,
  Checkbox,
  Card,
} from "semantic-ui-react";
import useIsCurator from "../../../hooks/useIsCurator";
import { useKeycloak } from "../../../keycloak/KeycloakContext";
import { useNavigate } from "react-router";

export default function AddProjectModal({ refetch }) {
  const navigate = useNavigate();
  const { keycloak } = useKeycloak();
  const isAuthenticated = keycloak?.authenticated;

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [isReference, setIsReference] = React.useState(false);

  const [createProject, { loading }] = useMutation(
    gql`
      mutation CreateProject(
        $name: String!
        $description: String!
        $isReference: Boolean
      ) {
        createProject(
          name: $name
          description: $description
          isReference: $isReference
        ) {
          projectID
          name
          description
          createdOn
          isPublic
          isReference
        }
      }
    `,
    {
      onCompleted: (data) => {
        refetch();
        setOpen(!open);
        setDescription("");
        setName("");
        const projectID = data.createProject.projectID;
        navigate(`/home/data/${projectID}`);
      },
    },
  );

  const { isCurator } = useIsCurator();

  function toggleOpen() {
    if (isAuthenticated) {
      setOpen(!open);
    }
  }

  return (
    <Modal
      closeIcon
      closeOnDimmerClick={false}
      open={open}
      onClose={toggleOpen}
      size="large"
      trigger={
        <Card color="black" onClick={toggleOpen} style={{ minHeight: "250px" }}>
          <Card.Header>
            <Button attached="top" size="large">
              <Icon name={isAuthenticated ? "plus" : "lock"} size="large" />
            </Button>
          </Card.Header>
          <Card.Content>
            <div
              className={isAuthenticated ? "underline-on-hover" : undefined}
              style={
                isAuthenticated
                  ? {
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      color: "black",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }
                  : undefined
              }
            >
              <p
                style={{
                  fontWeight: "bold",
                  fontSize: isAuthenticated ? "2rem" : "1rem",
                  textAlign: "center",
                  color: "black",
                }}
              >
                Upload new project
                {isAuthenticated ? null : (
                  <>
                    <br />
                    (log in required)
                  </>
                )}
              </p>
            </div>
          </Card.Content>
        </Card>
      }
    >
      <Modal.Content>
        <Divider horizontal content="NEW PROJECT" />
        <Form>
          {isCurator && (
            <>
              <Checkbox
                label="This is a reference project"
                checked={isReference}
                onChange={() => setIsReference(!isReference)}
              />
              <Divider horizontal />
            </>
          )}
          <Form.Field
            control={Input}
            label="Name"
            placeholder="Project name"
            value={name}
            onChange={(_e, { value }) => setName(value)}
          />
          <Form.Field
            control={TextArea}
            label="Description"
            placeholder="Project description"
            value={description}
            onChange={(_e, { value }) => setDescription(value)}
          />
        </Form>
      </Modal.Content>
      <Modal.Actions>
        <Button
          fluid
          color="facebook"
          content="CREATE PROJECT"
          loading={loading}
          onClick={async () => {
            await createProject({
              variables: { name, description, isReference },
            });
          }}
        />
      </Modal.Actions>
    </Modal>
  );
}
