import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

export default function useRunsQuery() {
  const { data, loading, error, refetch } = useQuery(
    gql`
      query {
        runs {
          id
          name
          description
          processedDatasets {
            objectName
            bucketName
            filename
            upload {
              dataset {
                tags {
                  name
                  category
                }
              }
            }
          }
          referenceDatasetsCount
          createdBy {
            id
            email
            name
          }
          createdOn
          status
        }
      }
    `,
    { fetchPolicy: "network-only" },
  );
  return { data, loading, error, refetch };
}
