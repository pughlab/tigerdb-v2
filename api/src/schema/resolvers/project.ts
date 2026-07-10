import type { AppContext } from "../../index.ts";
import {
    addDatasetsToProject, countUnlabelledVariables,
    createProject,
    deleteProject,
    shareProject,
    stopSharing,
    updateProject
} from "../../services/project.ts";
import {assertAuthenticated} from "../../utils/auth.ts";

export default {
    Query: {
        unlabelledVariables: async () => {
            return countUnlabelledVariables();
        }
    },
    Mutation: {
        createProject: async (
            _parent: unknown,
            args: { input: { name: string; description: string; reference?: boolean } },
            context: AppContext
        )=> {
            assertAuthenticated(context)

            return createProject({ input: args.input, userId: context.auth.sub })
        },
        updateProject: async (
            _parent: unknown,
            args: { input: { id: string, name?: string; description?: string; reference?: boolean } },
            context: AppContext
        ) => {
            assertAuthenticated(context);

            return updateProject({ input: args.input, userId: context.auth.sub });
        },
        deleteProject: async (
            _parent: unknown,
            args: { input: { id: string } },
            context: AppContext
        ) => {
            assertAuthenticated(context);

            return deleteProject({ input: args.input, userId: context.auth.sub, roles: context.auth.roles });
        },
        addDatasetsToProject: async (
            _parent: unknown,
            args: { input: { id: string; datasetIds: any[] } },
            context: AppContext
        ) => {
            assertAuthenticated(context);

            return addDatasetsToProject({ input: args.input })
        },
        shareWithUsers: async (
            _parent: unknown,
            args: { input: { id: string, emails: string[] } },
            context: AppContext
        )=> {
            assertAuthenticated(context);

            return shareProject({ input: args.input });

        },
        stopSharingWithUser: async (
            _parent: unknown,
            args: { input: { id: string; email: string } },
            context: AppContext
        )=> {
            assertAuthenticated(context);

            return stopSharing({ input: args.input });
        }
    },
    Project: {
        datasets: async (project: any, _args: unknown, context: AppContext)=> {
            return await context.loaders.datasetLoader.load(project.id);
        },
        createdOn: async (project: any)=> {
            return new Date(project.createdOn.toString()).toISOString();
        },
        sharedWith: async (project: any, _args: unknown, context: AppContext) => {
            return await context.loaders.sharedWithLoader.load(project.id);
        }
    }
}