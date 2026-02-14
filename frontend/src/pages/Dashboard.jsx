import { useAuth } from '../context/AuthContext'
import Layout from '../components/layout/Layout'

function Dashboard() {
	const { user } = useAuth()
	
	return (
		<Layout>
			<div className="dashboard">
				<div className="dashboard__container">
					<h2 className="dashboard__title">
						Привет, {user?.username}! 👋
					</h2>
					<p className="dashboard__subtitle">
						Добро пожаловать в Echo Messenger
					</p>
					
					{/* TODO: Добавим виджеты позже */}
					<div className="dashboard__widgets">
						<div className="widget">
							<h3>Активные чаты</h3>
							<p>Пока нет активных чатов</p>
						</div>
						
						<div className="widget">
							<h3>Pomodoro</h3>
							<p>Готов к работе!</p>
						</div>
					</div>
				</div>
			</div>
		</Layout>
	)
}

export default Dashboard