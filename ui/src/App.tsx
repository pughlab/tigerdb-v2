import { ApolloProvider } from "@apollo/client/react";
import apolloClient from "./apolloClient";

import { store as reduxStore } from "./state/store";
import { Provider as ReduxProvider } from "react-redux";
import { KeycloakProvider } from "./keycloak/KeycloakContext";

import { BrowserRouter } from "react-router";

import RenderOnAuthenticated from "./components/authentication/RenderOnAuthenticated";
import LoadingAuthentication from "./components/authentication/LoadingAuthentication";

const App = () => {
  return (
    <div>
      <KeycloakProvider LoadingComponent={<LoadingAuthentication />}>
        <ReduxProvider {...{ store: reduxStore }}>
          <ApolloProvider {...{ client: apolloClient }}>
            <BrowserRouter>
              <RenderOnAuthenticated />
            </BrowserRouter>
          </ApolloProvider>
        </ReduxProvider>
      </KeycloakProvider>
    </div>
  );
};

export default App;
