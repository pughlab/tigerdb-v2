import {AppContext} from "../../index.ts";
import {assertAuthenticated} from "../../utils/auth.ts";
import {addTagToDataset, deleteTag, removeTagFromDataset, upsertTag} from "../../services/tag.ts";

export default {
    Mutation: {
        findOrCreateTag: (
            _parent: unknown,
            args: { input: { name: string; category: string } },
            context: AppContext
        )=> {
            assertAuthenticated(context);

            return upsertTag({ input: args.input });
        },
        addTagToDataset: (
            _parent: unknown,
            args: { input: { name: string; datasetId: string } },
            context: AppContext
        )=> {
            assertAuthenticated(context);

            return addTagToDataset({ input: args.input });
        },
        removeTagFromDataset: (
            _parent: unknown,
            args: { input: { name: string; datasetId: string } },
            context: AppContext
        )=> {
            assertAuthenticated(context);

            return removeTagFromDataset({ input: args.input });
        },
        deleteTag: (
            _parent: unknown,
            args: { name: string; },
            context: AppContext
        )=> {
            assertAuthenticated(context);

            return deleteTag({ name: args.name });
        }
    },
    Tag: {
        datasets: async (tag: any, _args: unknown, context: AppContext) => {
            return await context.loaders.tagDatasetLoader.load(tag.name);
        }
    }
}