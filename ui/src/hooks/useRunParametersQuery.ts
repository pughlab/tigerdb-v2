import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

export default function useRunParametersQuery({ runID }: { runID: string }) {
  const { data, loading, error } = useQuery(
    gql`
      query getRunParameters($runID: ID!) {
        run(id: $runID) {
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
    `,
    {
      variables: { runID },
      fetchPolicy: "network-only",
    },
  );

  return { data: data?.run || {}, loading, error };
}
