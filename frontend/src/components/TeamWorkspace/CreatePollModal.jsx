import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'

function CreatePollModal({ onClose, onPollCreated }) {
	const { user } = useAuth()
	const [question, setQuestion] = useState('')
	const [options, setOptions] =   useState(['', ''])
	
	const addOption = () => {
		if (options.length < 6) {
			setOptions([...options, ''])
		}
	}
	
	const removeOption = (index) => {
		if (options.length > 2) {
			setOptions(options.filter((_, i) => i !== index))
		}
	}
	
	const updateOption = (index, value) => {
		const newOptions = [...options]
		newOptions[index] = value
		setOptions(newOptions)
	}
	
	const createPoll = () => {
		if (!question.trim()) {
			toast.error('Please enter a question')
			return
		}
		
		const validOptions = options.filter(o => o.trim())
		if (validOptions.length < 2) {
			toast.error('Please add at least 2 options')
			return
		}
		
		const poll = {
			id: Date.now(),
			question: question.trim(),
			options: validOptions.map((text, index) => ({
				id: index,
				text,
				votes: 0,
			})),
			createdBy: user.username,
			createdAt: new Date().toISOString(),
		}
		
		onPollCreated(poll)
		onClose()
	}
	
	return (
		<Modal title="Create Team Poll" onClose={onClose} size="medium">
			<div className="create-poll-modal">
				<Input
					type="text"
					label="Question"
					value={question}
					onChange={(e) => setQuestion(e.target.value)}
					placeholder="What's your question?"
					maxLength={100}
				/>
				
				<div className="create-poll-modal__options">
					<label className="input-label">Options</label>
					{options.map((option, index) => (
						<div key={index} className="create-poll-modal__option-wrapper">
							<input
								type="text"
								className="create-poll-modal__option-input"
								value={option}
								onChange={(e) => updateOption(index, e.target.value)}
								placeholder={`Option ${index + 1}`}
								maxLength={50}
							/>
							{options.length > 2 && (
								<button
									className="create-poll-modal__remove-btn"
									onClick={() => removeOption(index)}
									type="button"
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<line x1="18" y1="6" x2="6" y2="18"/>
										<line x1="6" y1="6" x2="18" y2="18"/>
									</svg>
								</button>
							)}
						</div>
					))}
					
					{options.length < 6 && (
						<Button variant="ghost" onClick={addOption}>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<line x1="12" y1="5" x2="12" y2="19"/>
								<line x1="5" y1="12" x2="19" y2="12"/>
							</svg>
							Add Option
						</Button>
					)}
				</div>
				
				<div className="create-poll-modal__actions">
					<Button variant="secondary" onClick={onClose}>
						Cancel
					</Button>
					<Button
						variant="primary"
						onClick={createPoll}
						disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
					>
						Create Poll
					</Button>
				</div>
			</div>
		</Modal>
	)
}

export default CreatePollModal