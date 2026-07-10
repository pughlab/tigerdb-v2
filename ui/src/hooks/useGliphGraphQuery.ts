import { gql } from '@apollo/client'
import { useQuery } from "@apollo/client/react";

type GliphGraphInput = {
  runID: string,
  minCommunitySize?: number,
  cdr3bContains?: string
}

export const GET_GLIPH_GRAPH = gql`
  query GetGliphGraph($input: GliphGraphInput!) {
    graph(input: $input) {
      nodes {
        id
        group
        label
        color
        source
        v_gene
      }
      links {
        source
        target
        group
        color
      }
    }
  }
`

export default function useGliphGraphQuery({ input }: {input: GliphGraphInput}) {
  const { runID } = input
  const { data, loading, error, refetch } = useQuery(GET_GLIPH_GRAPH, {
    variables: { input },
    skip: !runID
  })

  return { data: data?.graph, loading, error, refetch }
}
