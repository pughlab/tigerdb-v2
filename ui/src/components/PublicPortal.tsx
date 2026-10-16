import {
  Sticky,
  Menu,
  Header,
  Divider,
  Image,
  Segment,
  Step,
  Icon,
  Message,
} from "semantic-ui-react";
import { Routes, Route, Outlet, Link, Navigate } from "react-router";

import NotFoundRedirect from "./NotFoundRedirect";

import { Logo } from "./logos";

import useRouter from "../hooks/useRouter";
import Stats from "./pages/Stats";
import PublicLoginModal from "./authentication/PublicLoginModal";
import Projects from "./pages/Projects";

import PortalNavBarIntro, {
  DATA_MENU_ELEMENT_ID,
} from "./intros/PortalNavBarIntro";

import tigerdb from "./logos/tigerdb.png";
import Runs from "./pages/Runs";

function Layout() {
  const { navigate, isActivePath } = useRouter();

  const routes = [
    { path: "/public", icon: "home", introID: DATA_MENU_ELEMENT_ID },
  ];

  return (
    <>
      <Sticky>
        <Menu size="huge">
          <Menu.Menu position="left">
            <div>
              <Link to="/">
                <Logo size="small" style={{ margin: 5 }} />
              </Link>
            </div>
          </Menu.Menu>
          <Menu.Menu style={{ display: "flex", justifyContent: "center" }}>
            <Link
              to="/public"
              style={{ display: "flex", alignItems: "center", margin: 5 }}
            >
              <Image size="mini" src={tigerdb} />
              <Header as="h1" style={{ margin: 5 }}>TIGERdb</Header>
            </Link>
          </Menu.Menu>
          <Menu.Menu position="right">
            {routes.map(({ path, icon, introID }) => (
              <Menu.Item
                id={introID}
                key={path}
                {...{
                  header: true,
                  icon,
                  active: isActivePath(path),
                  onClick: () => navigate(path),
                }}
              />
            ))}
            <PublicLoginModal />
            <PortalNavBarIntro />
          </Menu.Menu>
        </Menu>
      </Sticky>
      <Divider horizontal />
    </>
  );
}

export default function PublicPortal() {
  const { navigate, isActivePathElement } = useRouter();
  const routes = [
    {
      path: "data",
      icon: "database",
      description: "login to upload TCR data",
      disabled: false,
      element: <Projects />,
    },
    {
      path: "analysis",
      icon: "react",
      description: "run GLIPH2 analysis",
      disabled: false,
      element: <Runs />,
    },
  ];

  return (
    <>
      <Layout />
      <Routes>
        <Route
          key="/public"
          path="public/*"
          element={
            <div style={{ margin: "2em" }}>
              <Segment basic attached="top">
                <Step.Group fluid>
                  {routes.map(({ path, description, icon, disabled }) => (
                    <Step
                      key={path}
                      title={path}
                      description={description}
                      icon={icon}
                      disabled={disabled}
                      active={isActivePathElement(path, 2)}
                      onClick={() => navigate(`public/${path}`)}
                    />
                  ))}
                </Step.Group>
              </Segment>
              <Segment attached>
                <Message color="teal">
                  <Icon name="lock open" />
                  This website is free and open to all users. Upload and
                  analysis of private/unpublished human TCR data requires a
                  login.{" "}
                  <a
                    style={{ textDecoration: "underline" }}
                    target="_blank"
                    href="https://pughlab.github.io/tigerdb/"
                  >Need Help?</a>
                </Message>
              </Segment>
              <Segment attached="bottom">
                <Outlet />
              </Segment>
            </div>
          }
        >
          <Route key="index" index element={<Navigate to="data" replace />} />
          {routes.map(({ path, element }) => (
            <Route key={path} path={`${path}/*`} element={element} />
          ))}
        </Route>
        <Route key="stats" path="/stats" element={<Stats />} />
        <Route
          key="notfound"
          path="*"
          element={<NotFoundRedirect isLoggedIn={false} />}
        />
      </Routes>
    </>
  );
}
