import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { useState, useReducer } from "react";
import {
  Button,
  Form,
  Input,
  Segment,
  Divider,
  Modal,
  List,
  Icon,
} from "semantic-ui-react";

function useAddDatasetReducer({ projectID, refetch }) {
  const [mutation, mutationState] = useMutation(
    gql`
      mutation CreateDataset($input: CreateDatasetInput!) {
        createDataset(input: $input) {
          id
        }
      }
    `,
    {
      onCompleted: () => {
        refetch();
      },
    },
  );
  const initialState = { name: "", projectId: projectID };
  const [state, dispatch] = useReducer((state, action) => {
    const { type, payload } = action;
    const { name } = payload;
    if (type === "setName") {
      return { ...state, name };
    }
    return state;
  }, initialState);
  return { state, dispatch, mutation, mutationState };
}

export default function AddDatasetModal({ projectID, refetch }) {
  const { state, dispatch, mutation, mutationState } = useAddDatasetReducer({
    projectID,
    refetch,
  });
  const { name } = state;
  const { loading: mutationLoading } = mutationState;
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <Modal
      closeIcon
      closeOnDimmerClick={false}
      size="large"
      open={open}
      onClose={() => setOpen(!open)}
      trigger={
        <List.Item as={Segment} onClick={() => setOpen(!open)}>
          <List.Header>
            <Button attached="top" size="large">
              <Icon name="plus" size="large" />
            </Button>
          </List.Header>
          <List.Content>
            <div
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              <p
                style={{
                  fontWeight: "bold",
                  fontSize: "2rem",
                  textAlign: "center",
                  color: "black",
                  textDecoration: hovered ? "underline" : "none",
                }}
              >
                Add new dataset
              </p>
            </div>
          </List.Content>
        </List.Item>
      }
    >
      <Modal.Content>
        <Divider horizontal content="NEW DATASET" />
        <Form loading={mutationLoading}>
          <Form.Field
            control={Input}
            label="Dataset name"
            placeholder="Dataset name"
            value={name}
            onChange={(_e, { value }) =>
              dispatch({ type: "setName", payload: { name: value } })
            }
          />
        </Form>
      </Modal.Content>
      <Modal.Actions>
        <Segment basic textAlign="center">
          <Button
            fluid
            color="blue"
            content="CREATE DATASET"
            loading={mutationLoading}
            onClick={() => {
              mutation({ variables: { input: state } });
              setOpen(!open);
              dispatch({ type: "setName", payload: { name: "" } });
            }}
            disabled={!Object.values(state).every(Boolean)}
          />
        </Segment>
      </Modal.Actions>
    </Modal>
  );
}
