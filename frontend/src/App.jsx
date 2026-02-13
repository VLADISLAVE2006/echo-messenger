import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Workspace from './pages/Workspace'

function App() {
	return (
		<BrowserRouter basename="/echo-messenger">
			<Routes>
				<Route path="/login" element={<Login />} />
				<Route path="/dashboard" element={<Dashboard />} />
				<Route path="/workspace/:id" element={<Workspace />} />
				<Route path="/" element={<Navigate to="/login" replace />} />
			</Routes>
		</BrowserRouter>
	)
}

export default App