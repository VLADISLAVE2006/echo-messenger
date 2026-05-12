import { useState } from 'react'
import { apiFetch } from '@shared/api/api'
import toast from 'react-hot-toast'
import Button from '@shared/ui/Button'
import Modal from '@shared/ui/Modal'

function ChangeAvatarModal({ currentAvatar, onSave, onClose }) {
	const [preview, setPreview] = useState(currentAvatar)
	const [file, setFile] = useState(null)
	const [loading, setLoading] = useState(false)

	const handleFileChange = (e) => {
		const selectedFile = e.target.files[0]
		if (selectedFile) {
			if (selectedFile.size > 5 * 1024 * 1024) {
				toast.error('Файл слишком большой. Максимум 5MB')
				return
			}

			setFile(selectedFile)
			const reader = new FileReader()
			reader.onloadend = () => {
				setPreview(reader.result)
			}
			reader.readAsDataURL(selectedFile)
		}
	}

	const handleRemove = async () => {
		if (!confirm('Вы уверены, что хотите удалить аватар?')) return

		setLoading(true)
		try {
			await apiFetch('/profile/avatar', { method: 'DELETE' })
			toast.success('Аватар удален!')
			setPreview(null)
			setFile(null)
			onSave(null)
		} catch (error) {
			toast.error(error.message || 'Не удалось удалить аватар')
			setLoading(false)
		}
	}

	const handleSubmit = async (e) => {
		e.preventDefault()

		if (!preview) {
			toast.error('Выберите изображение')
			return
		}

		setLoading(true)
		try {
			await apiFetch('/profile/avatar', {
				method: 'POST',
				body: JSON.stringify({ avatar: preview }),
			})
			toast.success('Аватар обновлен!')
			onSave(preview)
		} catch (error) {
			toast.error(error.message || 'Не удалось обновить аватар')
			setLoading(false)
		}
	}

	return (
		<Modal title="Изменить фото профиля" onClose={onClose} size="medium">
			<form className="avatar-form" onSubmit={handleSubmit}>
				<div className="avatar-form__preview">
					{preview ? (
						<img src={preview} alt="Preview" className="avatar-form__img" />
					) : (
						<div className="avatar-form__placeholder">
							Выберите фото
						</div>
					)}
				</div>

				<div className="avatar-form__buttons">
					<label className="avatar-form__upload">
						<input
							type="file"
							accept="image/*"
							onChange={handleFileChange}
							hidden
							disabled={loading}
						/>
						<Button type="button" variant="secondary" as="span" disabled={loading}>
							Выбрать файл
						</Button>
					</label>

					{preview && (
						<Button
							type="button"
							variant="secondary"
							onClick={handleRemove}
							disabled={loading}
						>
							Удалить фото
						</Button>
					)}
				</div>

				<div className="modal__actions">
					<Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
						Отмена
					</Button>
					<Button type="submit" variant="primary" disabled={(!file && !currentAvatar) || loading}>
						{loading ? 'Сохранение...' : 'Сохранить'}
					</Button>
				</div>
			</form>
		</Modal>
	)
}

export default ChangeAvatarModal
