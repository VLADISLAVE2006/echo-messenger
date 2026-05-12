import { useState } from 'react'
import { apiFetch } from '@shared/api/api'
import toast from 'react-hot-toast'
import Modal from '@shared/ui/Modal'
import Button from '@shared/ui/Button'
import Input from '@shared/ui/Input'

function CreateTeamModal({ onClose, onCreate }) {
	const [formData, setFormData] = useState({
		name: '',
		description: '',
		is_private: false,
	})
	const [loading, setLoading] = useState(false)

	const handleChange = (e) => {
		const { name, value, type, checked } = e.target
		setFormData({
			...formData,
			[name]: type === 'checkbox' ? checked : value,
		})
	}

	const handleSubmit = async (e) => {
		e.preventDefault()

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
			const data = await apiFetch('/teams', {
				method: 'POST',
				body: JSON.stringify({
					name: formData.name.trim(),
					description: formData.description.trim(),
					is_private: formData.is_private,
				}),
			})
			toast.success('Команда успешно создана!')
			onCreate(data)
		} catch (error) {
			toast.error(error.message || 'Не удалось создать команду')
		} finally {
			setLoading(false)
		}
	}

	return (
		<Modal title="Создать команду" onClose={onClose} size="medium">
			<form onSubmit={handleSubmit} className="create-team-form">
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
						placeholder="Расскажите о команде..."
						className="textarea"
						rows="4"
						maxLength={80}
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
						/>
						<span className="checkbox-text">Приватная команда (вступление по заявке)</span>
					</label>
				</div>

				<div className="modal__actions">
					<Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
						Отмена
					</Button>
					<Button type="submit" variant="primary" disabled={loading}>
						{loading ? 'Создание...' : 'Создать'}
					</Button>
				</div>
			</form>
		</Modal>
	)
}

export default CreateTeamModal
