import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

const DELETE_DATASET = gql`
  mutation deleteDataset($input: DeleteDatasetInput!) {
    deleteDataset(input: $input)
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
