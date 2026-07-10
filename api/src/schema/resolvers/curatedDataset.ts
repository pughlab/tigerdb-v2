import {AppContext} from "../../index.ts";
import {assertAuthenticated} from "../../utils/auth.ts";
import {createCuratedDataset, createCuratedDatasetVariables} from "../../services/curatedDataset.ts";


export default {
    Mutation: {
        createCuratedDataset: async (
            _parent: unknown,
            args: {
                input: {
                    datasetId: string;
                    bucketName: string;
                    objectName: string;
                    delimiter: string;
                }
            },
            context: AppContext
        ) => {
            assertAuthenticated(context);
            const { bucketName, objectName, delimiter } = args.input;

            const curatedDataset = await createCuratedDataset({ input: args.input });
            await createCuratedDatasetVariables(curatedDataset.id, bucketName, objectName, delimiter);
            return curatedDataset;
        },
    }
}