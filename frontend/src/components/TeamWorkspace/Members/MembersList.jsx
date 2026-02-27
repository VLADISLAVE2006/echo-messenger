import { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../common/Button'
import toast from 'react-hot-toast'

function MembersList({ teamId, teamData }) {
	const { user } = useAuth()
	const [requests, setRequests] = useState([])
	const [activeTab, setActiveTab] = useState('members') // 'members' или 'requests'
	
	const isAdmin = teamData.members?.some(
		m => m.username === user.username && (m.roles?.includes('Admin') || m.roles?.includes('Создатель'))
	) || false
	
	// Загружаем requests если админ
	useEffect(() => {
		if (isAdmin) {
			loadRequests()
		}
	}, [teamId, isAdmin])
	
	const loadRequests = async () => {
		try {
			const password = localStorage.getItem('password')
			const params = new URLSearchParams({
				username: user.username,
				password: password,
			})
			
			const response = await fetch(`http://localhost:5000/api/teams/${teamId}/requests?${params}`)
			
			if (response.ok) {
				const data = await response.json()
				setRequests(data.requests || [])
			}
		} catch (error) {
			console.error('Error loading requests:', error)
		}
	}
	
	const handleApproveRequest = async (requestId) => {
		try {
			const password = localStorage.getItem('password')
			
			const response = await fetch(`http://localhost:5000/api/teams/${teamId}/requests/${requestId}/approve`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					username: user.username,
					password: password,
				}),
			})
			
			if (response.ok) {
				toast.success('Request approved!')
				loadRequests() // Перезагружаем список
			} else {
				const error = await response.json()
				toast.error(error.error || 'Failed to approve')
			}
		} catch (error) {
			console.error('Error approving request:', error)
			toast.error('Failed to approve')
		}
	}
	
	const handleRejectRequest = async (requestId) => {
		try {
			const password = localStorage.getItem('password')
			
			const response = await fetch(`http://localhost:5000/api/teams/${teamId}/requests/${requestId}/reject`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					username: user.username,
					password: password,
				}),
			})
			
			if (response.ok) {
				toast.success('Request rejected!')
				loadRequests()
			} else {
				const error = await response.json()
				toast.error(error.error || 'Failed to reject')
			}
		} catch (error) {
			console.error('Error rejecting request:', error)
			toast.error('Failed to reject')
		}
	}
	
	return (
		<div className="members-list">
			<div className="members-list__header">
				<h2 className="members-list__title">Team Members</h2>
				<div className="members-list__count">{teamData.members?.length || 0} members</div>
			</div>
			
			{/* ⬇️ ДОБАВЬ табы если админ */}
			{isAdmin && (
				<div className="members-list__tabs">
					<button
						className={`members-list__tab ${activeTab === 'members' ? 'members-list__tab--active' : ''}`}
						onClick={() => setActiveTab('members')}
					>
						Members ({teamData.members?.length || 0})
					</button>
					<button
						className={`members-list__tab ${activeTab === 'requests' ? 'members-list__tab--active' : ''}`}
						onClick={() => setActiveTab('requests')}
					>
						Join Requests ({requests.length})
					</button>
				</div>
			)}
			
			<div className="members-list__content">
				{activeTab === 'members' ? (
					<div className="members-list__grid">
						{teamData.members?.map((member) => (
							<div key={member.id} className="member-card">
								<div className="member-card__avatar">
									{member.avatar ? (
										<img src={member.avatar} alt={member.username} />
									) : (
										<div className="member-card__avatar-placeholder">
											{member.username.charAt(0).toUpperCase()}
										</div>
									)}
									{member.is_online && <div className="member-card__online-indicator" />}
								</div>
								
								<div className="member-card__info">
									<h3 className="member-card__name">{member.username}</h3>
									{member.roles && member.roles.length > 0 && (
										<div className="member-card__roles">
											{member.roles.map((role, index) => (
												<span key={index} className="member-card__role">
                          {role}
                        </span>
											))}
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="requests-list">
						{requests.length === 0 ? (
							<div className="requests-list__empty">
								<p>No pending join requests</p>
							</div>
						) : (
							requests.map((request) => (
								<div key={request.id} className="request-card">
									<div className="request-card__user">
										<div className="request-card__avatar">
											{request.avatar ? (
												<img src={request.avatar} alt={request.username} />
											) : (
												<div className="request-card__avatar-placeholder">
													{request.username.charAt(0).toUpperCase()}
												</div>
											)}
										</div>
										<div className="request-card__info">
											<h3 className="request-card__name">{request.username}</h3>
											<p className="request-card__date">
												Requested {new Date(request.created_at).toLocaleDateString()}
											</p>
										</div>
									</div>
									
									<div className="request-card__actions">
										<Button
											variant="primary"
											onClick={() => handleApproveRequest(request.id)}
										>
											Approve
										</Button>
										<Button
											variant="ghost"
											onClick={() => handleRejectRequest(request.id)}
										>
											Reject
										</Button>
									</div>
								</div>
							))
						)}
					</div>
				)}
			</div>
		</div>
	)
}

export default MembersList