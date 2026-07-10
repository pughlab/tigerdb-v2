import {AppContext} from "../../index.ts";
import {assertAuthenticated} from "../../utils/auth.ts";
import {
    countEpitopes,
    createAnnotationVariables,
    createCuratedAnnotation,
    generateTags
} from "../../services/curatedAnnotation.ts";

export default {
    Query: {
        epitopes: async () => {
            return await countEpitopes();
        }
    },
    Mutation: {
        createCuratedAnnotation: async (
            _parent: unknown,
            args: {
                input: {
                    datasetId: string;
                    bucketName: string;
                    objectName: string;
                }
            },
            context: AppContext
        ) => {
            assertAuthenticated(context);

            const curatedAnnotation = await createCuratedAnnotation({ input: args.input });
            await createAnnotationVariables(curatedAnnotation.id, args.input.bucketName, args.input.objectName);
            await generateTags(curatedAnnotation.id, args.input.datasetId);
            return curatedAnnotation;
        },
    }
}