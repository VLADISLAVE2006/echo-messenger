import { useState } from 'react'
import toast from 'react-hot-toast'
import Button from '../common/Button'
import Input from '../common/Input'

function LoginForm({ onSubmit, onSwitchToRegister }) {
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
		
		if (!formData.username || !formData.password) {
			toast.error('Заполните все поля')
			return
		}
		
		setLoading(true)
		const result = await onSubmit(formData.username, formData.password)
		setLoading(false)
		
		if (!result.success) {
			toast.error(result.error || 'Ошибка входа')
		} else {
			toast.success('Вход выполнен успешно!')
		}
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