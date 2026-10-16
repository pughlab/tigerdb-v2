import { useState } from "react";

import { Header, Segment, Button, Modal, Popup, Menu } from "semantic-ui-react";

import { useAuth } from "../../auth/AuthContext.tsx";
import { Logo } from "../logos";
import { LOGIN_MENU_ELEMENT_ID } from "../intros/PortalNavBarIntro";

export default function PublicLoginModal() {
  const [open, setOpen] = useState(false);
  const { keycloak } = useAuth();

  return (
    <>
      <Popup
        size="large"
        flowing
        wide="very"
        trigger={
          <Menu.Item
            id={LOGIN_MENU_ELEMENT_ID}
            header
            icon="user close"
            onClick={() => {
              setOpen(!open);
            }}
          />
        }
      >
        {`Not Logged In`}
      </Popup>
      <Modal
        {...{ open }}
        closeIcon
        onClose={() => setOpen(!open)}
        closeOnDimmerClick={false}
      >
        <Modal.Content>
          <Segment.Group>
            <Segment>
              <Logo centered />
            </Segment>
            <Segment>
              {
                <Header textAlign="center">
                  No user info found! Please login to save data.
                </Header>
              }
            </Segment>
            <Segment>
              <Button
                fluid
                color="facebook"
                size="massive"
                content="Login"
                onClick={() => keycloak.login()}
              />
            </Segment>
          </Segment.Group>
        </Modal.Content>
      </Modal>
    </>
  );
}
