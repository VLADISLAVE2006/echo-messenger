import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { apiFetch } from '@shared/api/api'
import socketService from '@shared/socket/socket'

const AuthContext = createContext()

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null)
	const [loading, setLoading] = useState(true)
	const navigate = useNavigate()
	const socketListenerRef = useRef(false)

	// Подключить сокет и войти в личную комнату
	const connectPersonalSocket = () => {
		socketService.connect()
		socketService.joinPersonalRoom()

		if (!socketListenerRef.current) {
			socketListenerRef.current = true
			socketService.on('account_deleted', () => {
				forceLogout()
			})
		}
	}

	const forceLogout = () => {
		setUser(null)
		localStorage.removeItem('user')
		localStorage.removeItem('token')
		socketService.disconnect()
		socketListenerRef.current = false
		navigate('/login')
	}

	const checkSession = async () => {
		const token = localStorage.getItem('token')
		if (!token) return

		try {
			const data = await apiFetch('/me')
			if (data?.user) {
				const fresh = {
					id: data.user.id,
					username: data.user.username,
					avatar: data.user.avatar || null,
					bio: data.user.bio || 'Добавьте описание о себе',
					is_site_admin: data.user.is_site_admin || false,
				}
				setUser(fresh)
				localStorage.setItem('user', JSON.stringify(fresh))
			}
		} catch (err) {
			if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
				forceLogout()
			}
			// Сетевая ошибка — не трогаем сессию
		}
	}

	useEffect(() => {
		const savedUser = localStorage.getItem('user')
		const token = localStorage.getItem('token')
		if (savedUser && token) {
			try {
				const parsed = JSON.parse(savedUser)
				setUser(parsed)
				connectPersonalSocket()
			} catch {
				localStorage.removeItem('user')
			}
		}
		setLoading(false)
		// Сразу проверяем валидность сессии (например, если аккаунт удалили пока офлайн)
		checkSession()
	}, [])

	// Fallback-polling каждые 15 сек
	useEffect(() => {
		if (!user) return
		const interval = setInterval(checkSession, 15000)
		return () => clearInterval(interval)
	}, [user])

	const login = async (username, password) => {
		try {
			const data = await api.login(username, password)

			const userData = {
				id: data.user.id,
				username: data.user.username,
				avatar: data.user.avatar || null,
				bio: data.user.bio || 'Добавьте описание о себе',
				is_site_admin: data.user.is_site_admin || false,
			}

			setUser(userData)
			localStorage.setItem('user', JSON.stringify(userData))
			localStorage.setItem('token', data.token)

			connectPersonalSocket()

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
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password, password2 }),
			})

			if (!response.ok) {
				const error = await response.json()
				throw new Error(error.error || 'Registration failed')
			}

			const data = await response.json()

			const userData = {
				id: data.user.id,
				username: data.user.username,
				avatar: data.user.avatar || null,
				bio: data.user.bio || 'Добавьте описание о себе',
				is_site_admin: data.user.is_site_admin || false,
			}

			setUser(userData)
			localStorage.setItem('user', JSON.stringify(userData))
			localStorage.setItem('token', data.token)

			connectPersonalSocket()
			navigate('/dashboard')
			return { success: true }
		} catch (error) {
			return { success: false, error: error.message }
		}
	}

	const logout = async () => {
		try {
			await api.logout()
		} catch {
			// игнорируем ошибки при логауте
		} finally {
			setUser(null)
			localStorage.removeItem('user')
			localStorage.removeItem('token')
			socketService.disconnect()
			socketListenerRef.current = false
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
