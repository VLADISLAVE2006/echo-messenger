import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/layout/Layout'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import TeamCard from '../components/Teams/TeamCard'
import CreateTeamModal from '../components/Teams/CreateTeamModal'
import TeamDetailsModal from '../components/Teams/TeamDetailsModal'

function Teams() {
	const { user } = useAuth()
	const [searchQuery, setSearchQuery] = useState('')
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
	const [selectedTeam, setSelectedTeam] = useState(null)
	const [teams, setTeams] = useState([])
	const [loading, setLoading] = useState(false)
	
	useEffect(() => {
		loadTeams()
	}, [])
	
	const loadTeams = async () => {
		try {
			const password = localStorage.getItem('password')
			
			if (!password) {
				return
			}
			
			// Передаем через query params для GET запроса
			const params = new URLSearchParams({
				username: user.username,
				password: password,
			})
			
			const response = await fetch(`http://localhost:5000/api/teams?${params}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			})
			
			if (response.ok) {
				const data = await response.json()
				setTeams(data.teams || [])
			}
		} catch (error) {
			console.error('Error loading teams:', error)
		}
	}
	
	const filteredTeams = teams.filter(team =>
		team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		(team.description || '').toLowerCase().includes(searchQuery.toLowerCase())
	)
	
	const handleViewTeam = (team) => {
		setSelectedTeam(team)
	}
	
	const handleCreateTeam = (teamData) => {
		loadTeams()
		setIsCreateModalOpen(false)
	}
	
	return (
		<Layout>
			<div className="teams">
				<div className="teams__container">
					<div className="teams__header">
						<h2 className="teams__title">Команды</h2>
						<Button
							variant="primary"
							onClick={() => setIsCreateModalOpen(true)}
						>
							Создать команду
						</Button>
					</div>
					
					<div className="teams__search">
						<Input
							type="text"
							placeholder="Search teams..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					
					{teams.length > 0 ? (
						<div className="teams__grid">
							{filteredTeams.length > 0 ? (
								filteredTeams.map(team => (
									<TeamCard
										key={team.id}
										team={team}
										onView={handleViewTeam}
									/>
								))
							) : (
								<div className="teams__empty">
									<p>No teams found</p>
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
							<h3>No teams</h3>
							<p>Create your first team or find an existing one</p>
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