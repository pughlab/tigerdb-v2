import { useState } from "react";

import {
  Header,
  Segment,
  Button,
  Modal,
  Label,
  Icon,
  Popup,
  Menu,
} from "semantic-ui-react";

import { useAuth } from "../../auth/AuthContext.tsx";
import { useAppSelector } from "../../state/hooks";
import { currentAppContextKeycloakMe } from "../../state/appContext";
import { shallowEqual } from "react-redux";
import { Logo } from "../logos";
import { LOGIN_MENU_ELEMENT_ID } from "../intros/PortalNavBarIntro";
import { keycloakRefreshToken } from "../../common";

import * as R from "remeda";

export default function LoginModal() {
  const [open, setOpen] = useState(false);
  const { keycloak } = useAuth();
  const keycloakMe = useAppSelector(currentAppContextKeycloakMe, shallowEqual);
  if (!keycloakMe) {
    return (
      <Menu.Item
        header
        icon={<Icon name="spinner" loading />}
        onClick={() => setOpen(!open)}
      />
    );
  }
  const { name, email } = keycloakMe;

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
            icon="user"
            content={name.split(" ")[0] || "User"}
            onClick={() => {
              keycloakRefreshToken(keycloak, R.identity);
              setOpen(!open);
            }}
          />
        }
      >
        {`Logged in as  `}
        <Label basic content={name} detail={email} />
      </Popup>

      <Modal
        {...{ open }}
        closeIcon
        onClose={() => setOpen(!open)}
      >
        <Modal.Content>
          <Segment.Group>
            <Segment>
              <Logo centered />
            </Segment>
            <Segment>
              {
                <Header textAlign="center">
                  {name}
                  <Header.Subheader content={email} />
                </Header>
              }
            </Segment>
            <Segment>
              <Button
                fluid
                color="google plus"
                size="massive"
                content="Logout"
                onClick={() => keycloak.logout()}
              />
            </Segment>
          </Segment.Group>
        </Modal.Content>
      </Modal>
    </>
  );
}
