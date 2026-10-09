import { ApolloClient, InMemoryCache } from '@apollo/client'
import UploadHttpLink from "apollo-upload-client/UploadHttpLink.mjs";
import { SetContextLink } from '@apollo/client/link/context';

const GRAPHQL_IP = globalThis.location.hostname

const authLink = new SetContextLink(({ headers }) => {
  // get the authentication token from local storage if it exists
  const token = localStorage.getItem('keycloak_token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
})

const link = new UploadHttpLink({
  uri:`https://${GRAPHQL_IP}/graphql`,
  headers: {
    'apollo-require-preflight': "true",
  }
})

const apolloClient = new ApolloClient({
    link: authLink.concat(link),
    cache: new InMemoryCache(),
  })

export default apolloClient