import Keycloak from 'keycloak-js';

const keycloakHostAndPort = import.meta.env.KEYCLOAK_SERVER_HOST_AND_PORT || "localhost:8080"
const keycloakRealm = import.meta.env.KEYCLOAK_SERVER_REALM || 'tigerdb'
const keycloakClient = import.meta.env.KEYCLOAK_SERVER_CLIENT || 'tigerdb-app'

const keycloak = new Keycloak({
  url: `http://${keycloakHostAndPort}`,
  realm: keycloakRealm,
  clientId: keycloakClient
});

export default keycloak
