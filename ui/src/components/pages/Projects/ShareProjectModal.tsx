import { gql } from '@apollo/client';
import { useLazyQuery, useMutation } from '@apollo/client/react';
import { Button, Modal, Form, Divider, Label, Icon, Header } from 'semantic-ui-react';
import { useState } from 'react';

export default function ShareProjectModal({ projectID, refetch }) {
  const [open, setOpen] = useState(false);
  const [userDoesNotExistError, setUserDoesNotExistError] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [userExists] = useLazyQuery(gql`
    query UserExists($email: Email!) {
      userExists(email: $email)
    }`, {
      fetchPolicy: 'network-only'
    }
  )
  const [shareWithUsers] = useMutation(gql`
    mutation ShareWithUsers($input: ProjectShareInput!) {
      shareWithUsers(input: $input) {
        id
        name
        sharedWith {
          id
          name
          email
        }
      }
    }`)

  function toggleOpen() {
    setOpen(!open);
    setSelectedEmails([]);
  }

  return (
    <Modal
      closeIcon
      closeOnDimmerClick={false}
      open={open}
      onClose={toggleOpen}
      size="small"
      trigger={
        <Button onClick={toggleOpen} color="facebook">
          <Icon name="users" />
          SHARE
        </Button>
      }
    >
      <Modal.Content>
        <Divider horizontal content='SHARE PROJECT'/>
        <Modal.Description>
          { selectedEmails.length > 0 && (
            <Label.Group style={{ marginBottom: '0.25em' }}>
              <Header as='h4'>Users:</Header>
              { 
                selectedEmails.map(email => (<Label key={email}>
                  {email}
                  <Icon name="delete" onClick={() => {
                    setSelectedEmails(selectedEmails.filter(e => e !== email));
                  }} />
                </Label>))
              }
            </Label.Group>
          )}
          <Form.Input
            label="Type a user's email to share the project with and press Enter when done: "
            placeholder="User's email..."
            fluid
            required={true}
            onKeyPress={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                const input = event.target as HTMLInputElement;
                const email = input.value.trim();
                if (email && !selectedEmails.includes(email)) {
                  userExists({
                    variables: { email },
                  }).then(({ data }) => {
                    if (data?.userExists) {
                      setSelectedEmails((prev) => [...prev, email]);
                      input.value = "";
                    } else {
                      setUserDoesNotExistError(true);
                    }
                  });
                }
              }
            }}
          />
          <Button 
            fluid 
            color='facebook' 
            content='SHARE PROJECT'
            disabled={selectedEmails.length === 0}
            style={{ marginTop: '1em' }}
            onClick={() => {
              if (selectedEmails.length > 0) {
                shareWithUsers({
                  variables: {
                    input: {
                      id: projectID,
                      emails: selectedEmails,
                    },
                  },
                  onCompleted() {
                    refetch();
                  },
                });
              }
              setSelectedEmails([]);
              setOpen(false);
            }}
          />
        </Modal.Description>
        <Modal 
          open={userDoesNotExistError}
          onClose={() => setUserDoesNotExistError(false)}
          size="small"
          closeIcon
        >
          <Modal.Header>Error</Modal.Header>
          <Modal.Content>
            This user does not exist. Please check the email and try again.
          </Modal.Content>
        </Modal>
      </Modal.Content>
    </Modal>
  )
}