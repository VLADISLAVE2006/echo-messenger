import { useAuth } from '../../../context/AuthContext'

function MembersList({ teamId, teamData }) {
	const { user } = useAuth()
	
	// Проверяем, является ли пользователь админом
	const isAdmin = teamData?.members?.some(
		m => m.username === user.username && m.roles?.includes('Создатель')
	) || false
	
	const getAvatarLetter = (username) => {
		return username?.charAt(0).toUpperCase() || 'U'
	}
	
	// Пока нет API is_online, показываем всех как offline
	const members = teamData?.members || []
	
	return (
		<div className="members-list">
			{members.length > 0 ? (
				<div className="members-list__section">
					<h3 className="members-list__title">
						Members — {members.length}
					</h3>
					<div className="members-list__items">
						{members.map(member => (
							<div key={member.id} className="member-item">
								<div className="member-item__avatar">
									{member.avatar ? (
										<img
											src={member.avatar}
											alt={member.username}
											className="member-item__avatar-img"
										/>
									) : (
										<div className="member-item__avatar-placeholder">
											{getAvatarLetter(member.username)}
										</div>
									)}
								</div>
								
								<div className="member-item__info">
									<div className="member-item__name">{member.username}</div>
									<div className="member-item__roles">
										{member.roles?.map((role, index) => (
											<span key={index} className="member-item__role">
                        {role}
                      </span>
										)) || <span className="member-item__role">Member</span>}
									</div>
								</div>
								
								{/* Временно убрано удаление - API не готов */}
							</div>
						))}
					</div>
				</div>
			) : (
				<div className="members-list__empty">
					<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
						<circle cx="9" cy="7" r="4"/>
						<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
						<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
					</svg>
					<p>No members yet</p>
				</div>
			)}
		</div>
	)
}

export default MembersList