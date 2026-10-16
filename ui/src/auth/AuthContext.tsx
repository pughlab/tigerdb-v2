import { createContext, useContext, useEffect, useMemo, useState } from "react";
import keycloak from './keycloak.ts';
import type Keycloak from "keycloak-js";

interface AuthContextType {
  keycloak: Keycloak;
  initialized: boolean;
  authenticated: boolean;
}

let isInitialized: boolean = false;

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children, LoadingComponent }) {
  const [initialized, setInitialized] = useState<boolean>(keycloak.authenticated || isInitialized);
  const [authenticated, setAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    if (isInitialized) {
      return;
    }
    isInitialized = true;
    keycloak.init({
        onLoad: "check-sso",
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-sso-check.html`,
        checkLoginIframe: false,
        pkceMethod: "S256",
      })
      .then((auth) => {
        setAuthenticated(auth);
        setInitialized(true);
      })
      .catch((err) => {
        console.error("Could not initialize Keycloak", err);
        setInitialized(true);
      });
  }, []);

  const contextValue = useMemo(
    () => ({ keycloak, initialized, authenticated }),
    [authenticated, initialized],
  );


  if (!initialized && LoadingComponent) {
    return <>{LoadingComponent}</>;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      { children }
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}


