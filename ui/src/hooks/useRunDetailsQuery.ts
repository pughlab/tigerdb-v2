import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

export default function useRunDetailsQuery({ runID }: { runID: string }) {
  const { data, loading, error, refetch } = useQuery(
    gql`
      query RunDetails($runID: ID!) {
        run(id: $runID) {
          id
          name
          status
          description
          createdOn
          public
          createdBy {
            id
            email
            name
          }
          sharedWith {
            id
            email
            name
          }
          processedDatasets {
            objectName
            bucketName
            filename
            presignedURL
          }
          referenceDatasetsCount
          tcrCount
          referenceDatasets {
            dataset {
              tags {
                name
                category
              }
            }
            bucketName
            objectName
            presignedURL
          }
          outPrefix
          localMinpValue
          pDepth
          globalConvergenceCutoff
          simulationDepth
          kmerMinDepth
          localMinOVE
          allAAInterchangeable
          presignedURL
        }
      }
    `,
    {
      variables: { runID },
      fetchPolicy: "network-only",
    },
  );
  return { run: data?.run, loading, error, refetch };
}
