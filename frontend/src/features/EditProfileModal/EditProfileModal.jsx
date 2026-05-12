import { useState } from 'react'
import { useAuth } from '@shared/context/AuthContext'
import { apiFetch } from '@shared/api/api'
import toast from 'react-hot-toast'
import Modal from '@shared/ui/Modal'
import Button from '@shared/ui/Button'
import Input from '@shared/ui/Input'

function EditProfileModal({ data, onSave, onClose }) {
	const { user, updateUser } = useAuth()
	const [formData, setFormData] = useState({
		username: data.username,
		bio: data.bio,
	})
	const [loading, setLoading] = useState(false)

	const handleChange = (e) => {
		const { name, value } = e.target
		setFormData({ ...formData, [name]: value })
	}

	const handleSubmit = async (e) => {
		e.preventDefault()

		if (!formData.username.trim()) {
			toast.error('Введите имя пользователя')
			return
		}

		if (formData.bio.length > 100) {
			toast.error('О себе — не более 100 символов')
			return
		}

		setLoading(true)
		try {
			await apiFetch('/profile', {
				method: 'PUT',
				body: JSON.stringify({
					new_username: formData.username,
					new_bio: formData.bio,
				}),
			})
			toast.success('Профиль обновлён!')

			const updatedUser = { ...user, username: formData.username, bio: formData.bio }
			localStorage.setItem('user', JSON.stringify(updatedUser))
			updateUser({ username: formData.username, bio: formData.bio })

			onSave(formData)
		} catch (error) {
			toast.error(error.message || 'Не удалось обновить профиль')
			setLoading(false)
		}
	}

	return (
		<Modal title="Редактировать профиль" onClose={onClose} size="medium">
			<form onSubmit={handleSubmit} className="edit-profile-form">
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
						placeholder="Расскажите о себе..."
						className="textarea"
						rows="4"
						maxLength={100}
					/>
					<div className="input-helper">
						{formData.bio.length}/100 символов
					</div>
				</div>

				<div className="modal__actions">
					<Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
						Отмена
					</Button>
					<Button type="submit" variant="primary" disabled={loading}>
						{loading ? 'Сохранение...' : 'Сохранить'}
					</Button>
				</div>
			</form>
		</Modal>
	)
}

export default EditProfileModal
