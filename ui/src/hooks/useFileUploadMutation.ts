import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { useReducer } from "react";

interface UploadState {
  file?: any;
  fileUpload?: any; // should use type
  isLoading: boolean;
  error?: string;
}

type UploadAction =
  | { type: "SET_FILE"; file: any }
  | { type: "SET_FILE_UPLOAD"; fileUpload: any };

const reducer = (state: UploadState, action: UploadAction): UploadState => {
  switch (action.type) {
    case "SET_FILE":
      return { ...state, file: action.file };
    case "SET_FILE_UPLOAD":
      return { ...state, fileUpload: action.fileUpload };
  }
};
const initialState = {
  file: undefined,
  fileUpload: undefined,
  isLoading: false,
  error: undefined,
};

export default function useFileUploadMutation(postFn: any) {
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
            type: "SET_FILE_UPLOAD",
            fileUpload: data?.uploadFile,
          });
        }
        postFn();
      },
    },
  );

  return { state, dispatch, mutation: uploadFile, loading, error };
}
