import {AppContext} from "../../index.ts";
import {checkIfUserExists, upsertKeycloakUser} from "../../services/keycloak.ts";
import {assertAuthenticated} from "../../utils/auth.ts";

export default {
    Query: {
        isAdmin: (_parent: unknown, _args: unknown, context: AppContext) => {
            assertAuthenticated(context)
            return context.auth.roles.includes("admin")
        },
        isCurator: (_parent: unknown, _args: unknown, context: AppContext) => {
            assertAuthenticated(context)
            return context.auth.roles.includes("curator")
        },
        userExists: (_parent: unknown, args: { email: string }, context: AppContext) => {
            assertAuthenticated(context);
            return checkIfUserExists(args)
        }
    },
    Mutation: {
        me: async (_parent: unknown, _args: unknown, context: AppContext) => {
            assertAuthenticated(context)

            const params: { userId: string, name: string, email: string } = {
                userId: context.auth.sub,
                email: context.auth.email,
                name: context.auth.name
            }
            return upsertKeycloakUser(params)
        }
    }
}