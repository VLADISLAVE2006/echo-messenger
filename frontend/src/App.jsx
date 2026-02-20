import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Teams from './pages/Teams'
import Profile from './pages/Profile'
import TeamWorkspace from './pages/TeamWorkspace'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
	return (
		<BrowserRouter basename="/echo-messenger">
			<AuthProvider>
				<Routes>
					<Route path="/login" element={<Login />} />
					
					<Route
						path="/dashboard"
						element={
							<ProtectedRoute>
								<Dashboard />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/teams"
						element={
							<ProtectedRoute>
								<Teams />
							</ProtectedRoute>
						}
					/>
					{/* ⬇️ ИЗМЕНЕНО: /team/:teamId вместо /teams/:teamId */}
					<Route
						path="/team/:teamId"
						element={
							<ProtectedRoute>
								<TeamWorkspace />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/profile"
						element={
							<ProtectedRoute>
								<Profile />
							</ProtectedRoute>
						}
					/>
					
					<Route path="/" element={<Navigate to="/dashboard" replace />} />
				</Routes>
				
				<Toaster
					position="top-right"
					toastOptions={{
						duration: 3000,
						style: {
							background: '#fff',
							color: '#111827',
							border: '1px solid #e5e7eb',
							borderRadius: '6px',
							padding: '12px 16px',
							fontSize: '14px',
						},
						success: {
							iconTheme: {
								primary: '#10b981',
								secondary: '#fff',
							},
						},
						error: {
							iconTheme: {
								primary: '#ef4444',
								secondary: '#fff',
							},
						},
					}}
				/>
			</AuthProvider>
		</BrowserRouter>
	)
}

export default App