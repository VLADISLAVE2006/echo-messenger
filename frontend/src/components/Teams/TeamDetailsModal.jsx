import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Modal from '../common/Modal'
import Button from '../common/Button'

function TeamDetailsModal({ team, onClose }) {
	const { user } = useAuth()
	const navigate = useNavigate()
	const [loading, setLoading] = useState(false)
	const [members, setMembers] = useState([])
	const [teamDetails, setTeamDetails] = useState(null)
	
	useEffect(() => {
		loadTeamDetails()
	}, [team.id])
	
	const loadTeamDetails = async () => {
		try {
			const password = localStorage.getItem('password')
			
			const params = new URLSearchParams({
				username: user.username,
				password: password,
			})
			
			console.log('Loading team details for team:', team.id)
			
			const response = await fetch(`http://localhost:5000/api/teams/${team.id}?${params}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			})
			
			if (response.ok) {
				const data = await response.json()
				console.log('Team details loaded:', data)
				setTeamDetails(data.team)
				setMembers(data.members || [])
			} else {
				console.error('Failed to load team details:', response.status)
			}
		} catch (error) {
			console.error('Error loading team details:', error)
		}
	}
	
	const handleJoinOrRequest = async () => {
		setLoading(true)
		
		try {
			const password = localStorage.getItem('password')
			
			// Если приватная - отправляем заявку
			if (team.is_private) {
				const response = await fetch(`http://localhost:5000/api/teams/${team.id}/request`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						username: user.username,
						password: password,
					}),
				})
				
				if (response.ok) {
					toast.success('Join request sent!')
					onClose()
				} else {
					const error = await response.json()
					toast.error(error.error || 'Failed to send request')
				}
			} else {
				// Если публичная - вступаем сразу
				const response = await fetch(`http://localhost:5000/api/teams/${team.id}/join`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						username: user.username,
						password: password,
					}),
				})
				
				if (response.ok) {
					toast.success('Вы успешно вступили в команду!') // ⬅️ Изменено
					onClose()
					navigate(`/team/${team.id}`)
				} else {
					const error = await response.json()
					toast.error(error.error || 'Failed to join team')
				}
			}
		} catch (error) {
			console.error('Error joining team:', error)
			toast.error('Failed to join team')
		} finally {
			setLoading(false)
		}
	}
	
	const getAvatarLetter = (username) => {
		return username?.charAt(0).toUpperCase() || 'U'
	}
	
	const getTeamLetter = () => {
		return team.name.charAt(0).toUpperCase()
	}
	
	const memberCount = teamDetails?.member_count || members.length || team.member_count || 1
	
	// Определяем текст кнопки
	const getButtonText = () => {
		if (loading) return 'Sending...'
		if (team.is_member) return 'Open Team'
		if (team.has_pending_request) return 'Request Sent'
		if (team.is_private) return 'Request to Join'
		return 'Join Now'
	}
	
	// Определяем действие кнопки
	const handleButtonClick = () => {
		if (team.is_member) {
			onClose()
			navigate(`/team/${team.id}`)
		} else if (!team.has_pending_request) {
			handleJoinOrRequest()
		}
	}
	
	return (
		<Modal title={team.name} onClose={onClose}>
			<div className="team-details">
				<div className="team-details__header">
					<div className="team-details__avatar">
						{team.avatar ? (
							<img
								src={team.avatar}
								alt={team.name}
								className="team-details__avatar-img"
							/>
						) : (
							<div className="team-details__avatar-placeholder">
								{getTeamLetter()}
							</div>
						)}
					</div>
					
					<div className="team-details__info">
						<p className="team-details__description">{team.description || 'No description'}</p>
						
						<div className="team-details__meta">
							<div className="team-details__meta-item">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
									<circle cx="9" cy="7" r="4"/>
									<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
									<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
								</svg>
								<span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
							</div>
							
							{(team.is_private === 1 || team.isPrivate) && (
								<div className="team-details__meta-item team-details__meta-item--private">
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
										<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
									</svg>
									<span>Private team</span>
								</div>
							)}
						</div>
					</div>
				</div>
				
				{members.length > 0 && (
					<div className="team-details__members">
						<h4 className="team-details__members-title">Members</h4>
						<div className="team-details__members-list">
							{members.map(member => (
								<div key={member.id} className="team-details__member">
									<div className="team-details__member-avatar">
										{member.avatar ? (
											<img src={member.avatar} alt={member.username} />
										) : (
											<div className="team-details__member-avatar-placeholder">
												{getAvatarLetter(member.username)}
											</div>
										)}
									</div>
									<div className="team-details__member-info">
										<p className="team-details__member-name">{member.username}</p>
										{member.roles && member.roles.length > 0 && (
											<span className="team-details__member-role">
                        {member.roles.join(', ')}
                      </span>
										)}
									</div>
								</div>
							))}
						</div>
					</div>
				)}
				
				<div className="modal__actions">
					<Button type="button" variant="secondary" onClick={onClose}>
						Close
					</Button>
					<Button
						type="button"
						variant="primary"
						onClick={handleButtonClick}
						disabled={loading || team.has_pending_request}
					>
						{getButtonText()}
					</Button>
				</div>
			</div>
		</Modal>
	)
}

export default TeamDetailsModal