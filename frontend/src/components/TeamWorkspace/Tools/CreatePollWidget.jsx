import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import Button from '../common/Button'
import Input from '../common/Input'
import toast from 'react-hot-toast'

function CreatePollModal({ teamId, socket, onClose, onPollCreated }) {
	const { user } = useAuth()
	const [question, setQuestion] = useState('')
	const [options, setOptions] = useState(['', ''])
	const [isCreating, setIsCreating] = useState(false)
	
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
	
	const createPoll = async () => {
		if (!question.trim()) {
			toast.error('Please enter a question')
			return
		}
		
		const validOptions = options.filter(o => o.trim())
		if (validOptions.length < 2) {
			toast.error('Please add at least 2 options')
			return
		}
		
		setIsCreating(true)
		
		try {
			const password = localStorage.getItem('password')
			
			const response = await fetch(`http://localhost:5000/api/teams/${teamId}/polls`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					username: user.username,
					password: password,
					question: question.trim(),
					options: validOptions,
				}),
			})
			
			if (response.ok) {
				const data = await response.json()
				
				console.log('✅ Poll created:', data.poll)
				
				// Отправляем через WebSocket ВСЕМ участникам команды
				if (socket?.socket?.connected) {
					socket.emit('poll_created', {
						team_id: parseInt(teamId),
						poll: data.poll
					})
				}
				
				// Локально обновляем у создателя
				if (onPollCreated) {
					onPollCreated(data.poll)
				}
				
				toast.success('Poll created!')
				onClose()
			} else {
				const error = await response.json()
				toast.error(error.error || 'Failed to create poll')
			}
		} catch (error) {
			console.error('Error creating poll:', error)
			toast.error('Failed to create poll')
		} finally {
			setIsCreating(false)
		}
	}
	
	const handleKeyDown = (e) => {
		if (e.key === ' ') {
			e.stopPropagation()
		}
	}
	
	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal" onClick={(e) => e.stopPropagation()}>
				<div className="modal__header">
					<h2 className="modal__title">Create Poll</h2>
					<button className="modal__close" onClick={onClose}>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<line x1="18" y1="6" x2="6" y2="18"/>
							<line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					</button>
				</div>
				
				<div className="modal__content">
					<Input
						type="text"
						label="Question"
						value={question}
						onChange={(e) => setQuestion(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="What's your question?"
						maxLength={100}
					/>
					
					<div className="create-poll-widget__options">
						<label className="input-label">Options</label>
						{options.map((option, index) => (
							<div key={index} className="create-poll-widget__option-input">
								<Input
									type="text"
									value={option}
									onChange={(e) => updateOption(index, e.target.value)}
									onKeyDown={handleKeyDown}
									placeholder={`Option ${index + 1}`}
									maxLength={50}
								/>
								{options.length > 2 && (
									<button
										className="create-poll-widget__remove-option"
										onClick={() => removeOption(index)}
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
					
					<Button
						variant="primary"
						onClick={createPoll}
						disabled={!question.trim() || options.filter(o => o.trim()).length < 2 || isCreating}
					>
						{isCreating ? 'Creating...' : 'Create Poll'}
					</Button>
				</div>
			</div>
		</div>
	)
}

export default CreatePollModal