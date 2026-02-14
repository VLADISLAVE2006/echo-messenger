import { useState } from 'react'
import toast from 'react-hot-toast'
import Button from '../common/Button'
import Input from '../common/Input'

function RegisterForm({ onSubmit, onSwitchToLogin }) {
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
		
		if (!formData.username || !formData.password || !formData.password2) {
			toast.error('Заполните все поля')
			return
		}
		
		if (formData.password !== formData.password2) {
			toast.error('Пароли не совпадают')
			return
		}
		
		if (formData.password.length < 6) {
			toast.error('Пароль должен быть не менее 6 символов')
			return
		}
		
		setLoading(true)
		const result = await onSubmit(formData.username, formData.password, formData.password2)
		setLoading(false)
		
		if (!result.success) {
			toast.error(result.error || 'Ошибка регистрации')
		} else {
			toast.success('Регистрация успешна!')
		}
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