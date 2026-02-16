import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'

function EditProfileModal({ data, onSave, onClose }) {
	const { user } = useAuth()
	const [formData, setFormData] = useState({
		username: data.username,
		bio: data.bio,
	})
	const [loading, setLoading] = useState(false)
	
	const handleChange = (e) => {
		const { name, value } = e.target
		setFormData({
			...formData,
			[name]: value,
		})
	}
	
	const handleSubmit = async (e) => {
		e.preventDefault()
		
		if (!formData.username.trim()) {
			toast.error('Username is required')
			return
		}
		
		if (formData.bio.length > 100) {
			toast.error('Bio must be less than 100 characters')
			return
		}
		
		setLoading(true)
		
		try {
			const password = localStorage.getItem('password')
			
			const response = await fetch('http://localhost:5000/api/profile', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					username: user.username,
					password: password,
					new_username: formData.username,
					new_bio: formData.bio,
				}),
			})
			
			if (response.ok) {
				toast.success('Profile updated successfully!')
				
				// ✅ ВАЖНО: Сохраняем текущий avatar при обновлении
				const updatedUser = {
					...user,
					username: formData.username,
					bio: formData.bio,
					// Сохраняем текущий avatar
					avatar: user.avatar
				}
				
				// Обновляем localStorage
				localStorage.setItem('user', JSON.stringify(updatedUser))
				localStorage.setItem('username', formData.username)
				
				// Передаем в Profile через onSave
				onSave(formData)
			} else {
				const error = await response.json()
				toast.error(error.error || 'Failed to update profile')
				setLoading(false)
			}
		} catch (error) {
			console.error('Error updating profile:', error)
			toast.error('Failed to update profile')
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