import { useState } from 'react'
import toast from 'react-hot-toast'
import Button from '../common/Button'
import Input from '../common/Input'
import Modal from '../common/Modal'

function EditProfileModal({ data, onSave, onClose }) {
	const [formData, setFormData] = useState({
		username: data.username,
		bio: data.bio,
	})
	
	const handleChange = (e) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value,
		})
	}
	
	const handleSubmit = (e) => {
		e.preventDefault()
		
		if (!formData.username.trim()) {
			toast.error('Имя пользователя не может быть пустым')
			return
		}
		
		const hasUsernameChanged = formData.username.trim() !== data.username
		const hasBioChanged = formData.bio.trim() !== data.bio
		
		if (!hasUsernameChanged && !hasBioChanged) {
			toast.error('Вы не внесли никаких изменений')
			return
		}
		
		onSave(formData)
		toast.success('Профиль успешно обновлен!')
	}
	
	return (
		<Modal title="Редактировать профиль" onClose={onClose}>
			<form className="edit-profile-form" onSubmit={handleSubmit}>
				<Input
					type="text"
					name="username"
					label="Имя пользователя"
					value={formData.username}
					onChange={handleChange}
					placeholder="Введите имя пользователя"
					required
				/>
				
				<div className="input-wrapper">
					<label htmlFor="bio" className="input-label">
						О себе
					</label>
					<textarea
						id="bio"
						name="bio"
						value={formData.bio}
						onChange={handleChange}
						placeholder="Расскажите о себе"
						className="textarea"
						rows="4"
					/>
				</div>
				
				<div className="modal__actions">
					<Button type="button" variant="secondary" onClick={onClose}>
						Отмена
					</Button>
					<Button type="submit" variant="primary">
						Сохранить изменения
					</Button>
				</div>
			</form>
		</Modal>
	)
}

export default EditProfileModal