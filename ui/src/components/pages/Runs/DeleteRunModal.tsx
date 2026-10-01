import { gql } from '@apollo/client';
import { useMutation } from "@apollo/client/react";
import * as React from 'react';
import { Button, Icon, Modal, Popup } from 'semantic-ui-react';

export function DeleteRunModal({ run, refetch }) {
  const [open, setOpen] = React.useState(false);
  const [deleteRun] = useMutation(gql`
    mutation DeleteRun($input: DeleteRunInput!) {
      deleteRun(input: $input)
    }
  `, {onCompleted: () => { refetch() }})
  function toggleOpen(e) {
    e.stopPropagation();
    setOpen(!open)
  }

  function removeRun(e, run) {
    e.stopPropagation();
    deleteRun({ variables: { input: { runId: run?.id } } });
    setOpen(!open);
  }

  return (
    <Modal
      open={open}
      closeIcon
      onClose={(e) => {toggleOpen(e)}}
      size="small"
      trigger={
        <Popup
          trigger={
          <Button size='tiny' inverted floated='right' color="red" icon onClick={(e) => {toggleOpen(e)}}>
          <Icon name="trash" />
        </Button>
          }
          content="Delete Run"
          position='top center'
          inverted
          >
        </Popup>
      }
    >
    <Modal.Header>Delete Run</Modal.Header>
    <Modal.Content>
      Are you sure you want to delete run {run.name}?
    </Modal.Content>
    <Modal.Actions>
      <Button onClick={(e) => {toggleOpen(e)}}>Cancel</Button>
      <Button color="red" onClick={(e) => {removeRun(e, run)}}>Delete</Button>
    </Modal.Actions>
  </Modal>
  )
}