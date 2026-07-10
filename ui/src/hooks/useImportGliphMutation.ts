import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

const IMPORT_GLIPH_RESULTS = gql`
  mutation ImportGliphResults($runID: ID!, $presignedURL: String!) {
    importGliphResults(runID: $runID, presignedURL: $presignedURL)
  }
`;

export default function useImportGliphMutation() {
  const [mutate, { data, loading, error }] = useMutation(IMPORT_GLIPH_RESULTS);
  return { importGliph: mutate, data, loading, error };
}
