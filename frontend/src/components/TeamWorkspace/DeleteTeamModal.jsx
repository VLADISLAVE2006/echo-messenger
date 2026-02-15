import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'

function DeleteTeamModal({ team, onClose, onDelete }) {
	const [confirmText, setConfirmText] = useState('')
	const [loading, setLoading] = useState(false)
	
	const isConfirmValid = confirmText === team.name
	
	const handleDelete = async () => {
		if (!isConfirmValid) return
		
		setLoading(true)
		
		// TODO: Интеграция с API для удаления команды
		setTimeout(() => {
			toast.success('Team deleted successfully')
			setLoading(false)
			onDelete()
		}, 500)
	}
	
	return (
		<Modal title="Delete Team" onClose={onClose} size="medium">
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
						This action cannot be undone
					</h3>
					
					<p className="delete-team-modal__warning-text">
						Deleting <strong>{team.name}</strong> will permanently remove all team data, including:
					</p>
					
					<ul className="delete-team-modal__warning-list">
						<li>All team messages and chat history</li>
						<li>All whiteboard content and drawings</li>
						<li>Team members and their roles</li>
						<li>All team settings and configurations</li>
					</ul>
				</div>
				
				<div className="delete-team-modal__confirmation">
					<p className="delete-team-modal__confirmation-text">
						To confirm deletion, please type the team name: <strong>{team.name}</strong>
					</p>
					
					<Input
						type="text"
						value={confirmText}
						onChange={(e) => setConfirmText(e.target.value)}
						placeholder="Type team name to confirm"
						autoFocus
					/>
				</div>
				
				<div className="delete-team-modal__actions">
					<Button variant="secondary" onClick={onClose} disabled={loading}>
						Cancel
					</Button>
					<Button
						variant="danger"
						onClick={handleDelete}
						disabled={!isConfirmValid || loading}
					>
						{loading ? 'Deleting...' : 'Delete Team'}
					</Button>
				</div>
			</div>
		</Modal>
	)
}

export default DeleteTeamModal