import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import Modal from '../common/Modal'
import Button from '../common/Button'

function TeamDetailsModal({ team, onClose }) {
	const { user } = useAuth()
	
	const [members] = useState([
		{
			id: user.id || 1,
			username: user.username,
			avatar: user.avatar || null,
			roles: ['Создатель'],
		},
	])
	
	const handleJoinRequest = () => {
		toast.success('Заявка отправлена!')
		onClose()
	}
	
	const getAvatarLetter = (username) => {
		return username.charAt(0).toUpperCase()
	}
	
	const getTeamLetter = () => {
		return team.name.charAt(0).toUpperCase()
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
						<p className="team-details__description">{team.description || 'Нет описания'}</p>
						
						<div className="team-details__meta">
							<div className="team-details__meta-item">
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
									<circle cx="9" cy="7" r="4"/>
									<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
									<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
								</svg>
								<span>{team.memberCount} {team.memberCount === 1 ? 'участник' : 'участников'}</span>
							</div>
							
							{team.isPrivate && (
								<div className="team-details__meta-item team-details__meta-item--private">
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
										<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
									</svg>
									<span>Приватная команда</span>
								</div>
							)}
						</div>
					</div>
				</div>
				
				<div className="team-details__members">
					<h4 className="team-details__members-title">Участники</h4>
					<div className="team-details__members-list">
						{members.map(member => (
							<div key={member.id} className="team-member">
								<div className="team-member__avatar">
									{member.avatar ? (
										<img
											src={member.avatar}
											alt={member.username}
											className="team-member__avatar-img"
										/>
									) : (
										<div className="team-member__avatar-placeholder">
											{getAvatarLetter(member.username)}
										</div>
									)}
								</div>
								<div className="team-member__info">
									<div className="team-member__name">{member.username}</div>
									<div className="team-member__roles">
										{member.roles.slice(0, 2).map((role, index) => (
											<span key={index} className="team-member__role">
                        {role}
                      </span>
										))}
										{member.roles.length > 2 && (
											<span className="team-member__role-more">
                        +{member.roles.length - 2}
                      </span>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
				
				<div className="modal__actions">
					<Button type="button" variant="secondary" onClick={onClose}>
						Закрыть
					</Button>
					<Button type="button" variant="primary" onClick={handleJoinRequest}>
						Подать заявку
					</Button>
				</div>
			</div>
		</Modal>
	)
}

export default TeamDetailsModal