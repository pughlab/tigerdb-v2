import { useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { Label } from "semantic-ui-react";
import React from "react";
import StopSharingConfirmation from "./StopSharingConfirmation.tsx";

export default function SharedUserLabel({
  runID,
  user,
  refetch,
  canDelete = false,
}: Readonly<{
  runID?: string;
  user: { name: string; email: string };
  refetch: () => void;
  canDelete?: boolean;
}>) {
  const { name, email } = user;
  const [stopSharing] = useMutation(
    gql`
      mutation StopSharingRun($input: StopSharingRunInput!) {
        stopSharingRun(input: $input) {
          id
          name
          public
          sharedWith {
            id
            name
            email
          }
        }
      }
    `,
    {
      variables: {
        input: {
          email,
          runId: runID,
        },
      },
      onCompleted: () => {
        refetch();
      },
    },
  );
  return (
    <Label color="grey" size="medium">
      {name} ({email})
      {canDelete && (
        <StopSharingConfirmation userName={name} stopSharing={stopSharing} />
      )}
    </Label>
  );
}