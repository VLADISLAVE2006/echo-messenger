import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@shared/context/AuthContext'
import { useSocket } from '@shared/hooks/useSocket'
import { apiFetch } from '@shared/api/api'
import Button from '@shared/ui/Button'
import WhiteboardCanvas from '@widgets/WhiteboardCanvas'
import ToolsGrid from '@widgets/ToolsGrid'
import MembersList from '@widgets/MembersList'
import ChatPanel from '@widgets/ChatPanel'
import SettingsModal from '@features/SettingsModal'
import TeamPoll from '@widgets/TeamPoll'
import CreatePollModal from '@features/CreatePollModal'
import Loading from '@shared/ui/Loading'
import toast from 'react-hot-toast'

function TeamWorkspace() {
	const { teamId } = useParams()
	const navigate = useNavigate()
	const { user } = useAuth()
	const [activeTab, setActiveTab] = useState('whiteboard')
	const [isSettingsOpen, setIsSettingsOpen] = useState(false)
	const [isCreatePollOpen, setIsCreatePollOpen] = useState(false)
	const [activePoll, setActivePoll] = useState(null)
	const [teamData, setTeamData] = useState(null)
	const [members, setMembers] = useState([])
	const [loading, setLoading] = useState(true)

	const socket = useSocket(teamId, user)

	const isAdmin = members?.some(
		m => m.username === user.username && (m.roles?.includes('Admin') || m.roles?.includes('Создатель'))
	) || false

	useEffect(() => {
		loadTeamData()
	}, [teamId])

	useEffect(() => {
		if (!socket.socket) return

		socket.on('user_online', () => loadTeamData())
		socket.on('user_offline', () => loadTeamData())

		socket.on('new_poll', (poll) => {
			toast.success(`Новое голосование: ${poll.question}`)
			setActivePoll(poll)
		})

		socket.on('poll_updated', (data) => {
			setActivePoll(prev => {
				if (!prev || prev.id !== data.poll_id) return prev
				return {
					...prev,
					options: prev.options.map(opt =>
						opt.id === data.option_id ? { ...opt, votes: data.votes } : opt
					)
				}
			})
		})

		socket.on('poll_closed', () => setActivePoll(null))

		socket.on('team_deleted', (data) => {
			if (parseInt(data.team_id) === parseInt(teamId)) {
				toast.error('Группа была удалена администратором')
				navigate('/dashboard')
			}
		})

		return () => {
			socket.off('user_online')
			socket.off('user_offline')
			socket.off('new_poll')
			socket.off('poll_updated')
			socket.off('poll_closed')
			socket.off('team_deleted')
		}
	}, [socket.socket])

	const loadTeamData = async () => {
		try {
			const data = await apiFetch(`/teams/${teamId}`)
			setTeamData(data.team)
			setMembers(data.members || [])
			setActivePoll(data.active_poll || null)
		} catch (error) {
			if (error.message?.includes('404') || error.message?.includes('403')) {
				navigate('/dashboard')
			} else {
				console.error('Error loading team:', error)
			}
		} finally {
			setLoading(false)
		}
	}

	const handleBack = () => navigate('/dashboard', { state: { fromTeamWorkspace: true } })
	const handleUpdate = () => loadTeamData()
	const handlePollCreated = (poll) => {
		setActivePoll(poll)
		setIsCreatePollOpen(false)
	}

	const renderContent = () => {
		switch (activeTab) {
			case 'whiteboard':
				return <WhiteboardCanvas teamId={teamId} socket={socket} />
			case 'tools':
				return <ToolsGrid teamId={teamId} teamData={{ ...teamData, members }} socket={socket} />
			case 'members':
				return <MembersList teamId={teamId} teamData={{ ...teamData, members }} onRoleChanged={loadTeamData} />
			default:
				return <WhiteboardCanvas teamId={teamId} socket={socket} />
		}
	}

	if (loading) {
		return (
			<div className="team-workspace-loading">
				<Loading message="Загрузка команды..." />
			</div>
		)
	}

	if (!teamData) {
		return (
			<div className="team-workspace-loading">
				<Loading message="Команда не найдена..." />
			</div>
		)
	}

	return (
		<div className="team-workspace">
			<div className="team-header">
				<div className="team-header__left">
					<button className="team-header__back" onClick={handleBack}>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<line x1="19" y1="12" x2="5" y2="12"/>
							<polyline points="12 19 5 12 12 5"/>
						</svg>
						На главную
					</button>
					<h1 className="team-header__title">{teamData.name}</h1>
				</div>

				<div className="team-header__right">
					{isAdmin && (
						<Button variant="ghost" onClick={() => setIsCreatePollOpen(true)}>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<line x1="12" y1="20" x2="12" y2="10"/>
								<line x1="18" y1="20" x2="18" y2="4"/>
								<line x1="6" y1="20" x2="6" y2="16"/>
							</svg>
							Создать голосование
						</Button>
					)}

					{isAdmin && (
						<Button variant="ghost" onClick={() => setIsSettingsOpen(true)}>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<circle cx="12" cy="12" r="3"/>
								<path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
							</svg>
							Настройки
						</Button>
					)}
				</div>
			</div>

			{activePoll && (
				<TeamPoll
					teamId={teamId}
					socket={socket}
					activePoll={activePoll}
					onClosePoll={() => setActivePoll(null)}
				/>
			)}

			<div className="team-workspace-layout">
				<div className="team-workspace-layout__main">
					<div className="team-workspace-layout__tabs">
						<button
							className={`team-workspace-layout__tab ${activeTab === 'whiteboard' ? 'team-workspace-layout__tab--active' : ''}`}
							onClick={() => setActiveTab('whiteboard')}
						>
							Доска
						</button>
						<button
							className={`team-workspace-layout__tab ${activeTab === 'tools' ? 'team-workspace-layout__tab--active' : ''}`}
							onClick={() => setActiveTab('tools')}
						>
							Виджеты
						</button>
						<button
							className={`team-workspace-layout__tab ${activeTab === 'members' ? 'team-workspace-layout__tab--active' : ''}`}
							onClick={() => setActiveTab('members')}
						>
							Участники
						</button>
					</div>

					<div className="team-workspace-layout__content">
						{renderContent()}
					</div>
				</div>

				<div className="team-workspace-layout__chat">
					<ChatPanel
						teamId={teamId}
						teamData={{ ...teamData, members }}
						chatId={teamData?.chat_id}
						socket={socket}
					/>
				</div>
			</div>

			{isSettingsOpen && (
				<SettingsModal
					team={{ ...teamData, members }}
					onClose={() => setIsSettingsOpen(false)}
					onUpdate={handleUpdate}
				/>
			)}

			{isCreatePollOpen && (
				<CreatePollModal
					teamId={teamId}
					socket={socket}
					onClose={() => setIsCreatePollOpen(false)}
					onPollCreated={handlePollCreated}
				/>
			)}
		</div>
	)
}

export default TeamWorkspace
