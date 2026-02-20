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
	
	// Проверяем, является ли пользователь админом
	const isAdmin = members?.some(
		m => m.username === user.username && (m.roles?.includes('Admin') || m.roles?.includes('Создатель'))
	) || false
	
	useEffect(() => {
		loadTeamData()
	}, [teamId])
	
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
				console.log('Team data:', data) // Для отладки
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
	}
	
	const renderContent = () => {
		switch (activeTab) {
			case 'whiteboard':
				return <WhiteboardCanvas teamId={teamId} />
			case 'tools':
				return <ToolsGrid teamId={teamId} teamData={{ ...teamData, members }} />
			case 'members':
				return <MembersList teamId={teamId} teamData={{ ...teamData, members }} />
			default:
				return <WhiteboardCanvas teamId={teamId} />
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
			
			{activePoll && (
				<TeamPoll
					teamData={{ ...teamData, members }}
					isAdmin={isAdmin}
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
						chatId={teamData?.chat_id} // Передаем chat_id
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
					onClose={() => setIsCreatePollOpen(false)}
					onPollCreated={handlePollCreated}
				/>
			)}
		</div>
	)
}

export default TeamWorkspace