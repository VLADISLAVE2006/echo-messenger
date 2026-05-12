import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '@shared/api/api'
import toast from 'react-hot-toast'
import Modal from '@shared/ui/Modal'
import Button from '@shared/ui/Button'
import Input from '@shared/ui/Input'

function DeleteTeamModal({ team, onClose, onDelete }) {
	const navigate = useNavigate()
	const [confirmText, setConfirmText] = useState('')
	const [loading, setLoading] = useState(false)

	const isConfirmValid = confirmText === team.name

	const handleDelete = async () => {
		if (!isConfirmValid) return

		setLoading(true)
		try {
			await apiFetch(`/teams/${team.id}`, { method: 'DELETE' })
			toast.success('Команда удалена!')
			onClose()
			navigate('/dashboard', { replace: true })
		} catch (error) {
			toast.error(error.message || 'Не удалось удалить команду')
		} finally {
			setLoading(false)
		}
	}

	return (
		<Modal title="Удалить команду" onClose={onClose} size="medium">
			<div className="delete-team-modal">
				<div className="delete-team-modal__warning">
					<div className="delete-team-modal__warning-icon">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
							<line x1="12" y1="9" x2="12" y2="13"/>
							<line x1="12" y1="17" x2="12.01" y2="17"/>
						</svg>
					</div>

					<h3 className="delete-team-modal__warning-title">
						Это действие необратимо
					</h3>

					<p className="delete-team-modal__warning-text">
						Удаление <strong>{team.name}</strong> безвозвратно уничтожит все данные команды, включая:
					</p>

					<ul className="delete-team-modal__warning-list">
						<li>Всю историю сообщений и чаты</li>
						<li>Содержимое доски и все рисунки</li>
						<li>Список участников и их роли</li>
						<li>Настройки и конфигурацию команды</li>
					</ul>
				</div>

				<div className="delete-team-modal__confirmation">
					<p className="delete-team-modal__confirmation-text">
						Для подтверждения введите название команды: <strong>{team.name}</strong>
					</p>

					<Input
						type="text"
						value={confirmText}
						onChange={(e) => setConfirmText(e.target.value)}
						placeholder="Введите название команды"
						autoFocus
					/>
				</div>

				<div className="modal__actions">
					<Button variant="secondary" onClick={onClose} disabled={loading}>
						Отмена
					</Button>
					<Button
						variant="danger"
						onClick={handleDelete}
						disabled={!isConfirmValid || loading}
					>
						{loading ? 'Удаление...' : 'Удалить команду'}
					</Button>
				</div>
			</div>
		</Modal>
	)
}

export default DeleteTeamModal
