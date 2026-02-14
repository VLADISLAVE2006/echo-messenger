const API_URL = 'http://localhost:5000/api'

class ApiService {
	async register(username, password, password2) {
		const response = await fetch(`${API_URL}/register`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ username, password, password2 }),
		})
		
		const data = await response.json()
		
		if (!response.ok) {
			throw new Error(data.error || 'Registration failed')
		}
		
		return data
	}
	
	async login(username, password) {
		const response = await fetch(`${API_URL}/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ username, password }),
		})
		
		const data = await response.json()
		
		if (!response.ok) {
			throw new Error(data.error || 'Login failed')
		}
		
		return data
	}
	
	async logout() {
		const response = await fetch(`${API_URL}/logout`, {
			method: 'POST',
		})
		
		const data = await response.json()
		
		if (!response.ok) {
			throw new Error(data.error || 'Logout failed')
		}
		
		return data
	}
}

export default new ApiService()