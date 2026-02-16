import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import Modal from '../common/Modal'
import Button from '../common/Button'

function TeamDetailsModal({ team, onClose }) {
	const { user } = useAuth()
	const [loading, setLoading] = useState(false)
	
	const handleJoinRequest = async () => {
		setLoading(true)
		
		try {
			const password = localStorage.getItem('password')
			
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
				toast.success('Request sent successfully!')
				onClose()
			} else {
				const error = await response.json()
				toast.error(error.error || 'Failed to send request')
			}
		} catch (error) {
			console.error('Error sending request:', error)
			toast.error('Failed to send request')
		} finally {
			setLoading(false)
		}
	}
	
	const getAvatarLetter = (username) => {
		return username.charAt(0).toUpperCase()
	}
	
	const getTeamLetter = () => {
		return team.name.charAt(0).toUpperCase()
	}
	
	const memberCount = team.member_count || 1
	
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
				
				<div className="modal__actions">
					<Button type="button" variant="secondary" onClick={onClose}>
						Close
					</Button>
					<Button
						type="button"
						variant="primary"
						onClick={handleJoinRequest}
						disabled={loading}
					>
						{loading ? 'Sending...' : 'Send Request'}
					</Button>
				</div>
			</div>
		</Modal>
	)
}

export default TeamDetailsModal