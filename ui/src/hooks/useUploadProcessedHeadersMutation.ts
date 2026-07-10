import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { useReducer, useCallback } from "react";

// Define the types for our state and actions
interface UploadState {
    headers?: any;
    processedDataset?: any;
    isLoading: boolean;
    error?: string;
}

type UploadAction =
  | { type: 'SET_HEADERS', headers: any }
  | { type: 'SET_PROCESSED_DATASET', processedDataset: any }
  | { type: 'SET_LOADING', isLoading: boolean }
  | { type: 'SET_ERROR', error: string };

// Reducer function to handle state transitions
const reducer = (state: UploadState, action: UploadAction): UploadState => {
  switch (action.type) {
    case 'SET_HEADERS':
      return { ...state, headers: action.headers };
    case 'SET_PROCESSED_DATASET':
      return { ...state, processedDataset: action.processedDataset, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    case 'SET_ERROR':
      return { ...state, error: action.error, isLoading: false };
    default:
      return state;
  }
};

// Initial state
const initialState: UploadState = {
  headers: undefined,
  processedDataset: undefined,
  isLoading: false,
  error: undefined
};

// Define the GraphQL mutation for uploading the processed headers
const UPLOAD_PROCESSED_HEADERS = gql`
  mutation UploadProcessedHeaders($input: ProcessedHeaderInput!) {
    uploadProcessedHeaders(input: $input) {
      objectName
      filename
      processedDataset {
        headers {
          name
          index
        }
        rows
        createdAt
        delimiter
      }
    }
  }
`;

// The custom hook
export default function useUploadProcessedHeaders(postFn: any) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Set up the mutation using Apollo's useMutation
  const [uploadProcessedHeadersMutation] = useMutation(UPLOAD_PROCESSED_HEADERS, {
    onCompleted: (data) => {
      if (data) {
        dispatch({ type: 'SET_PROCESSED_DATASET', processedDataset: data.uploadProcessedHeaders });
      }
      postFn(); // Optional callback after mutation is successful
    },
    onError: (error) => {
      dispatch({ type: 'SET_ERROR', error: error.message });
    }
  });

  // Function to handle the submission of headers
  const handleUploadProcessedHeaders = useCallback(
    async (input: {
      bucketName: string;
      objectName: string;
      filename: string;
      headers: any;
      selectedDelimiter: string;
      includesHeader: boolean;
    }) => {
      // Dispatch loading state
      dispatch({ type: "SET_LOADING", isLoading: true });

      // Format the headers
      const formattedHeaders = Object.entries(input.headers).map(
        ([columnIndex, header]) => ({
          index: Number.parseInt(columnIndex, 10),
          name: header,
        }),
      );

      // Trigger the mutation
      await uploadProcessedHeadersMutation({
        variables: {
          input: {
            bucketName: input.bucketName,
            objectName: input.objectName,
            filename: input.filename,
            headers: formattedHeaders,
            selectedDelimiter: input.selectedDelimiter,
            includesHeader: input.includesHeader,
          },
        },
      });
    },
    [uploadProcessedHeadersMutation],
  );

  // Return state and the callback function
  return { state, dispatch, handleUploadProcessedHeaders };
}


