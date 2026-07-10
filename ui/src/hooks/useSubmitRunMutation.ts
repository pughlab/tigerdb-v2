import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";

export default function useSubmitRunMutation() {
  const [submitRun] = useMutation(
    gql`
      mutation submitRun($runID: ID!) {
        submitRun(runID: $runID) {
          run {
            runID
          }
        }
      }
    `,
    { fetchPolicy: "network-only" },
  );

  return submitRun;
}
