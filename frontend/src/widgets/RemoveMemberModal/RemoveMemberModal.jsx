import { useState } from 'react'
import { apiFetch } from '@shared/api/api'
import toast from 'react-hot-toast'
import Modal from '@shared/ui/Modal'
import Button from '@shared/ui/Button'

function RemoveMemberModal({ member, teamId, onClose, onRemove }) {
	const [loading, setLoading] = useState(false)

	const handleRemove = async () => {
		setLoading(true)
		try {
			await apiFetch(`/teams/${teamId}/members/${member.id}`, { method: 'DELETE' })
			toast.success(`${member.username} исключён из команды`)
			onRemove()
		} catch (error) {
			toast.error(error.message || 'Не удалось исключить участника')
			setLoading(false)
		}
	}

	const getAvatarLetter = (username) => username?.charAt(0).toUpperCase() || 'U'

	return (
		<Modal title="Исключить участника" onClose={onClose} size="medium">
			<div className="remove-member-modal">
				<div className="remove-member-modal__warning">
					<div className="remove-member-modal__warning-icon">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
							<line x1="12" y1="9" x2="12" y2="13"/>
							<line x1="12" y1="17" x2="12.01" y2="17"/>
						</svg>
					</div>

					<h3 className="remove-member-modal__warning-title">
						Исключить участника?
					</h3>

					<div className="remove-member-modal__member">
						<div className="remove-member-modal__member-avatar">
							{member.avatar ? (
								<img
									src={member.avatar}
									alt={member.username}
									className="remove-member-modal__member-avatar-img"
								/>
							) : (
								<div className="remove-member-modal__member-avatar-placeholder">
									{getAvatarLetter(member.username)}
								</div>
							)}
						</div>
						<div className="remove-member-modal__member-info">
							<div className="remove-member-modal__member-name">{member.username}</div>
							{member.roles && member.roles.length > 0 && (
								<div className="remove-member-modal__member-roles">
									{member.roles.map((role, index) => (
										<span key={index} className="remove-member-modal__member-role">
											{role}
										</span>
									))}
								</div>
							)}
						</div>
					</div>

					<p className="remove-member-modal__warning-text">
						Участник потеряет доступ ко всем материалам команды.
					</p>
				</div>

				<div className="remove-member-modal__actions">
					<Button variant="secondary" onClick={onClose} disabled={loading}>
						Отмена
					</Button>
					<Button variant="danger" onClick={handleRemove} disabled={loading}>
						{loading ? 'Исключение...' : 'Исключить'}
					</Button>
				</div>
			</div>
		</Modal>
	)
}

export default RemoveMemberModal
