import React, { useCallback, useState } from "react";
import {
  Divider,
  Header,
  Icon,
  List,
  Popup,
  Segment,
  Button,
  Modal,
  Label,
} from "semantic-ui-react";
import { useDropzone, type FileWithPath } from "react-dropzone";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import useFileUploadMutation from "../../../hooks/useFileUploadMutation.ts";
import useCreateCuratedAnnotationFromDatasetMutation from "../../../hooks/useCreateCuratedAnnotationFromDatasetMutation.ts";
import useCreateCuratedDatasetFromDatasetMutation from "../../../hooks/useCreateCuratedDatasetFromDatasetMutation.ts";
import useIsAdmin from "../../../hooks/useIsAdmin.ts";
import useIsCurator from "../../../hooks/useIsCurator.ts";
import DisplayTableFromPresignedURL from "../../common/table/DisplayTableFromPresignedURL.tsx";

import FileHeaderSelection from "../../common/table";
import ThemedSegment from "../../common/ThemedSegment.tsx";

// The header options to display in the dropdown for each column
const headerOptions = [
  { key: "cdr3b", text: "CDR3b", value: "cdr3b" },
  { key: "trbv", text: "TRBV", value: "trbv" },
  { key: "trbj", text: "TRBJ", value: "trbj" },
  { key: "cdr3a", text: "CDR3a", value: "cdr3a" },
  {
    key: "subject:condition",
    text: "Subject:Condition",
    value: "subject:condition",
  },
  { key: "count", text: "Clone Count", value: "count" },
];

function FileUploadModal({
  datasetID,
  refetch,
}: Readonly<{ datasetID: string; refetch: () => any }>) {
  const bucketName = `dataset-${datasetID}`;

  const {
    state: uploadState,
    mutation: uploadMutation,
    loading: uploadLoading,
    error: uploadError,
  } = useFileUploadMutation(refetch);
  const onDrop = useCallback((files: FileWithPath[]) => {
    uploadMutation({
      variables: {
        input: {
          datasetId: datasetID,
          bucketName,
          file: files[0],
        },
      },
    });
  }, [bucketName, datasetID, uploadMutation]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });
  let uploadSegment: React.JSX.Element
  if (uploadState.fileUpload) {
    uploadSegment = <ThemedSegment basic icon="check" text="Upload completed!"/>;
  } else if (uploadError) {
    uploadSegment = <ThemedSegment basic icon="times" text="Upload failed. Please try again."/>;
  } else if (isDragActive) {
    uploadSegment = <ThemedSegment basic icon="hand pointer" text="Drop the files here!"/>;
  } else {
    uploadSegment = <ThemedSegment basic icon="hand pointer outline" text={`Drag 'n' drop a file in here!`}/>
  }
  return (
    <Modal
      closeIcon
      closeOnDimmerClick={false}
      trigger={
        <Button fluid size="medium" color="blue" animated="vertical">
          <Button.Content visible>
            <Icon name="cloud upload" />
          </Button.Content>
          <Button.Content hidden content="Upload TCR data" />
        </Button>
      }
    >
      <Modal.Content>
        <div {...getRootProps()}>
          <Segment
            placeholder
            text={"Upload a TCR data file"}
            icon="cloud upload"
            loading={uploadLoading}
          >
            <Button fluid size="medium" color="blue">
              <Button.Content>
                Browse <input {...getInputProps()} />
              </Button.Content>
            </Button>
            {uploadSegment}
          </Segment>
        </div>
      </Modal.Content>
    </Modal>
  );
}

function DownloadButton({ upload }) {
  const {
    objectName,
    filename,
    presignedURL,
    processedDataset: dataset,
  } = upload;
  return (
    <>
      <Popup
        wide="very"
        inverted={!dataset}
        content={
          dataset?.selectedDelimiter ? (
            <DisplayTableFromPresignedURL
              presignedURL={presignedURL}
              delimiter={dataset.selectedDelimiter}
              rowsToShow={5}
              header={false}
              color="blue"
            />
          ) : (
            "No preview available. Please download the file to view its contents."
          )
        }
        trigger={
          <Button key={"button." + objectName} as="div" labelPosition="right">
            <Button basic color="blue">
              {filename}
            </Button>
            <Label
              as="a"
              download={filename}
              href={presignedURL}
              pointing="left"
              color="blue"
              icon="cloud download"
            />
          </Button>
        }
      />
      {dataset && (
        <Popup
          wide="very"
          content={
            <DisplayTableFromPresignedURL
              presignedURL={dataset.presignedURL}
              delimiter={"\t"}
              rowsToShow={5}
              header={false}
              color="green"
            />
          }
          trigger={
            <Button
              key={"button." + dataset.objectName}
              as="div"
              labelPosition="right"
            >
              <Button basic color="green">
                {dataset.filename}
              </Button>

              <Label
                as="a"
                download={dataset.filename}
                href={dataset.presignedURL}
                pointing="left"
                color="green"
                icon="cloud download"
              />
            </Button>
          }
        />
      )}
    </>
  );
}

function DeleteButton({ upload, doDelete, disabled }) {
  return (
    <Popup
      inverted
      position="top center"
      content="Delete"
      trigger={
        <Button
          color="red"
          floated="right"
          circular
          icon="trash"
          disabled={disabled}
          key={`delete.${upload.objectName}`}
          onClick={() => {
            doDelete({
              variables: { objectName: upload.objectName },
            });
          }}
        />
      }
    />
  );
}

function CurateAnnotationsButton({
  upload,
  loading,
  disabled,
  success,
  datasetID,
  curateAnnotation,
}) {
  return (
    <Popup
      inverted
      position="top center"
      content="Annotate"
      trigger={
        <Button
          circular
          color="facebook"
          floated="right"
          key={`curate.${upload?.objectName}`}
          onClick={() => {
            curateAnnotation({
              variables: {
                input: {
                  datasetId: datasetID,
                  bucketName: upload?.bucketName,
                  objectName: upload?.objectName,
                },
              },
            });
          }}
          loading={loading}
          disabled={disabled}
          icon="certificate"
        >
          {success && "ANNOTATED"}
        </Button>
      }
    />
  );
}

function CurateDatasetButton({
  processedDataset,
  datasetID,
  loading,
  disabled,
  success,
  curate,
}) {
  return (
    <Popup
      inverted
      position="top center"
      content="Curate"
      trigger={
        <Button
          circular
          color="teal"
          floated="right"
          key={`curate.${processedDataset?.objectName}`}
          onClick={() => {
            curate({
              variables: {
                input: {
                  datasetId: datasetID,
                  bucketName: processedDataset?.bucketName,
                  objectName: processedDataset?.objectName,
                  delimiter: processedDataset?.delimiter,
                },
              },
            });
          }}
          loading={loading}
          disabled={disabled}
          icon="certificate"
        >
          {success && "CURATED"}
        </Button>
      }
    />
  );
}

function TableModal({ upload, refetch, isPublic }) {
  const [open, setOpen] = useState(false);
  const { processedDataset, objectName, filename, presignedURL, bucketName } =
    upload;
  return (
    <Modal
      size="large"
      closeIcon
      closeOnDimmerClick={false}
      open={open}
      onClose={() => setOpen(!open)}
      trigger={
        <Button
          circular
          floated="right"
          color={processedDataset ? "green" : "blue"}
          disabled={isPublic || Boolean(processedDataset)}
          icon={processedDataset ? "check" : "table"}
          key={`info.${objectName}`}
          onClick={() => setOpen(!open)}
        />
      }
    >
      <Modal.Content>
        <Segment.Group>
          <Segment>
            {
              <Header textAlign="center">
                Set Headers for{" "}
                <span style={{ color: "#2185D0" }}>{filename}</span>
                <Header.Subheader content="Select CDR3b and TRBV from your file" />
              </Header>
            }
          </Segment>
          <FileHeaderSelection
            presignedURL={presignedURL}
            headerOptions={headerOptions}
            bucketName={bucketName}
            objectName={objectName}
            filename={filename}
            onSubmitHeaders={(headers) => {
              console.log("Headers submitted:", headers);
              refetch(); // Refetch the data
              setOpen(!open); // Close the modal on submit
            }}
          />
        </Segment.Group>
      </Modal.Content>
    </Modal>
  );
}

export default function DatasetContent({
  datasetID,
  isReference,
  isPublic,
  isOwner,
  curated,
  annotated
}: Readonly<{
  datasetID: string;
  isReference?: boolean;
  isPublic?: boolean;
  isOwner?: boolean;
  curated?: boolean;
  annotated?: boolean;
}>) {
  const bucketName = `dataset-${datasetID}`;
  const { data, refetch } = useQuery(
    gql`
      query FileUploads($bucketName: ID!) {
        fileUploads(where: { bucketName: { eq: $bucketName } }) {
          bucketName
          objectName
          filename
          presignedURL
          processedDataset {
            bucketName
            objectName
            filename
            createdAt
            delimiter
            presignedURL
          }
        }
      }
    `,
    { variables: { bucketName }, fetchPolicy: "network-only" },
  );

  const [deleteFile] = useMutation(
    gql`
      mutation DeleteFile($input: DeleteFileInput!) {
        deleteFile(input: $input)
      }
    `,
    {
      fetchPolicy: "network-only",
      onCompleted: () => {
        refetch();
      },
    },
  );

  const [
    createCuratedDatasetFromDataset,
    { loading: curatedDatasetLoading },
    success,
  ] = useCreateCuratedDatasetFromDatasetMutation();
  const [
    createCuratedAnnotationFromDataset,
    { loading: curatedAnnotationLoading },
    annotationSuccess,
  ] = useCreateCuratedAnnotationFromDatasetMutation();

  const { isAdmin } = useIsAdmin();
  const { isCurator } = useIsCurator();

  if (!data?.fileUploads) {
    return null;
  }
  const { fileUploads } = data;
  const canCurate: boolean = (isAdmin || isCurator) && !curated;
  const canAnnotate: boolean = (isAdmin || isCurator) && !annotated;

  return (
    <Segment>
      <Divider horizontal content="Uploads" />
      {isOwner || isCurator || isAdmin ? (
        <>
          <FileUploadModal datasetID={datasetID} refetch={refetch} />
          <Divider />
        </>
      ) : null}
      {fileUploads.length === 0 ? (
        <ThemedSegment text={"No uploads yet"} />
      ) : (
        <List celled divided>
          {fileUploads.map((fileUpload) => {
            const { bucketName, objectName } = fileUpload;
            return (
              <div key={`div.${objectName}`}>
                <List.Item key={`list.${objectName}`}>
                  <DownloadButton upload={fileUpload} />
                  {(isOwner || isCurator || isAdmin) && (
                    <DeleteButton
                      upload={fileUpload}
                      doDelete={() =>
                        deleteFile({
                          variables: { input: { bucketName, objectName } },
                        })
                      }
                      disabled={false}
                    />
                  )}{" "}
                  {canAnnotate && (
                    <CurateAnnotationsButton
                      upload={fileUpload}
                      datasetID={datasetID}
                      loading={curatedAnnotationLoading}
                      disabled={
                        annotationSuccess ||
                        curatedAnnotationLoading ||
                        isPublic ||
                        !fileUpload
                      }
                      success={annotationSuccess}
                      curateAnnotation={createCuratedAnnotationFromDataset}
                    />
                  )}
                  {canCurate && (
                    <CurateDatasetButton
                      processedDataset={fileUpload.processedDataset}
                      datasetID={datasetID}
                      loading={curatedDatasetLoading}
                      disabled={
                        success ||
                        curatedDatasetLoading ||
                        isPublic ||
                        !fileUpload
                      }
                      success={success}
                      curate={createCuratedDatasetFromDataset}
                    />
                  )}
                  {!isReference && (
                    <TableModal
                      upload={fileUpload}
                      refetch={refetch}
                      isPublic={isPublic}
                    />
                  )}
                  <Divider />
                </List.Item>
              </div>
            );
          })}
        </List>
      )}
    </Segment>
  );
}
