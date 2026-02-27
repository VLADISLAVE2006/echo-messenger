import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/layout/Layout'
import Button from '../components/common/Button'
import Loading from '../components/common/Loading'

function Dashboard() {
	const navigate = useNavigate()
	const location = useLocation()
	const { user } = useAuth()
	const [teams, setTeams] = useState([])
	const [loading, setLoading] = useState(location.state?.fromTeamWorkspace || false)
	
	useEffect(() => {
		if (location.state?.fromTeamWorkspace) {
			window.history.replaceState({}, document.title)
		}
		
		loadTeams()
	}, [])
	
	const loadTeams = async () => {
		try {
			const password = localStorage.getItem('password')
			
			if (!password) {
				setLoading(false)
				return
			}
			
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
				
				// Загружаем участников для каждой команды
				const teamsWithMembers = await Promise.all(
					(data.teams || []).map(async (team) => {
						try {
							const teamParams = new URLSearchParams({
								username: user.username,
								password: password,
							})
							
							const teamResponse = await fetch(`http://localhost:5000/api/teams/${team.id}?${teamParams}`, {
								method: 'GET',
								headers: {
									'Content-Type': 'application/json',
								},
							})
							
							if (teamResponse.ok) {
								const teamData = await teamResponse.json()
								return {
									...team,
									members: teamData.members || [],
								}
							}
						} catch (error) {
							console.error(`Error loading team ${team.id}:`, error)
						}
						return null
					})
				)
				
				// Фильтруем только команды где пользователь является участником
				const userTeams = teamsWithMembers.filter(team => {
					if (!team) return false
					
					if (team.members && team.members.length > 0) {
						return team.members.some(member =>
							member.username === user.username || member.id === user.id
						)
					}
					
					return team.created_by === user.id
				})
				
				setTeams(userTeams)
			}
		} catch (error) {
			console.error('Error loading teams:', error)
		} finally {
			setLoading(false)
		}
	}
	
	const handleTeamClick = (teamId) => {
		navigate(`/team/${teamId}`)
	}
	
	const getTeamLetter = (name) => {
		return name.charAt(0).toUpperCase()
	}
	
	if (loading) {
		return (
			<Layout>
				<Loading message="Загрузка команд..." />
			</Layout>
		)
	}
	
	return (
		<Layout>
			<div className="dashboard">
				<div className="dashboard__container">
					<div className="dashboard__header">
						<h1 className="dashboard__title">Мои команды</h1>
					</div>
					
					{teams.length === 0 ? (
						<div className="dashboard__empty">
							<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
								<circle cx="9" cy="7" r="4"/>
								<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
								<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
							</svg>
							<h3>Список команд пуст</h3>
							<p>Создай или присоединись к команде</p>
						</div>
					) : (
						<div className="dashboard__grid">
							{teams.map(team => (
								<div
									key={team.id}
									className="dashboard-card"
									onClick={() => handleTeamClick(team.id)}
								>
									<div className="dashboard-card__header">
										<div className="dashboard-card__avatar">
											{team.avatar ? (
												<img
													src={team.avatar}
													alt={team.name}
													className="dashboard-card__avatar-img"
												/>
											) : (
												<div className="dashboard-card__avatar-placeholder">
													{getTeamLetter(team.name)}
												</div>
											)}
										</div>
										
										<div className="dashboard-card__content">
											<h3 className="dashboard-card__name">{team.name}</h3>
											<div className="dashboard-card__meta">
												<div className="dashboard-card__members">
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
														<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
														<circle cx="9" cy="7" r="4"/>
														<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
														<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
													</svg>
													<span>{team.member_count}</span>
												</div>
												
												{team.is_private === 1 && (
													<div className="dashboard-card__badge">
														<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
															<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
															<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
														</svg>
														<span>Private</span>
													</div>
												)}
											</div>
										</div>
									</div>
									
									<p className="dashboard-card__description">
										{team.description || 'Нет описания'}
									</p>
									
									<div className="dashboard-card__actions">
										<Button
											variant="primary"
											onClick={(e) => {
												e.stopPropagation()
												handleTeamClick(team.id)
											}}
										>
											Открыть
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</Layout>
	)
}

export default Dashboard