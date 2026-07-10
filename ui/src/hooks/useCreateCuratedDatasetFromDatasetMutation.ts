import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";

export default function useCreateCuratedDatasetFromDatasetMutation(): [
  useMutation.MutationFunction<
    unknown,
    {
      [p: string]: unknown;
    }
  >,
  useMutation.Result,
  boolean
] {
  const [createCuratedDatasetFromDataset, mutationState] = useMutation(
    gql`
      mutation createCuratedDatasetFromDataset($input: CreateCuratedDatasetInput!) {
        createCuratedDataset(input: $input) {
          id
        }
      }
    `,
    { fetchPolicy: "network-only" },
  );
  const success: boolean = mutationState.data?.createCuratedDataset;

  return [createCuratedDatasetFromDataset, mutationState, success];
}
