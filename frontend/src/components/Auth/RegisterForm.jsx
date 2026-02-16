import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import Button from '../common/Button'
import Input from '../common/Input'

function RegisterForm({ onSwitchToLogin }) {
	const { register } = useAuth()
	const [formData, setFormData] = useState({
		username: '',
		password: '',
		password2: '',
	})
	const [loading, setLoading] = useState(false)
	
	const handleChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		})
	}
	
	const handleSubmit = async (e) => {
		e.preventDefault()
		
		if (formData.password !== formData.password2) {
			toast.error('Passwords do not match')
			return
		}
		
		setLoading(true)
		
		const result = await register(formData.username, formData.password, formData.password2)
		
		if (result.success) {
			toast.success('Registration successful!')
		} else {
			toast.error(result.error || 'Registration failed')
		}
		
		setLoading(false)
	}
	
	return (
		<form className="auth-form" onSubmit={handleSubmit}>
			<h2 className="auth-form__title">Регистрация</h2>
			
			<Input
				type="text"
				name="username"
				label="Имя пользователя"
				value={formData.username}
				onChange={handleChange}
				placeholder="Введите имя пользователя"
				required
			/>
			
			<Input
				type="password"
				name="password"
				label="Пароль"
				value={formData.password}
				onChange={handleChange}
				placeholder="Введите пароль"
				required
			/>
			
			<Input
				type="password"
				name="password2"
				label="Подтвердите пароль"
				value={formData.password2}
				onChange={handleChange}
				placeholder="Повторите пароль"
				required
			/>
			
			<div className="auth-form__button-wrapper">
				<Button type="submit" variant="primary" disabled={loading}>
					{loading ? 'Регистрация...' : 'Зарегистрироваться'}
				</Button>
			</div>
			
			<div className="auth-form__footer">
				<span>Уже есть аккаунт?</span>
				<button
					type="button"
					className="auth-form__link"
					onClick={onSwitchToLogin}
				>
					Войти
				</button>
			</div>
		</form>
	)
}

export default RegisterForm