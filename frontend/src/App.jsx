import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Workspace from './pages/Workspace'

function App() {
	return (
		<BrowserRouter basename="/echo-messenger">
			<AuthProvider>
				<Routes>
					<Route path="/login" element={<Login />} />
					<Route path="/dashboard" element={<Dashboard />} />
					<Route path="/workspace/:id" element={<Workspace />} />
					<Route path="/" element={<Navigate to="/login" replace />} />
				</Routes>
				
				{/* Toast уведомления */}
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