import { useState } from 'react'
import LoginForm from '@features/LoginForm'
import RegisterForm from '@features/RegisterForm'

function Login() {
	const [isLogin, setIsLogin] = useState(true)

	return (
		<div className="login-page">
			<div className="login-page__container">
				{isLogin ? (
					<LoginForm
						key="login"
						onSwitchToRegister={() => setIsLogin(false)}
					/>
				) : (
					<RegisterForm
						key="register"
						onSwitchToLogin={() => setIsLogin(true)}
					/>
				)}
			</div>
		</div>
	)
}

export default Login
