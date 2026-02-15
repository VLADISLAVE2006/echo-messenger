function MembersList({ teamId, teamData }) {
	if (!teamData) {
		return (
			<div className="members-list">
				<div className="members-list__loading">Loading members...</div>
			</div>
		)
	}
	
	const { members } = teamData
	
	const onlineMembers = members.filter(m => m.roles.includes('Создатель')) // Временно: создатель = онлайн
	const offlineMembers = members.filter(m => !m.roles.includes('Создатель'))
	
	const getAvatarLetter = (username) => {
		return username.charAt(0).toUpperCase()
	}
	
	return (
		<div className="members-list">
			<div className="members-list__header">
				<h2 className="members-list__title">Team Members</h2>
				<span className="members-list__count">{members.length} members</span>
			</div>
			
			{onlineMembers.length > 0 && (
				<div className="members-list__section">
					<h3 className="members-list__section-title">Online - {onlineMembers.length}</h3>
					<div className="members-list__content">
						{onlineMembers.map(member => (
							<div key={member.id} className="member-card">
								<div className="member-card__status member-card__status--online" />
								
								<div className="member-card__avatar">
									{member.avatar ? (
										<img
											src={member.avatar}
											alt={member.username}
											className="member-card__avatar-img"
										/>
									) : (
										<div className="member-card__avatar-placeholder">
											{getAvatarLetter(member.username)}
										</div>
									)}
								</div>
								
								<div className="member-card__info">
									<div className="member-card__name">{member.username}</div>
									<div className="member-card__roles">
										{member.roles.slice(0, 2).map((role, index) => (
											<span key={index} className="member-card__role">{role}</span>
										))}
										{member.roles.length > 2 && (
											<span className="member-card__role-more">+{member.roles.length - 2}</span>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
			
			{offlineMembers.length > 0 && (
				<div className="members-list__section">
					<h3 className="members-list__section-title">Offline - {offlineMembers.length}</h3>
					<div className="members-list__content">
						{offlineMembers.map(member => (
							<div key={member.id} className="member-card">
								<div className="member-card__status member-card__status--offline" />
								
								<div className="member-card__avatar">
									{member.avatar ? (
										<img
											src={member.avatar}
											alt={member.username}
											className="member-card__avatar-img"
										/>
									) : (
										<div className="member-card__avatar-placeholder">
											{getAvatarLetter(member.username)}
										</div>
									)}
								</div>
								
								<div className="member-card__info">
									<div className="member-card__name">{member.username}</div>
									<div className="member-card__roles">
										{member.roles.slice(0, 2).map((role, index) => (
											<span key={index} className="member-card__role">{role}</span>
										))}
										{member.roles.length > 2 && (
											<span className="member-card__role-more">+{member.roles.length - 2}</span>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

export default MembersList