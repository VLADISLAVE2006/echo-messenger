import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'
import DeleteTeamModal from './DeleteTeamModal'

function SettingsModal({ team, onClose, onUpdate }) {
	const { user } = useAuth()
	const [formData, setFormData] = useState({
		name: team.name || '',
		description: team.description || '',
		is_private: team.is_private === 1 || team.isPrivate || false,
	})
	const [avatarPreview, setAvatarPreview] = useState(team.avatar || null)
	const [avatarFile, setAvatarFile] = useState(null)
	const [loading, setLoading] = useState(false)
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
	
	const isCreator = team.members?.some(
		m => m.username === user.username && (m.roles?.includes('Admin') || m.roles?.includes('Создатель'))
	)
	
	const handleChange = (e) => {
		const { name, value, type, checked } = e.target
		setFormData({
			...formData,
			[name]: type === 'checkbox' ? checked : value,
		})
	}
	
	const handleAvatarChange = (e) => {
		const file = e.target.files[0]
		if (file) {
			if (file.size > 5 * 1024 * 1024) {
				toast.error('Файл весит слишком много! Максимальный размер файла - 5МБ')
				return
			}
			
			const reader = new FileReader()
			reader.onloadend = () => {
				setAvatarPreview(reader.result)
				setAvatarFile(reader.result)
			}
			reader.readAsDataURL(file)
		}
	}
	
	const handleRemoveAvatar = () => {
		setAvatarPreview(null)
		setAvatarFile(null)
	}
	
	const handleSave = async () => {
		if (!isCreator) {
			toast.error('Только администратор команды может изменять ее настройки')
			return
		}
		
		if (!formData.name.trim()) {
			toast.error('Необходимо ввести название команды')
			return
		}
		
		if (formData.description.length > 80) {
			toast.error('Описание должно содержать не более 80 символов')
			return
		}
		
		setLoading(true)
		
		try {
			const password = localStorage.getItem('password')
			
			const response = await fetch(`http://localhost:5000/api/teams/${team.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					username: user.username,
					password: password,
					name: formData.name.trim(),
					description: formData.description.trim(),
					is_private: formData.is_private,
					avatar: avatarFile,
				}),
			})
			
			if (response.ok) {
				toast.success('Команда обновлена успешно!')
				onUpdate()
				onClose()
			} else {
				const error = await response.json()
				toast.error(error.error || 'Произошла ошибка в обновлении команды')
			}
		} catch (error) {
			console.error('Error updating team:', error)
			toast.error('Произошла ошибка в обновлении команды')
		} finally {
			setLoading(false)
		}
	}
	
	const handleDeleteClick = () => {
		if (!isCreator) {
			toast.error('Только администратор может удалить команду!')
			return
		}
		setIsDeleteModalOpen(true)
	}
	
	const getTeamLetter = () => {
		return formData.name.charAt(0).toUpperCase()
	}
	
	return (
		<>
			<Modal title="Team Settings" onClose={onClose} size="medium">
				<div className="settings-modal">
					<div className="settings-modal__avatar-section">
						<label className="settings-modal__label">Team Avatar</label>
						<div className="settings-modal__avatar-wrapper">
							<div className="settings-modal__avatar">
								{avatarPreview ? (
									<img src={avatarPreview} alt="Team avatar" className="settings-modal__avatar-img" />
								) : (
									<div className="settings-modal__avatar-placeholder">
										{getTeamLetter()}
									</div>
								)}
							</div>
							<div className="settings-modal__avatar-buttons">
								<label className="settings-modal__avatar-upload">
									<input
										type="file"
										accept="image/*"
										onChange={handleAvatarChange}
										hidden
										disabled={!isCreator || loading}
									/>
									<Button type="button" variant="secondary" as="span" disabled={!isCreator || loading}>
										Upload Avatar
									</Button>
								</label>
								{avatarPreview && (
									<Button
										type="button"
										variant="danger"
										onClick={handleRemoveAvatar}
										disabled={!isCreator || loading}
									>
										Remove
									</Button>
								)}
							</div>
						</div>
					</div>
					
					<Input
						type="text"
						name="name"
						label="Team Name"
						value={formData.name}
						onChange={handleChange}
						placeholder="Enter team name"
						disabled={!isCreator}
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
							disabled={!isCreator}
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
								disabled={!isCreator}
							/>
							<span className="checkbox-text">Private team</span>
						</label>
					</div>
					
					<div className="modal__actions">
						<Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
							Cancel
						</Button>
						{isCreator && (
							<>
								<Button type="button" variant="danger" onClick={handleDeleteClick} disabled={loading}>
									Delete Team
								</Button>
								<Button type="button" variant="primary" onClick={handleSave} disabled={loading}>
									{loading ? 'Saving...' : 'Save Changes'}
								</Button>
							</>
						)}
					</div>
				</div>
			</Modal>
			
			{isDeleteModalOpen && (
				<DeleteTeamModal
					team={team}
					onClose={() => setIsDeleteModalOpen(false)}
					onDelete={onUpdate}
				/>
			)}
		</>
	)
}

export default SettingsModal