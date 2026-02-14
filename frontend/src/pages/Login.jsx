import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import LoginForm from '../components/Auth/LoginForm'
import RegisterForm from '../components/Auth/RegisterForm'

function Login() {
	const [isLogin, setIsLogin] = useState(true)
	const { login, register } = useAuth()
	
	return (
		<div className="login-page">
			<div className="login-page__container">
				{isLogin ? (
					<LoginForm
						key="login"
						onSubmit={login}
						onSwitchToRegister={() => setIsLogin(false)}
					/>
				) : (
					<RegisterForm
						key="register"
						onSubmit={register}
						onSwitchToLogin={() => setIsLogin(true)}
					/>
				)}
			</div>
		</div>
	)
}

export default Login