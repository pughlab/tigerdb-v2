import { gql } from '@apollo/client'
import { useQuery } from "@apollo/client/react";

export const GET_GLIPH_GRAPH = gql`
  query GetGliphGraph($runId: ID!) {
    graph(runId: $runId) {
      nodes {
        id
        group
        size
        label
        value
        color
        source
        v_gene
        j_gene
        hla_a
        hla_b
        hla_c
        hla_dpa1
        hla_dpb1
        hla_dqa1
        hla_dqb1
        hla_drb1
        hla_drb3
        hla_drb4
        hla_drb5
      }
      links {
        source
        target
      }
    }
  }
`;

export default function useGliphGraphQuery(runId: string) {
  const { data, loading, error, refetch } = useQuery(GET_GLIPH_GRAPH, {
    variables: { runId },
    skip: !runId
  })

  return { data: data?.graph, loading, error, refetch }
}
