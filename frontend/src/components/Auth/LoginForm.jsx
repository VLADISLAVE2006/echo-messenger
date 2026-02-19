import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import Button from '../common/Button'
import Input from '../common/Input'

function LoginForm({ onSwitchToRegister }) {
	const { login } = useAuth()
	const [formData, setFormData] = useState({
		username: '',
		password: '',
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
		setLoading(true)
		
		const result = await login(formData.username, formData.password)
		
		if (result.success) {
			toast.success('Вход выполнен!')
		} else {
			toast.error(result.error || 'Ошибка входа')
		}
		
		setLoading(false)
	}
	
	return (
		<form className="auth-form" onSubmit={handleSubmit}>
			<h2 className="auth-form__title">Вход</h2>
			
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
			
			<div className="auth-form__button-wrapper">
				<Button type="submit" variant="primary" disabled={loading}>
					{loading ? 'Вход...' : 'Войти'}
				</Button>
			</div>
			
			<div className="auth-form__footer">
				<span>Нет аккаунта?</span>
				<button
					type="button"
					className="auth-form__link"
					onClick={onSwitchToRegister}
				>
					Зарегистрироваться
				</button>
			</div>
		</form>
	)
}

export default LoginForm