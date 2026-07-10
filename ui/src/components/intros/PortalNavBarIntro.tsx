import { Menu } from "semantic-ui-react";

// Element IDs
export const DATA_MENU_ELEMENT_ID = "data-menu-item";
export const LOGIN_MENU_ELEMENT_ID = "login-menu-item";

export default function PortalNavBarIntro() {
  return (
    <Menu.Item
      as="a"
      href="https://pughlab.github.io/tigerdb/"
      target="_blank"
      content="Help"
    />
  );
}
