import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

const IMPORT_GLIPH_RESULTS = gql`
  mutation ImportGliphResults($input: GraphInput!) {
    importResults(input: $input)
  }
`;

export default function useImportGliphMutation() {
  const [mutate, { data, loading, error }] = useMutation(IMPORT_GLIPH_RESULTS);
  return { importGliph: mutate, data, loading, error };
}
