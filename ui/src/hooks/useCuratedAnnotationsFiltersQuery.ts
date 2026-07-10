import { gql } from '@apollo/client'
import { useQuery } from "@apollo/client/react";

export default function useCuratedAnnotationsFiltersQuery() {
	const { data, loading, error, refetch } = useQuery(gql`
		query {
			curatedAnnotationFilters {
				key
				placeholder
				text
			}
		}
	`, {fetchPolicy: 'network-only'})
	return { data, loading, error, refetch }
}