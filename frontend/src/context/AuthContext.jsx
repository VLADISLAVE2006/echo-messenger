import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null)
	const [loading, setLoading] = useState(true)
	const navigate = useNavigate()
	
	useEffect(() => {
		const savedUser = localStorage.getItem('user')
		if (savedUser) {
			try {
				setUser(JSON.parse(savedUser))
			} catch (error) {
				localStorage.removeItem('user')
			}
		}
		setLoading(false)
	}, [])
	
	const login = async (username, password) => {
		try {
			const response = await fetch('http://localhost:5000/api/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ username, password }),
			})
			
			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Login failed')
			}
			
			const data = await response.json()
			
			// Сохраняем ВСЕ данные от бэкенда
			const userData = {
				id: data.user.id,
				username: data.user.username,
				avatar: data.user.avatar || null,
				bio: data.user.bio || 'Добавьте описание о себе',
			}
			
			setUser(userData)
			localStorage.setItem('user', JSON.stringify(userData))
			localStorage.setItem('username', username)
			localStorage.setItem('password', password)
			
			navigate('/dashboard')
			return { success: true }
		} catch (error) {
			return { success: false, error: error.message }
		}
	}
	
	const register = async (username, password, password2) => {
		try {
			const response = await fetch('http://localhost:5000/api/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ username, password, password2 }),
			})
			
			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Registration failed')
			}
			
			// После успешной регистрации сразу логиним
			return await login(username, password)
		} catch (error) {
			return { success: false, error: error.message }
		}
	}
	
	const logout = async () => {
		try {
			await fetch('http://localhost:5000/api/logout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			})
		} catch (error) {
			console.error('Logout error:', error)
		} finally {
			setUser(null)
			localStorage.removeItem('user')
			localStorage.removeItem('username')
			localStorage.removeItem('password')
			navigate('/login')
		}
	}
	
	const updateUser = (data) => {
		const updatedUser = { ...user, ...data }
		setUser(updatedUser)
		localStorage.setItem('user', JSON.stringify(updatedUser))
	}
	
	const value = {
		user,
		login,
		register,
		logout,
		updateUser,
		isAuthenticated: !!user,
	}
	
	if (loading) {
		return <div className="loading">Загрузка...</div>
	}
	
	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
	const context = useContext(AuthContext)
	if (!context) {
		throw new Error('useAuth must be used within AuthProvider')
	}
	return context
}