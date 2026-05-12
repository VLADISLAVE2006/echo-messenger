import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@shared/context/AuthContext'
import ProtectedRoute from '@shared/router/ProtectedRoute'
import Loading from '@shared/ui/Loading'

const Login = lazy(() => import('@pages/Login'))
const Dashboard = lazy(() => import('@pages/Dashboard'))
const Teams = lazy(() => import('@pages/Teams'))
const Profile = lazy(() => import('@pages/Profile'))
const TeamWorkspace = lazy(() => import('@pages/TeamWorkspace'))
const AdminDashboard = lazy(() => import('@pages/AdminDashboard'))

function App() {
	return (
		<BrowserRouter basename="/echo-messenger">
			<AuthProvider>
				<Suspense fallback={<Loading message="Загрузка..." />}>
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
						<Route
							path="/admin"
							element={
								<ProtectedRoute>
									<AdminDashboard />
								</ProtectedRoute>
							}
						/>

						<Route path="/" element={<Navigate to="/dashboard" replace />} />
					</Routes>
				</Suspense>

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
							iconTheme: { primary: '#10b981', secondary: '#fff' },
						},
						error: {
							iconTheme: { primary: '#ef4444', secondary: '#fff' },
						},
					}}
				/>
			</AuthProvider>
		</BrowserRouter>
	)
}

export default App
