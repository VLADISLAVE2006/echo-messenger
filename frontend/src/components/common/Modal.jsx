import { useEffect } from 'react'

function Modal({ title, children, onClose }) {
	useEffect(() => {
		document.body.classList.add('modal-opened')
		
		const handleEscape = (e) => {
			if (e.key === 'Escape') {
				onClose()
			}
		}
		
		document.addEventListener('keydown', handleEscape)
		
		return () => {
			document.body.classList.remove('modal-opened')
			document.removeEventListener('keydown', handleEscape)
		}
	}, [onClose])
	
	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal" onClick={(e) => e.stopPropagation()}>
				<div className="modal__header">
					<h3 className="modal__title">{title}</h3>
					<button className="modal__close" onClick={onClose}>
						✕
					</button>
				</div>
				<div className="modal__content">
					{children}
				</div>
			</div>
		</div>
	)
}

export default Modal