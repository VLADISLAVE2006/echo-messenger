import { useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import toast from 'react-hot-toast'
import Modal from '../../common/Modal'
import Button from '../../common/Button'
import Input from '../../common/Input'

function MembersList({ teamId, teamData }) {
	const { user } = useAuth()
	const [selectedMember, setSelectedMember] = useState(null)
	const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
	
	const members = teamData?.members || []
	
	const isAdmin = members?.some(
		m => m.username === user.username && (m.roles?.includes('Admin') || m.roles?.includes('Создатель'))
	)
	
	const getAvatarLetter = (username) => {
		return username?.charAt(0).toUpperCase() || 'U'
	}
	
	const handleManageRoles = (member) => {
		setSelectedMember(member)
		setIsRoleModalOpen(true)
	}
	
	return (
		<div className="members-list">
			<div className="members-list__header">
				<h2 className="members-list__title">Team Members</h2>
				<span className="members-list__count">{members.length} {members.length === 1 ? 'member' : 'members'}</span>
			</div>
			
			<div className="members-list__grid">
				{members.map(member => {
					// Показываем кнопку если:
					// 1. Текущий пользователь админ
					// 2. И это либо другой участник, либо сам админ (админ может редактировать свои роли)
					const canManageRoles = isAdmin && (!member.roles?.includes('Admin') || member.username === user.username)
					
					return (
						<div key={member.id} className="member-card">
							<div className="member-card__avatar">
								{member.avatar ? (
									<img src={member.avatar} alt={member.username} className="member-card__avatar-img" />
								) : (
									<div className="member-card__avatar-placeholder">
										{getAvatarLetter(member.username)}
									</div>
								)}
								{member.is_online && (
									<div className="member-card__online-indicator" />
								)}
							</div>
							
							<div className="member-card__info">
								<h3 className="member-card__name">{member.username}</h3>
								
								<div className="member-card__roles">
									{member.roles && member.roles.length > 0 ? (
										member.roles.map((role, index) => (
											<span key={index} className="member-card__role">
                        {role}
                      </span>
										))
									) : (
										<span className="member-card__role member-card__role--empty">No roles</span>
									)}
								</div>
								
								{canManageRoles && (
									<button
										className="member-card__manage-btn"
										onClick={() => handleManageRoles(member)}
									>
										Manage Roles
									</button>
								)}
							</div>
						</div>
					)
				})}
			</div>
			
			{isRoleModalOpen && selectedMember && (
				<ManageRolesModal
					member={selectedMember}
					teamId={teamId}
					onClose={() => {
						setIsRoleModalOpen(false)
						setSelectedMember(null)
					}}
					onUpdate={() => {
						window.location.reload()
					}}
				/>
			)}
		</div>
	)
}

// Модалка для управления ролями
function ManageRolesModal({ member, teamId, onClose, onUpdate }) {
	const { user } = useAuth()
	const [roles, setRoles] = useState(
		member.roles?.filter(r => r !== 'Admin') || []
	)
	const [newRole, setNewRole] = useState('')
	const [loading, setLoading] = useState(false)
	
	const handleAddRole = () => {
		const trimmedRole = newRole.trim()
		
		if (!trimmedRole) {
			toast.error('Role name cannot be empty')
			return
		}
		
		if (trimmedRole.length > 30) {
			toast.error('Role name must be less than 30 characters')
			return
		}
		
		if (roles.includes(trimmedRole)) {
			toast.error('This role already exists')
			return
		}
		
		setRoles([...roles, trimmedRole])
		setNewRole('')
	}
	
	const handleRemoveRole = (roleToRemove) => {
		setRoles(roles.filter(role => role !== roleToRemove))
	}
	
	const handleKeyPress = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleAddRole()
		}
	}
	
	const handleSave = async () => {
		setLoading(true)
		
		try {
			const password = localStorage.getItem('password')
			
			const response = await fetch(`http://localhost:5000/api/teams/${teamId}/members/${member.id}/roles`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					username: user.username,
					password: password,
					roles: roles,
				}),
			})
			
			if (response.ok) {
				toast.success('Roles updated successfully!')
				onUpdate()
				onClose()
			} else {
				const error = await response.json()
				toast.error(error.error || 'Failed to update roles')
			}
		} catch (error) {
			console.error('Error updating roles:', error)
			toast.error('Failed to update roles')
		} finally {
			setLoading(false)
		}
	}
	
	return (
		<Modal title={`Manage Roles - ${member.username}`} onClose={onClose}>
			<div className="manage-roles-modal">
				<p className="manage-roles-modal__description">
					Add custom roles for this team member. These are for display purposes only.
				</p>
				
				<div className="manage-roles-modal__input-section">
					<Input
						type="text"
						label="Add Role"
						value={newRole}
						onChange={(e) => setNewRole(e.target.value)}
						onKeyPress={handleKeyPress}
						placeholder="e.g. Frontend Developer, Team Lead..."
						maxLength={30}
					/>
					<Button
						type="button"
						variant="secondary"
						onClick={handleAddRole}
						disabled={!newRole.trim()}
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<line x1="12" y1="5" x2="12" y2="19"/>
							<line x1="5" y1="12" x2="19" y2="12"/>
						</svg>
						Add
					</Button>
				</div>
				
				{roles.length > 0 && (
					<div className="manage-roles-modal__roles-list">
						<label className="manage-roles-modal__roles-label">Current Roles:</label>
						<div className="manage-roles-modal__roles">
							{roles.map((role, index) => (
								<div key={index} className="role-tag">
									<span className="role-tag__text">{role}</span>
									<button
										type="button"
										className="role-tag__remove"
										onClick={() => handleRemoveRole(role)}
									>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
											<line x1="18" y1="6" x2="6" y2="18"/>
											<line x1="6" y1="6" x2="18" y2="18"/>
										</svg>
									</button>
								</div>
							))}
						</div>
					</div>
				)}
				
				{member.roles?.includes('Admin') && (
					<div className="manage-roles-modal__notice">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<circle cx="12" cy="12" r="10"/>
							<line x1="12" y1="16" x2="12" y2="12"/>
							<line x1="12" y1="8" x2="12.01" y2="8"/>
						</svg>
						<span>Admin role cannot be removed</span>
					</div>
				)}
				
				<div className="modal__actions">
					<Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
						Cancel
					</Button>
					<Button type="button" variant="primary" onClick={handleSave} disabled={loading}>
						{loading ? 'Saving...' : 'Save Roles'}
					</Button>
				</div>
			</div>
		</Modal>
	)
}

export default MembersList