function TeamWorkspaceLayout({ activeTab, onTabChange, content, chat }) {
	const tabs = [
		{ id: 'whiteboard', label: 'Whiteboard' },
		{ id: 'tools', label: 'Tools' },
		{ id: 'members', label: 'Members' },
	]
	
	return (
		<div className="team-workspace-layout">
			<div className="team-workspace-layout__main">
				<div className="team-workspace-layout__tabs">
					{tabs.map(tab => (
						<button
							key={tab.id}
							className={`team-workspace-layout__tab ${
								activeTab === tab.id ? 'team-workspace-layout__tab--active' : ''
							}`}
							onClick={() => onTabChange(tab.id)}
						>
							{tab.label}
						</button>
					))}
				</div>
				
				<div className="team-workspace-layout__content">
					{content}
				</div>
			</div>
			
			<div className="team-workspace-layout__chat">
				{chat}
			</div>
		</div>
	)
}

export default TeamWorkspaceLayout