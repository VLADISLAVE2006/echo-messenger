import { useState, useEffect } from 'react'

function StatsWidget({ teamId, teamData, isPinned, onTogglePin }) {
	const [stats, setStats] = useState({
		totalMembers: 0,
		onlineMembers: 0,
		totalMessages: 0,
		todayMessages: 0,
	})
	
	useEffect(() => {
		if (teamData) {
			setStats({
				totalMembers: teamData.members?.length || 0,
				onlineMembers: 1, // Текущий пользователь всегда онлайн
				totalMessages: 0, // Будет реализовано позже
				todayMessages: 0, // Будет реализовано позже
			})
		}
	}, [teamData])
	
	const statItems = [
		{
			label: 'Total Members',
			value: stats.totalMembers,
			icon: (
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
					<circle cx="9" cy="7" r="4"/>
					<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
					<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
				</svg>
			),
			color: 'blue',
		},
		{
			label: 'Online Now',
			value: stats.onlineMembers,
			icon: (
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
					<circle cx="12" cy="12" r="10"/>
					<line x1="12" y1="16" x2="12" y2="12"/>
					<line x1="12" y1="8" x2="12.01" y2="8"/>
				</svg>
			),
			color: 'green',
		},
		{
			label: 'Total Messages',
			value: stats.totalMessages,
			icon: (
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
				</svg>
			),
			color: 'purple',
		},
		{
			label: 'Today',
			value: stats.todayMessages,
			icon: (
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
					<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
				</svg>
			),
			color: 'orange',
		},
	]
	
	return (
		<div className="widget stats-widget">
			<div className="widget__header">
				<h3 className="widget__title">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<line x1="18" y1="20" x2="18" y2="10"/>
						<line x1="12" y1="20" x2="12" y2="4"/>
						<line x1="6" y1="20" x2="6" y2="14"/>
					</svg>
					Team Stats
				</h3>
				<button
					className={`widget__pin ${isPinned ? 'widget__pin--active' : ''}`}
					onClick={onTogglePin}
					title={isPinned ? 'Unpin widget' : 'Pin widget'}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M9 9V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/>
						<path d="M12 9v12"/>
						<path d="M6 14l6-4 6 4"/>
					</svg>
				</button>
			</div>
			
			<div className="widget__content">
				<div className="stats-widget__grid">
					{statItems.map((item, index) => (
						<div key={index} className={`stats-widget__item stats-widget__item--${item.color}`}>
							<div className="stats-widget__icon">{item.icon}</div>
							<div className="stats-widget__info">
								<div className="stats-widget__value">{item.value}</div>
								<div className="stats-widget__label">{item.label}</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

export default StatsWidget