import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";

export default function useSubmitRunMutation() {
  const [submitRun] = useMutation(
    gql`
      mutation submitRun($input: SubmitRunInput!) {
        submitRun(input: $input) {
          id
          status
          workflowId
        }
      }
    `,
    { fetchPolicy: "network-only" },
  );

  return submitRun;
}
