import { useState, useEffect } from 'react'
import { apiFetch } from '@shared/api/api'
import Layout from '@widgets/Layout'
import Button from '@shared/ui/Button'
import Input from '@shared/ui/Input'
import TeamCard from '@entities/TeamCard'
import CreateTeamModal from '@features/CreateTeamModal'
import TeamDetailsModal from '@features/TeamDetailsModal'
import toast from 'react-hot-toast'

function Teams() {
	const [searchQuery, setSearchQuery] = useState('')
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
	const [selectedTeam, setSelectedTeam] = useState(null)
	const [teams, setTeams] = useState([])
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		loadTeams()
	}, [])

	const loadTeams = async () => {
		setLoading(true)
		try {
			const data = await apiFetch('/teams/public')
			setTeams(data.teams || [])
		} catch (error) {
			console.error('Error loading teams:', error)
			toast.error('Не удалось загрузить команды')
		} finally {
			setLoading(false)
		}
	}

	const filteredTeams = teams.filter(team =>
		team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		(team.description || '').toLowerCase().includes(searchQuery.toLowerCase())
	)

	const handleViewTeam = (team) => setSelectedTeam(team)

	const handleCreateTeam = () => {
		loadTeams()
		setIsCreateModalOpen(false)
	}

	return (
		<Layout>
			<div className="teams">
				<div className="teams__container">
					<div className="teams__header">
						<h2 className="teams__title">Команды</h2>
						<Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
							Создать команду
						</Button>
					</div>

					<div className="teams__search">
						<Input
							type="text"
							placeholder="Поиск команд..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>

					{loading ? (
						<div className="teams__loading">
							<div className="loading-spinner"></div>
						</div>
					) : teams.length > 0 ? (
						<div className="teams__grid">
							{filteredTeams.length > 0 ? (
								filteredTeams.map(team => (
									<TeamCard
										key={team.id}
										team={team}
										onView={handleViewTeam}
										onUpdate={loadTeams}
									/>
								))
							) : (
								<div className="teams__empty">
									<p>Команды не найдены</p>
								</div>
							)}
						</div>
					) : (
						<div className="teams__empty-state">
							<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
								<circle cx="9" cy="7" r="4"/>
								<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
								<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
							</svg>
							<h3>Нет команд</h3>
							<p>Создайте первую команду или найдите существующую</p>
						</div>
					)}
				</div>
			</div>

			{isCreateModalOpen && (
				<CreateTeamModal
					onClose={() => setIsCreateModalOpen(false)}
					onCreate={handleCreateTeam}
				/>
			)}

			{selectedTeam && (
				<TeamDetailsModal
					team={selectedTeam}
					onClose={() => setSelectedTeam(null)}
				/>
			)}
		</Layout>
	)
}

export default Teams
