import { gql } from '@apollo/client';
import { useQuery } from "@apollo/client/react";

export default function useIsCurator() {
	const { data, loading, error, refetch } = useQuery(gql`
		query {
			isCurator
		}
	`, { fetchPolicy: 'network-only' });

	return { isCurator: data?.isCurator , loading, error, refetch };
}
