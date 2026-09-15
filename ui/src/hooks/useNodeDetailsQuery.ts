import { gql } from '@apollo/client';
import { useQuery } from "@apollo/client/react";

const GET_NODE_DETAILS = gql`
  query($cdr3b: String!) {
    node(cdr3b: $cdr3b) {
      cdr3b
      v_gene
      projectID
      projectName
      datasetID
      datasetName
      variableID
      j_gene
      trav
      traj
      mhc
      mhcClass
      epitopeGene
      epitopeAAseq
      epitopeSpecies
      mutation
      recognizesWTEpitope
      uniProt
      reference
    } 
  }
`

export default function useNodeDetailsQuery(cdr3b: string) {
  const { data, loading, error } = useQuery(GET_NODE_DETAILS, {
    variables: { cdr3b },
    skip: !cdr3b,
  })
  return { data: data?.node, loading, error }
}