import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { useMemo } from "react";

export default function useRunLogsQuery({ runID }: { runID: string }) {
  const { loading, data, error } = useQuery(
    gql`
      query RunLogs($runID: ID!) {
        run(id: $runID) {
          getRunData
        }
      }
    `,
    {
      variables: { runID },
      pollInterval: 5000,
      fetchPolicy: "network-only",
    },
  );
  const logs = useMemo(() => {
    if (data?.run) {
      return data.run.getRunData;
    }
    return null
  }, [data])

  return { logs, loading, error };
}
