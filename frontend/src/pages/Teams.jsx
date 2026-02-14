import Layout from '../components/layout/Layout'
import Button from '../components/common/Button'

function Teams() {
	return (
		<Layout>
			<div className="teams">
				<div className="teams__container">
					<div className="teams__header">
						<h2 className="teams__title">Команды</h2>
						<Button variant="primary">
							Создать команду
						</Button>
					</div>
					
					<div className="teams__content">
						<p>Здесь будет поиск и список команд</p>
					</div>
				</div>
			</div>
		</Layout>
	)
}

export default Teams