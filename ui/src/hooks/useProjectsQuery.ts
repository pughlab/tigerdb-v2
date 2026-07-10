import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

export default function useProjectsQuery() {
  const { data, loading, error, refetch } = useQuery(
    gql`
      query {
        projects {
          id
          name
          description
          datasets {
            id
            name
            tags {
              name
              category
            }
            uploads {
              objectName
              filename
              processedDataset {
                objectName
                filename
                upload {
                  dataset {
                    id
                    name
                  }
                }
              }
            }
          }
          createdBy {
            id
            email
            name
          }
          createdOn
          public
          reference
        }
      }
    `,
    { fetchPolicy: "network-only" },
  );
  return { data, loading, error, refetch };
}
