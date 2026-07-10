import {GraphQLError} from "graphql";
import type { AppContext } from "../index.ts";

export function assertAuthenticated(
    context: AppContext
): asserts context is AppContext & { auth: { isAuthenticated: boolean; sub: string } } {
    if (!context.auth.isAuthenticated || !context.auth.sub) {
        throw new GraphQLError("Unauthenticated", {
            extensions: { code: "UNAUTHENTICATED" }
        });
    }
}

export function assertAdmin(context: AppContext): asserts context is AppContext {
    if (!context.auth.isAuthenticated) {
        throw new GraphQLError("Unauthenticated", {
            extensions: { code: "UNAUTHENTICATED" }
        });
    }
    if (!context.auth.roles.includes("admin")) {
        throw new GraphQLError("Unauthorized", {
            extensions: { code: "UNAUTHORIZED" }
        })
    }
}