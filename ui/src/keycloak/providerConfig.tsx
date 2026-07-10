const eventLogger = (event: unknown, error: unknown) => {
  console.log('onKeycloakEvent', event, error)
}

const tokenLogger = (tokens: { token: string }) => {
  const { token } = tokens;
  localStorage.setItem("keycloak_token", token || "");
};

const initOptions = { 
  onLoad: "check-sso",
  checkLoginIframe: false,
  enableLogging: true
}

export {
  eventLogger,
  tokenLogger,
  initOptions
};