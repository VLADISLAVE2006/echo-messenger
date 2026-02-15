import Button from '../common/Button'

function TeamHeader({ teamName, onBack, onOpenSettings }) {
	return (
		<div className="team-header">
			<div className="team-header__left">
				<button className="team-header__back" onClick={onBack}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M19 12H5M12 19l-7-7 7-7"/>
					</svg>
					<span>Back to Teams</span>
				</button>
				<h1 className="team-header__title">{teamName}</h1>
			</div>
			
			<div className="team-header__right">
				<Button variant="secondary" onClick={onOpenSettings}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<circle cx="12" cy="12" r="3"/>
						<path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
					</svg>
					Settings
				</Button>
			</div>
		</div>
	)
}

export default TeamHeader