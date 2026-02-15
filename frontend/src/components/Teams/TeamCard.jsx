import Button from '../common/Button'

function TeamCard({ team, onView }) {
	const getTeamLetter = () => {
		return team.name.charAt(0).toUpperCase()
	}
	
	return (
		<div className="team-card">
			<div className="team-card__header">
				<div className="team-card__avatar">
					{team.avatar ? (
						<img
							src={team.avatar}
							alt={team.name}
							className="team-card__avatar-img"
						/>
					) : (
						<div className="team-card__avatar-placeholder">
							{getTeamLetter()}
						</div>
					)}
				</div>
				
				<div className="team-card__info">
					<h3 className="team-card__name">{team.name}</h3>
					<div className="team-card__meta">
						<div className="team-card__members">
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
								<circle cx="9" cy="7" r="4"/>
								<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
								<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
							</svg>
							<span>{team.memberCount}</span>
						</div>
						
						{team.isPrivate && (
							<div className="team-card__badge">
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
									<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
								</svg>
								<span>Приватная</span>
							</div>
						)}
					</div>
				</div>
			</div>
			
			<p className="team-card__description">
				{team.description || 'Нет описания'}
			</p>
			
			<div className="team-card__actions">
				<Button
					variant="primary"
					onClick={() => onView(team)}
				>
					Подробнее
				</Button>
			</div>
		</div>
	)
}

export default TeamCard