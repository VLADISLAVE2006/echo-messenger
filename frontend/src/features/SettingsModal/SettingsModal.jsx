import { useState } from 'react'
import { useAuth } from '@shared/context/AuthContext'
import { apiFetch } from '@shared/api/api'
import toast from 'react-hot-toast'
import Modal from '@shared/ui/Modal'
import Button from '@shared/ui/Button'
import Input from '@shared/ui/Input'
import DeleteTeamModal from '@features/DeleteTeamModal'

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
				toast.error('Файл слишком большой! Максимальный размер — 5 МБ')
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
			toast.error('Только администратор команды может изменять настройки')
			return
		}

		if (!formData.name.trim()) {
			toast.error('Введите название команды')
			return
		}

		if (formData.description.length > 80) {
			toast.error('Описание не может быть длиннее 80 символов')
			return
		}

		setLoading(true)
		try {
			await apiFetch(`/teams/${team.id}`, {
				method: 'PUT',
				body: JSON.stringify({
					name: formData.name.trim(),
					description: formData.description.trim(),
					is_private: formData.is_private,
					avatar: avatarFile,
				}),
			})
			toast.success('Настройки команды сохранены!')
			onUpdate()
			onClose()
		} catch (error) {
			toast.error(error.message || 'Не удалось обновить настройки команды')
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

	const getTeamLetter = () => formData.name.charAt(0).toUpperCase()

	return (
		<>
			<Modal title="Настройки команды" onClose={onClose} size="medium">
				<div className="settings-modal">
					<div className="settings-modal__avatar-section">
						<label className="settings-modal__label">Аватар команды</label>
						<div className="settings-modal__avatar-wrapper">
							<div className="settings-modal__avatar">
								{avatarPreview ? (
									<img src={avatarPreview} alt="Аватар команды" className="settings-modal__avatar-img" />
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
										Загрузить фото
									</Button>
								</label>
								{avatarPreview && (
									<Button
										type="button"
										variant="danger"
										onClick={handleRemoveAvatar}
										disabled={!isCreator || loading}
									>
										Удалить
									</Button>
								)}
							</div>
						</div>
					</div>

					<Input
						type="text"
						name="name"
						label="Название команды"
						value={formData.name}
						onChange={handleChange}
						placeholder="Введите название"
						disabled={!isCreator}
					/>

					<div className="input-wrapper">
						<label htmlFor="description" className="input-label">
							Описание
						</label>
						<textarea
							id="description"
							name="description"
							value={formData.description}
							onChange={handleChange}
							placeholder="Расскажите о команде..."
							className="textarea"
							rows="4"
							maxLength={80}
							disabled={!isCreator}
						/>
						<div className="input-helper">
							{formData.description.length}/80 символов
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
							<span className="checkbox-text">Приватная команда</span>
						</label>
					</div>

					<div className="modal__actions">
						<Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
							Отмена
						</Button>
						{isCreator && (
							<>
								<Button type="button" variant="danger" onClick={handleDeleteClick} disabled={loading}>
									Удалить команду
								</Button>
								<Button type="button" variant="primary" onClick={handleSave} disabled={loading}>
									{loading ? 'Сохранение...' : 'Сохранить'}
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
