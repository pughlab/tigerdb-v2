import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

export default function useDatasetsQuery({
  projectIDs,
  searchText,
}: {
  projectIDs: string[];
  searchText?: string;
}) {
  const { data, loading, error, refetch } = useQuery(
    gql`
      query Datasets($projectId: ID!, $searchText: String) {
        datasets(
          where: {
            AND: [
              { name_CONTAINS: $searchText }
              { project: { projectID_IN: $projectIDs } }
            ]
          }
        ) {
          id
          name
          project {
            id
            name
            public
            reference
          }
          tags {
            name
            category
          }
        }
      }
    `,
    { variables: { projectIDs, searchText }, fetchPolicy: "network-only" },
  );
  return { data, loading, error, refetch };
}
