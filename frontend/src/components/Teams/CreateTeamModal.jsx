import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'

function CreateTeamModal({ onClose, onCreate }) {
	const MAX_DESCRIPTION_LENGTH = 75
	
	const [formData, setFormData] = useState({
		name: '',
		description: '',
		isPrivate: false,
		avatar: null,
	})
	
	const handleChange = (e) => {
		const { name, value, type, checked } = e.target
		
		if (name === 'description' && value.length > MAX_DESCRIPTION_LENGTH) {
			return
		}
		
		setFormData({
			...formData,
			[name]: type === 'checkbox' ? checked : value,
		})
	}
	
	const handleAvatarChange = (e) => {
		const file = e.target.files?.[0]
		if (!file) return
		
		if (file.size > 5 * 1024 * 1024) {
			toast.error('Размер файла не должен превышать 5 МБ')
			return
		}
		
		const reader = new FileReader()
		reader.onloadend = () => {
			setFormData({
				...formData,
				avatar: reader.result,
			})
		}
		reader.readAsDataURL(file)
	}
	
	const handleRemoveAvatar = () => {
		setFormData({
			...formData,
			avatar: null,
		})
	}
	
	const getTeamLetter = () => {
		return formData.name.charAt(0).toUpperCase() || 'T'
	}
	
	const handleSubmit = (e) => {
		e.preventDefault()
		
		if (!formData.name.trim()) {
			toast.error('Введите название команды')
			return
		}
		
		onCreate(formData)
		toast.success('Команда создана!')
	}
	
	return (
		<Modal title="Создать команду" onClose={onClose}>
			<form className="create-team-form" onSubmit={handleSubmit}>
				<div className="create-team-form__avatar-section">
					<div className="create-team-form__avatar">
						{formData.avatar ? (
							<img
								src={formData.avatar}
								alt="Team avatar"
								className="create-team-form__avatar-img"
							/>
						) : (
							<div className="create-team-form__avatar-placeholder">
								{getTeamLetter()}
							</div>
						)}
					</div>
					
					<div className="create-team-form__avatar-actions">
						<label className="create-team-form__avatar-upload">
							<input
								type="file"
								accept="image/*"
								onChange={handleAvatarChange}
								style={{ display: 'none' }}
							/>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
								<circle cx="12" cy="13" r="4"/>
							</svg>
							<span>Загрузить фото</span>
						</label>
						
						{formData.avatar && (
							<button
								type="button"
								className="create-team-form__avatar-remove"
								onClick={handleRemoveAvatar}
							>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<polyline points="3 6 5 6 21 6"/>
									<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
								</svg>
								<span>Удалить</span>
							</button>
						)}
					</div>
				</div>
				
				<Input
					type="text"
					name="name"
					label="Название команды"
					value={formData.name}
					onChange={handleChange}
					placeholder="Введите название"
					required
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
						placeholder="Расскажите о команде"
						className="textarea"
						rows="4"
						maxLength={MAX_DESCRIPTION_LENGTH}
					/>
					<div className="input-helper">
						{formData.description.length}/{MAX_DESCRIPTION_LENGTH} символов
					</div>
				</div>
				
				<div className="create-team-form__checkbox">
					<label className="checkbox-label">
						<input
							type="checkbox"
							name="isPrivate"
							checked={formData.isPrivate}
							onChange={handleChange}
							className="checkbox-input"
						/>
						<span>Приватная команда</span>
					</label>
				</div>
				
				<div className="modal__actions">
					<Button type="button" variant="secondary" onClick={onClose}>
						Отмена
					</Button>
					<Button type="submit" variant="primary">
						Создать
					</Button>
				</div>
			</form>
		</Modal>
	)
}

export default CreateTeamModal