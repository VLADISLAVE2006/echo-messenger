import { useState } from 'react'
import toast from 'react-hot-toast'
import Button from '../common/Button'
import Modal from '../common/Modal'

function ChangeAvatarModal({ currentAvatar, onSave, onClose }) {
	const [preview, setPreview] = useState(currentAvatar)
	const [file, setFile] = useState(null)
	
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
	
	const handleRemove = () => {
		setPreview(null)
		setFile(null)
		onSave(null)
	}
	
	const handleSubmit = (e) => {
		e.preventDefault()
		if (preview) {
			onSave(preview)
			toast.success('Аватар обновлен!')
		}
	}
	
	return (
		<Modal title="Изменить фото профиля" onClose={onClose}>
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
						/>
						<Button type="button" variant="secondary" as="span">
							Выбрать файл
						</Button>
					</label>
					
					{preview && (
						<Button type="button" variant="secondary" onClick={handleRemove}>
							Удалить фото
						</Button>
					)}
				</div>
				
				<div className="modal__actions">
					<Button type="button" variant="secondary" onClick={onClose}>
						Отмена
					</Button>
					<Button type="submit" variant="primary" disabled={!file && !currentAvatar}>
						Сохранить
					</Button>
				</div>
			</form>
		</Modal>
	)
}

export default ChangeAvatarModal