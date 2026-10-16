import {
  Sticky,
  Menu,
  Header,
  Image,
  Segment,
  Step,
  Icon,
  Message,
} from "semantic-ui-react";
import useKeycloakMeMutation from "../hooks/useKeycloakMeMutation";
import { Routes, Route, Outlet, Link, Navigate } from "react-router";

import NotFoundRedirect from "./NotFoundRedirect";
import { Logo } from "./logos";
import tigerdb from "./logos/tigerdb.png";

import useRouter from "../hooks/useRouter";
import Stats from "./pages/Stats";
import LoginModal from "./authentication/LoginModal";
import Projects from "./pages/Projects";
import Runs from "./pages/Runs";

import PortalNavBarIntro, {
  DATA_MENU_ELEMENT_ID,
} from "./intros/PortalNavBarIntro";

function Layout() {
  const { navigate, isActivePath } = useRouter();

  const routes = [
    { path: "/home", icon: "home", introID: DATA_MENU_ELEMENT_ID },
  ];

  return (
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
            to="/home"
            style={{ display: "flex", alignItems: "center", margin: 5 }}
          >
            <Image size="mini" src={tigerdb} />

            <Header as="h1" style={{ margin: 5 }}>
              TIGERdb
            </Header>
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
          <LoginModal />
          <PortalNavBarIntro />
        </Menu.Menu>
      </Menu>
    </Sticky>
  );
}

export default function Portal() {
  const { navigate, isActivePathElement } = useRouter();
  useKeycloakMeMutation();
  const routes = [
    {
      path: "data",
      icon: "database",
      description: "upload TCR data",
      element: <Projects />,
    },
    {
      path: "analysis",
      icon: "react",
      description: "run GLIPH2 analysis",
      element: <Runs />,
    },
  ];

  return (
    <>
      <Layout />
      <Routes>
        <Route
          key="home"
          path="home/*"
          element={
            <div style={{ margin: "2em" }}>
              <Segment basic attached="top">
                <Step.Group size="large" fluid>
                  {routes.map(({ path, icon, description }) => (
                    <Step
                      key={path}
                      title={path}
                      description={description}
                      icon={icon}
                      active={isActivePathElement(path, 2)}
                      onClick={() => navigate(`home/${path}`)}
                    />
                  ))}
                </Step.Group>
              </Segment>
              <Segment attached>
                <Message color="teal">
                  <Icon name="lock open" />
                  This website is free and open to all users. Upload and
                  analysis of private/unpublished human TCR data requires a
                  login.
                  <a
                    style={{ textDecoration: "underline" }}
                    target="_blank"
                    href="https://pughlab.github.io/tigerdb/"
                  >
                    Need Help?
                  </a>
                </Message>
              </Segment>
              <Segment attached="bottom">
                <Outlet />
              </Segment>
            </div>
          }
        >
          <Route key="index" index element={<Navigate to="data" replace />} />

          {routes.map((route) => {
            const { path, element } = route;
            return <Route key={path} path={`${path}/*`} element={element} />;
          })}
        </Route>
        <Route key="stats" path="/stats" element={<Stats />} />
        <Route
          key="notfound"
          path="*"
          element={<NotFoundRedirect isLoggedIn={true} />}
        />
      </Routes>
    </>
  );
}
