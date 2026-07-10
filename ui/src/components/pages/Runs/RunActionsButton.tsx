import { Button } from "semantic-ui-react";

export default function RunActionsButton({
  status,
  loading,
  refetch,
  presignedURL,
  runID,
}: Readonly<{
  status: string;
  loading: boolean;
  refetch: () => void;
  presignedURL?: string;
  runID: string;
}>) {
  if (!status) return null;

  // submitted: keep as refetch (or wire cancel later if you add a cancel mutation)
  if (status === "submitted") {
    return (
      <Button
        content="CANCEL"
        color="red"
        icon="cancel"
        disabled
        onClick={() => refetch()}
        loading={loading}
      />
    );
  }

  // completed: make it a real download link
  if (status === "completed") {
    return (
      <Button
        as="a"
        href={presignedURL}
        download={`TIGERdb_${runID}_cluster.csv`}
        content="DOWNLOAD"
        color="violet"
        icon="download"
        loading={loading}
        disabled={!presignedURL}
      />
    );
  }

  if (status === "failed") {
    return (
      <Button
        content="FAILED RUN LOGS"
        color="red"
        icon="cloud download"
        onClick={() => refetch()}
        loading={loading}
        disabled={!presignedURL}
      />
    );
  }

  return null;
}