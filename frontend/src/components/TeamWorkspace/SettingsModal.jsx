import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'
import DeleteTeamModal from './DeleteTeamModal' // ДОБАВИТЬ

function SettingsModal({ team, onClose, onUpdate }) {
	const [activeTab, setActiveTab] = useState('general')
	const [formData, setFormData] = useState({
		name: team.name,
		description: team.description || '',
		is_private: team.is_private || false,
	})
	const [loading, setLoading] = useState(false)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false) // ДОБАВИТЬ
	
	const handleChange = (e) => {
		const { name, value, type, checked } = e.target
		setFormData({
			...formData,
			[name]: type === 'checkbox' ? checked : value,
		})
	}
	
	const handleSave = async () => {
		setLoading(true)
		
		// TODO: Интеграция с API для обновления команды
		setTimeout(() => {
			toast.success('Team settings saved!')
			setLoading(false)
			onUpdate()
			onClose()
		}, 500)
	}
	
	const handleDeleteTeam = () => {
		onClose()
		// Редирект на dashboard
		window.location.href = '/echo-messenger/dashboard'
	}
	
	const tabs = [
		{
			id: 'general',
			label: 'General',
			icon: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
					<circle cx="12" cy="12" r="3"/>
					<path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
				</svg>
			)
		},
		{
			id: 'members',
			label: 'Members',
			icon: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
					<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
					<circle cx="9" cy="7" r="4"/>
					<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
					<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
				</svg>
			)
		},
		{
			id: 'manage',
			label: 'Delete Team',
			isDanger: true,
			icon: (
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
					<polyline points="3 6 5 6 21 6"/>
					<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
					<line x1="10" y1="11" x2="10" y2="17"/>
					<line x1="14" y1="11" x2="14" y2="17"/>
				</svg>
			)
		},
	]
	
	const renderContent = () => {
		switch (activeTab) {
			case 'general':
				return (
					<div className="settings-content">
						<div className="settings-content__body">
							<div className="settings-section">
								<h3 className="settings-section__title">Team Information</h3>
								
								<Input
									type="text"
									name="name"
									label="Team Name"
									value={formData.name}
									onChange={handleChange}
									placeholder="Enter team name"
								/>
								
								<div className="input-wrapper">
									<label htmlFor="description" className="input-label">
										Description
									</label>
									<textarea
										id="description"
										name="description"
										value={formData.description}
										onChange={handleChange}
										placeholder="Describe your team..."
										className="textarea"
										rows="4"
										maxLength={80}
									/>
									<div className="input-helper">
										{formData.description.length}/80 characters
									</div>
								</div>
								
								<div className="checkbox-wrapper">
									<label className="checkbox-label">
										<input
											type="checkbox"
											name="is_private"
											checked={formData.is_private}
											onChange={handleChange}
											className="checkbox-input"
										/>
										<span className="checkbox-text">Private team (requires approval to join)</span>
									</label>
								</div>
							</div>
						</div>
						
						<div className="settings-content__footer">
							<Button variant="secondary" onClick={onClose} disabled={loading}>
								Cancel
							</Button>
							<Button variant="primary" onClick={handleSave} disabled={loading}>
								{loading ? 'Saving...' : 'Save Changes'}
							</Button>
						</div>
					</div>
				)
			
			case 'members':
				return (
					<div className="settings-content">
						<div className="settings-content__body">
							<div className="settings-section">
								<h3 className="settings-section__title">Team Members</h3>
								<p className="settings-section__description">
									Manage team members, roles, and permissions.
								</p>
								
								<div className="settings-placeholder">
									<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
										<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
										<circle cx="9" cy="7" r="4"/>
										<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
										<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
									</svg>
									<p>Member management coming soon</p>
								</div>
							</div>
						</div>
					</div>
				)
			
			case 'manage':
				return (
					<div className="settings-content">
						<div className="settings-content__body">
							<div className="settings-section">
								<div className="settings-danger">
									<div className="settings-danger__icon">
										<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
											<line x1="12" y1="9" x2="12" y2="13"/>
											<line x1="12" y1="17" x2="12.01" y2="17"/>
										</svg>
									</div>
									<div className="settings-danger__content">
										<h4 className="settings-danger__title">Delete Team</h4>
										<p className="settings-danger__text">
											Permanently delete this team and all associated data. This action cannot be undone.
										</p>
										<Button
											variant="danger"
											onClick={() => setIsDeleteModalOpen(true)} // ИЗМЕНИТЬ
											disabled={loading}
										>
											Delete Team
										</Button>
									</div>
								</div>
							</div>
						</div>
					</div>
				)
			
			default:
				return null
		}
	}
	
	return (
		<>
			<Modal title="Team Settings" onClose={onClose} size="large">
				<div className="settings-modal">
					<div className="settings-modal__tabs">
						{tabs.map(tab => (
							<button
								key={tab.id}
								className={`settings-modal__tab ${
									activeTab === tab.id ? 'settings-modal__tab--active' : ''
								} ${tab.isDanger ? 'settings-modal__tab--danger' : ''}`}
								onClick={() => setActiveTab(tab.id)}
							>
								<span className="settings-modal__tab-icon">{tab.icon}</span>
								<span className="settings-modal__tab-label">{tab.label}</span>
							</button>
						))}
					</div>
					
					<div className="settings-modal__content">
						{renderContent()}
					</div>
				</div>
			</Modal>
			
			{/* ДОБАВИТЬ модалку удаления */}
			{isDeleteModalOpen && (
				<DeleteTeamModal
					team={team}
					onClose={() => setIsDeleteModalOpen(false)}
					onDelete={handleDeleteTeam}
				/>
			)}
		</>
	)
}

export default SettingsModal