import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@shared/api/api'

function StatsWidget({
	teamId,
	teamData,
	socket,
	widgetId,
	title,
	onTitleChange,
	onDelete,
	onRename,
	isEditingTitle,
	editTitleValue,
	onEditTitleChange,
	onSaveTitle,
	onCancelEdit
}) {
	const [stats, setStats] = useState({
		totalMembers: 0,
		onlineMembers: 0,
		totalMessages: 0,
		todayMessages: 0,
	})
	const onlineUsersRef = useRef(new Set())

	useEffect(() => {
		if (teamData) {
			setStats(prev => ({ ...prev, totalMembers: teamData.members?.length || 0 }))
		}
	}, [teamData])

	useEffect(() => {
		if (!socket || !teamId) return

		const handleJoinedTeam = (data) => {
			if (parseInt(data.team_id) !== parseInt(teamId)) return
			const set = new Set(data.online_users || [])
			onlineUsersRef.current = set
			setStats(prev => ({ ...prev, onlineMembers: set.size }))
		}

		const handleOnlineList = (data) => {
			if (parseInt(data.team_id) !== parseInt(teamId)) return
			const set = new Set(data.online_users || [])
			onlineUsersRef.current = set
			setStats(prev => ({ ...prev, onlineMembers: set.size }))
		}

		const handleUserOnline = (data) => {
			if (parseInt(data.team_id) !== parseInt(teamId)) return
			onlineUsersRef.current.add(data.user_id)
			setStats(prev => ({ ...prev, onlineMembers: onlineUsersRef.current.size }))
		}

		const handleUserOffline = (data) => {
			if (parseInt(data.team_id) !== parseInt(teamId)) return
			onlineUsersRef.current.delete(data.user_id)
			setStats(prev => ({ ...prev, onlineMembers: onlineUsersRef.current.size }))
		}

		const handleNewMessage = (message) => {
			if (!message) return
			const today = new Date().toDateString()
			const messageDate = message.created_at ? new Date(message.created_at).toDateString() : today
			setStats(prev => ({
				...prev,
				totalMessages: prev.totalMessages + 1,
				todayMessages: messageDate === today ? prev.todayMessages + 1 : prev.todayMessages,
			}))
		}

		socket.on('joined_team', handleJoinedTeam)
		socket.on('online_users_list', handleOnlineList)
		socket.on('user_online', handleUserOnline)
		socket.on('user_offline', handleUserOffline)
		socket.on('new_message', handleNewMessage)

		socket.getOnlineUsers(teamId)

		return () => {
			socket.off('joined_team', handleJoinedTeam)
			socket.off('online_users_list', handleOnlineList)
			socket.off('user_online', handleUserOnline)
			socket.off('user_offline', handleUserOffline)
			socket.off('new_message', handleNewMessage)
		}
	}, [socket, teamId])

	useEffect(() => {
		if (!teamId) return

		apiFetch(`/teams/${teamId}/stats`)
			.then(data => {
				setStats(prev => ({
					...prev,
					totalMessages: data.total_messages || 0,
					todayMessages: data.today_messages || 0,
				}))
			})
			.catch(() => {
				setStats(prev => ({ ...prev, totalMessages: 0, todayMessages: 0 }))
			})
	}, [teamId])

	const statItems = [
		{ label: 'Всего участников', value: stats.totalMembers, icon: '👥', color: 'blue' },
		{ label: 'Сейчас онлайн', value: stats.onlineMembers, icon: '🟢', color: 'green' },
		{ label: 'Сообщений', value: stats.totalMessages, icon: '💬', color: 'purple' },
		{ label: 'Активность сегодня', value: stats.todayMessages, icon: '📈', color: 'orange' },
	]

	return (
		<div className="widget stats-widget">
			<div className="widget__header">
				{isEditingTitle ? (
					<div className="widget__title-edit">
						<input
							type="text"
							value={editTitleValue}
							onChange={(e) => onEditTitleChange(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && onSaveTitle()}
							autoFocus
						/>
						<button onClick={onSaveTitle}>✓</button>
						<button onClick={onCancelEdit}>✕</button>
					</div>
				) : (
					<h3 className="widget__title" onDoubleClick={onRename}>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<line x1="18" y1="20" x2="18" y2="10"/>
							<line x1="12" y1="20" x2="12" y2="4"/>
							<line x1="6" y1="20" x2="6" y2="14"/>
						</svg>
						{title}
					</h3>
				)}
				<button className="widget__delete" onClick={onDelete} title="Удалить виджет">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<line x1="18" y1="6" x2="6" y2="18"/>
						<line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>

			<div className="widget__content">
				<div className="stats-widget__grid">
					{statItems.map((item, idx) => (
						<div key={idx} className={`stats-widget__item stats-widget__item--${item.color}`}>
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
