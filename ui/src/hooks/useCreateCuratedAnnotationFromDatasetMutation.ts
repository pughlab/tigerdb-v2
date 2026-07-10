import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";

export default function useCreateCuratedAnnotationFromDatasetMutation(): [
  useMutation.MutationFunction<
    unknown,
    {
      [p: string]: unknown;
    }
  >,
  useMutation.Result,
  boolean
] {
  const [createCuratedAnnotationFromDataset, mutationState] = useMutation(
    gql`
      mutation createCuratedAnnotationFromDataset($input: CreateCuratedAnnotationInput!) {
        createCuratedAnnotation(input: $input) {
          id
        }
      }
    `,
    { fetchPolicy: "network-only" },
  );
  const annotationSuccess: boolean = mutationState.data?.createCuratedAnnotation;

  return [createCuratedAnnotationFromDataset, mutationState, annotationSuccess];
}
