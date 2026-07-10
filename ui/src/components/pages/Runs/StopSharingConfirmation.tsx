import { useState } from "react";
import { Button, Divider, Icon, Modal } from "semantic-ui-react";

export default function StopSharingConfirmation({ userName, stopSharing }) {
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
          Are you sure? {userName} will no longer have access to this run.
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