import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

export default function useProjectDetailsQuery({
  projectID,
}: {
  projectID: string;
}) {
  const { data, loading, error, refetch } = useQuery(
    gql`
      query ProjectDetails($projectID: ID!) {
        project(id: $projectID) {
          id
          name
          description
          sharedWith {
            id
            name
            email
          }
          createdOn
          createdBy {
            id
            email
            name
          }
          public
          reference
          datasets {
            id
            name
            curated
            annotated
            tags {
              name
              category
            }
          }
        }
      }
    `,
    {
      variables: { projectID },
      fetchPolicy: "network-only",
    },
  );
  return { data, loading, error, refetch, project: data?.project ?? {} };
}
