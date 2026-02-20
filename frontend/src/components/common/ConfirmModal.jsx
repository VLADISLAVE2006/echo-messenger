import { useEffect } from 'react'
import Button from './Button'

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = 'unset'
		}
		
		return () => {
			document.body.style.overflow = 'unset'
		}
	}, [isOpen])
	
	if (!isOpen) return null
	
	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal modal--small" onClick={(e) => e.stopPropagation()}>
				<div className="modal__header">
					<h3 className="modal__title">{title}</h3>
					<button className="modal__close" onClick={onClose}>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<line x1="18" y1="6" x2="6" y2="18"/>
							<line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					</button>
				</div>
				
				<div className="modal__body">
					<p className="modal__message">{message}</p>
				</div>
				
				<div className="modal__footer">
					<Button variant="secondary" onClick={onClose}>
						{cancelText}
					</Button>
					<Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
						{confirmText}
					</Button>
				</div>
			</div>
		</div>
	)
}

export default ConfirmModal