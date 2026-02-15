import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import TeamWorkspaceLayout from '../components/TeamWorkspace/TeamWorkspaceLayout'
import TeamHeader from '../components/TeamWorkspace/TeamHeader'
import ChatPanel from '../components/TeamWorkspace/Chat/ChatPanel'
import WhiteboardCanvas from '../components/TeamWorkspace/Whiteboard/WhiteboardCanvas'
import ToolsGrid from '../components/TeamWorkspace/Tools/ToolsGrid'
import MembersList from '../components/TeamWorkspace/Members/MembersList'
import SettingsModal from '../components/TeamWorkspace/SettingsModal'
import Loading from '../components/common/Loading'

function TeamWorkspace() {
	const { teamId } = useParams()
	const navigate = useNavigate()
	const { user } = useAuth()
	
	const [activeTab, setActiveTab] = useState('whiteboard')
	const [isSettingsOpen, setIsSettingsOpen] = useState(false)
	const [teamData, setTeamData] = useState(null)
	const [loading, setLoading] = useState(true)
	
	useEffect(() => {
		fetchTeamData()
	}, [teamId])
	
	const fetchTeamData = async () => {
		// ===== MOCK DATA ДЛЯ ТЕСТОВОЙ КОМАНДЫ - УДАЛИТЬ ПОТОМ =====
		if (teamId === '999') {
			setTimeout(() => {
				setTeamData({
					team: {
						id: 999,
						name: 'Test Team',
						description: 'This is a test team for development',
						is_private: false,
						avatar: null,
						member_count: 3,
					},
					members: [
						{
							id: 1,
							username: user.username,
							avatar: user.avatar || null,
							roles: ['Создатель'],
						},
						{
							id: 2,
							username: 'john_doe',
							avatar: null,
							roles: ['Developer', 'Designer'],
						},
						{
							id: 3,
							username: 'jane_smith',
							avatar: null,
							roles: ['Manager'],
						},
					],
				})
				setLoading(false)
			}, 1000) // Увеличил время чтобы видеть loading
			return
		}
		// ===== КОНЕЦ MOCK DATA =====
		
		try {
			const params = new URLSearchParams({
				username: user.username,
				password: localStorage.getItem('password'),
			})
			
			const response = await fetch(`http://localhost:5000/api/teams/${teamId}?${params}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			})
			
			if (response.ok) {
				const data = await response.json()
				setTeamData(data)
			} else {
				console.error('Failed to fetch team data')
				navigate('/dashboard')
			}
		} catch (error) {
			console.error('Error fetching team:', error)
			navigate('/dashboard')
		} finally {
			setLoading(false)
		}
	}
	
	const handleBack = () => {
		navigate('/dashboard')
	}
	
	const handleOpenSettings = () => {
		setIsSettingsOpen(true)
	}
	
	const renderContent = () => {
		switch (activeTab) {
			case 'whiteboard':
				return <WhiteboardCanvas teamId={teamId} />
			case 'tools':
				return <ToolsGrid teamId={teamId} teamData={teamData} /> // ДОБАВИТЬ teamData
			case 'members':
				return <MembersList teamId={teamId} teamData={teamData} />
			default:
				return <WhiteboardCanvas teamId={teamId} />
		}
	}
	
	if (loading) {
		return <Loading message="Loading team workspace..." />
	}
	
	if (!teamData) {
		return <Loading message="Team not found..." />
	}
	
	return (
		<div className="team-workspace">
			<TeamHeader
				teamName={teamData.team.name}
				onBack={handleBack}
				onOpenSettings={handleOpenSettings}
			/>
			
			<TeamWorkspaceLayout
				activeTab={activeTab}
				onTabChange={setActiveTab}
				content={renderContent()}
				chat={<ChatPanel teamId={teamId} />}
			/>
			
			{isSettingsOpen && (
				<SettingsModal
					team={teamData.team}
					onClose={() => setIsSettingsOpen(false)}
					onUpdate={fetchTeamData}
				/>
			)}
		</div>
	)
}

export default TeamWorkspace