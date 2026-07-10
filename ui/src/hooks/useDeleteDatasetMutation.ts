import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

const DELETE_DATASET = gql`
  mutation deleteDatasets($datasetID: ID!) {
    deleteDatasets(where: { id: { eq: $datasetID } }) {
      nodesDeleted
    }
  }
`;

export default function useDeleteDatasetMutation(refetch?: () => void) {
  const [mutate, { data, loading, error }] = useMutation(DELETE_DATASET, {
    onCompleted: () => {
      if (refetch) refetch()
    }
  });
  return { deleteDataset: mutate, data, loading, error };
}
