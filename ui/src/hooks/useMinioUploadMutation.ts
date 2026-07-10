import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { useReducer } from "react";

interface UploadState {
  file?: any;
  minioUpload?: any; // should use type
  isLoading: boolean;
  error?: string;
}

type UploadAction =
  | { type: "SET_FILE"; file: any }
  | { type: "SET_MINIO_UPLOAD"; minioUpload: any };

const reducer = (state: UploadState, action: UploadAction): UploadState => {
  switch (action.type) {
    case "SET_FILE":
      return { ...state, file: action.file };
    case "SET_MINIO_UPLOAD":
      return { ...state, minioUpload: action.minioUpload };
  }
};
const initialState = {
  file: undefined,
  minioUpload: undefined,
  isLoading: false,
  error: undefined,
};

export default function useMinioUploadMutation(postFn: any) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [uploadFile, { loading, error }] = useMutation(
    gql`
      mutation UploadFile($input: UploadFileInput!) {
        uploadFile(input: $input) {
          bucketName
          objectName
          filename
        }
      }
    `,
    {
      onCompleted: (data) => {
        if (data) {
          dispatch({
            type: "SET_MINIO_UPLOAD",
            minioUpload: data?.uploadFile,
          });
        }
        postFn();
      },
    },
  );

  return { state, dispatch, mutation: uploadFile, loading, error };
}
