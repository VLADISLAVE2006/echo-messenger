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
			const data = await api.login(username, password)
			const userData = {
				username,
				avatar: null,
				bio: 'Добавьте описание о себе'
			}
			setUser(userData)
			localStorage.setItem('user', JSON.stringify(userData))
			navigate('/dashboard')
			return { success: true }
		} catch (error) {
			return { success: false, error: error.message }
		}
	}
	
	const register = async (username, password, password2) => {
		try {
			await api.register(username, password, password2)
			return await login(username, password)
		} catch (error) {
			return { success: false, error: error.message }
		}
	}
	
	const logout = async () => {
		try {
			await api.logout()
			setUser(null)
			localStorage.removeItem('user')
			navigate('/login')
		} catch (error) {
			console.error('Logout error:', error)
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