import { gql } from '@apollo/client';
import { useQuery } from "@apollo/client/react";

export default function useIsAdmin() {
	const { data, loading, error, refetch } = useQuery(gql`
		query {
			isAdmin
		}
	`, { fetchPolicy: 'network-only' });

	return { isAdmin: data?.isAdmin , loading, error, refetch };
}
