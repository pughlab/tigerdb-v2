import { createContext, useContext, useEffect, useRef, useState, type ReactNode, useMemo } from 'react';
import keycloak from './keycloak';
import { initOptions, eventLogger, tokenLogger } from './providerConfig';

type KeycloakContextType = {
  keycloak: typeof keycloak;
  initialized: boolean;
};

const KeycloakContext = createContext<KeycloakContextType>({
  keycloak,
  initialized: false,
});

export const useKeycloak = () => useContext(KeycloakContext);

interface KeycloakProviderProps {
  children: ReactNode;
  LoadingComponent?: ReactNode;
}

export const KeycloakProvider = ({ children, LoadingComponent }: KeycloakProviderProps) => {
  const [initialized, setInitialized] = useState(false);
  const isRun = useRef(false);

  useEffect(() => {
    if (isRun.current) return;
    isRun.current = true;

    keycloak.onReady = (authenticated) => eventLogger('onReady', authenticated);
    keycloak.onAuthSuccess = () => {
      eventLogger('onAuthSuccess', null);
      if (keycloak.token) tokenLogger({ token: keycloak.token });
    };
    keycloak.onAuthError = (err) => eventLogger('onAuthError', err);
    keycloak.onAuthRefreshSuccess = () => {
      eventLogger('onAuthRefreshSuccess', null);
      if (keycloak.token) tokenLogger({ token: keycloak.token });
    };
    keycloak.onTokenExpired = () => {
      eventLogger('onTokenExpired', null);
      keycloak.updateToken(30).catch(console.error);
    };

    keycloak.init(initOptions as never)
      .then(() => setInitialized(true))
      .catch((err) => eventLogger('onInitError', err));
  }, []);

  const contextValue = useMemo(() => {
    return { keycloak, initialized };
  }, [initialized]);

  if (!initialized && LoadingComponent) {
    return <>{LoadingComponent}</>;
  }

  return (
    <KeycloakContext.Provider value={contextValue}>
      {children}
    </KeycloakContext.Provider>
  );
};

