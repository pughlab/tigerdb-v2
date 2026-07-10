import { gql } from '@apollo/client'
import { useMutation } from '@apollo/client/react'

export default function useUpdateRunParametersMutation() {
  const [updateRunParametersMutation, { loading, error }] = useMutation(gql`
    mutation updateRunParameters($input: UpdateRunParametersInput!) {
      updateRunParameters(input: $input) {
        id
        outPrefix
        localMinpValue
        pDepth
        globalConvergenceCutoff
        simulationDepth
        kmerMinDepth
        localMinOVE
        allAAInterchangeable
      }
    }
  `);

  return { updateRunParametersMutation, loading, error };
}