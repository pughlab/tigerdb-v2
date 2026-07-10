import { Route, Routes } from 'react-router'

import ProjectsList from './ProjectsList'
import ProjectDetails from './ProjectDetails'

export default function StudiesRoutes() {
	return (
		<Routes>
			<Route index element={<ProjectsList />} />
			<Route path=':projectID' element={<ProjectDetails />} />
		</Routes>
	)
}