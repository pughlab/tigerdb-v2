import { useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { Label } from "semantic-ui-react";
import React from "react";
import StopSharingConfirmation from "./StopSharingConfirmation.tsx";

export default function SharedUserLabel({
  runID,
  user,
  updateUsers,
  canDelete = false,
}: Readonly<{
  runID?: string;
  user: { name: string; email: string };
  updateUsers: React.Dispatch<React.SetStateAction<any[]>>;
  canDelete?: boolean;
}>) {
  const { name, email } = user;
  const [stopSharing] = useMutation(
    gql`
      mutation StopSharingRun($runID: ID!, $email: Email!) {
        stopSharingRunWithUser(runID: $runID, email: $email) {
          runID
          name
          isPublic
          sharedWith {
            keycloakUserID
            name
            email
          }
        }
      }
    `,
    {
      variables: {
        email,
        runID,
      },
      onCompleted: () => {
        updateUsers((prev) => prev.filter((u) => u.email !== email));
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