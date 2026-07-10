import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { useAppDispatch } from "../state/hooks";
import { setKeycloakMe } from "../state/appContext";
import { useEffect } from "react";

export default function useKeycloakMeMutation(): [any] {
  const dispatch = useAppDispatch();

  const [meMutation, mutationState] = useMutation(
    gql`
      mutation CheckinKeycloakMe {
        me {
          id
          name
          email
        }
      }
    `,
    {
      onCompleted: (data) => {
        if (data) {
          dispatch(setKeycloakMe({ keycloakMe: data?.me }));
        }
      },
    },
  );

  useEffect(() => {
    meMutation();
  }, [meMutation]);

  return [mutationState];
}
