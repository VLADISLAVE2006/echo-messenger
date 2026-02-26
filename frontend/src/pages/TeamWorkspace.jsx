import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useSocket.js'
import Button from '../components/common/Button'
import WhiteboardCanvas from '../components/TeamWorkspace/Whiteboard/WhiteboardCanvas'
import ToolsGrid from '../components/TeamWorkspace/Tools/ToolsGrid'
import MembersList from '../components/TeamWorkspace/Members/MembersList'
import ChatPanel from '../components/TeamWorkspace/Chat/ChatPanel'
import SettingsModal from '../components/TeamWorkspace/SettingsModal'
import TeamPoll from '../components/TeamWorkspace/TeamPoll'
import CreatePollModal from '../components/TeamWorkspace/CreatePollModal'
import Loading from '../components/common/Loading'
import toast from 'react-hot-toast' // ⬅️ ДОБАВЬ

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
		
		console.log('🔌 Setting up socket listeners')
		
		socket.on('joined_team', (data) => {
			console.log('✅ Joined team:', data)
		})
		
		socket.on('user_online', (data) => {
			console.log('👤 User online:', data)
			loadTeamData()
		})
		
		socket.on('user_offline', (data) => {
			console.log('👤 User offline:', data)
			loadTeamData()
		})
		
		// ⬇️ ДОБАВЬ ОБРАБОТЧИКИ ДЛЯ POLL
		socket.on('new_poll', (poll) => {
			console.log('🆕 NEW POLL:', poll)
			toast.success(`New poll: ${poll.question}`)
			// Автоматически показываем новое голосование
			setActivePoll(poll)
		})
		
		socket.on('poll_updated', (data) => {
			console.log('📊 POLL UPDATED:', data)
			// Обновляем activePoll если это тот же poll
			if (activePoll && activePoll.id === data.poll_id) {
				setActivePoll(prev => ({
					...prev,
					options: prev.options.map(opt => {
						if (opt.id === data.option_id) {
							return { ...opt, votes: data.votes }
						}
						return opt
					})
				}))
			}
		})
		
		return () => {
			socket.off('joined_team')
			socket.off('user_online')
			socket.off('user_offline')
			socket.off('new_poll') // ⬅️ ДОБАВЬ
			socket.off('poll_updated') // ⬅️ ДОБАВЬ
		}
	}, [socket.socket, activePoll]) // ⬅️ ДОБАВЬ activePoll в dependencies
	
	const loadTeamData = async () => {
		try {
			const password = localStorage.getItem('password')
			
			const params = new URLSearchParams({
				username: user.username,
				password: password,
			})
			
			const response = await fetch(`http://localhost:5000/api/teams/${teamId}?${params}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			})
			
			if (response.ok) {
				const data = await response.json()
				console.log('Team data:', data)
				setTeamData(data.team)
				setMembers(data.members || [])
			} else {
				console.error('Failed to load team')
			}
		} catch (error) {
			console.error('Error loading team:', error)
		} finally {
			setLoading(false)
		}
	}
	
	const handleBack = () => {
		navigate('/dashboard', { state: { fromTeamWorkspace: true } })
	}
	
	const handleUpdate = () => {
		loadTeamData()
	}
	
	const handlePollCreated = (poll) => {
		setActivePoll(poll)
		setIsCreatePollOpen(false) // ⬅️ ЗАКРЫВАЕМ МОДАЛКУ
	}
	
	const renderContent = () => {
		switch (activeTab) {
			case 'whiteboard':
				return <WhiteboardCanvas teamId={teamId} socket={socket} />
			case 'tools':
				return <ToolsGrid teamId={teamId} teamData={{ ...teamData, members }} socket={socket} />
			case 'members':
				return <MembersList teamId={teamId} teamData={{ ...teamData, members }} />
			default:
				return <WhiteboardCanvas teamId={teamId} socket={socket} />
		}
	}
	
	if (loading) {
		return (
			<div className="team-workspace-loading">
				<Loading message="Loading team workspace..." />
			</div>
		)
	}
	
	if (!teamData) {
		return (
			<div className="team-workspace-loading">
				<Loading message="Team not found..." />
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
						Back to Teams
					</button>
					<h1 className="team-header__title">{teamData.name}</h1>
				</div>
				
				<div className="team-header__right">
					{isAdmin && (
						<Button
							variant="ghost"
							onClick={() => setIsCreatePollOpen(true)}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<line x1="12" y1="20" x2="12" y2="10"/>
								<line x1="18" y1="20" x2="18" y2="4"/>
								<line x1="6" y1="20" x2="6" y2="16"/>
							</svg>
							Create Poll
						</Button>
					)}
					
					<Button
						variant="ghost"
						onClick={() => setIsSettingsOpen(true)}
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<circle cx="12" cy="12" r="3"/>
							<path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
						</svg>
						Settings
					</Button>
				</div>
			</div>
			
			{/* ⬇️ ПЕРЕДАЙ socket и teamId */}
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
							Whiteboard
						</button>
						<button
							className={`team-workspace-layout__tab ${activeTab === 'tools' ? 'team-workspace-layout__tab--active' : ''}`}
							onClick={() => setActiveTab('tools')}
						>
							Tools
						</button>
						<button
							className={`team-workspace-layout__tab ${activeTab === 'members' ? 'team-workspace-layout__tab--active' : ''}`}
							onClick={() => setActiveTab('members')}
						>
							Members
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
			
			{/* ⬇️ ПЕРЕДАЙ socket и teamId */}
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