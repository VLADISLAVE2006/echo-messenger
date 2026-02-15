import { useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../common/Button'
import Input from '../../common/Input'

function PollWidget({ teamId, isPinned, onTogglePin }) {
	const { user } = useAuth()
	const [isCreating, setIsCreating] = useState(false)
	const [question, setQuestion] = useState('')
	const [options, setOptions] = useState(['', ''])
	const [activePoll, setActivePoll] = useState(null)
	const [votes, setVotes] = useState({})
	
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
		if (!question.trim() || options.filter(o => o.trim()).length < 2) return
		
		const poll = {
			id: Date.now(),
			question: question.trim(),
			options: options.filter(o => o.trim()).map((text, index) => ({
				id: index,
				text,
				votes: 0,
			})),
			createdBy: user.username,
		}
		
		setActivePoll(poll)
		setVotes({})
		setQuestion('')
		setOptions(['', ''])
		setIsCreating(false)
	}
	
	const vote = (optionId) => {
		if (votes[user.username]) return // Already voted
		
		setVotes({ ...votes, [user.username]: optionId })
		
		setActivePoll(prev => ({
			...prev,
			options: prev.options.map(opt =>
				opt.id === optionId
					? { ...opt, votes: opt.votes + 1 }
					: opt
			),
		}))
	}
	
	const closePoll = () => {
		setActivePoll(null)
		setVotes({})
	}
	
	const totalVotes = activePoll?.options.reduce((sum, opt) => sum + opt.votes, 0) || 0
	
	if (isCreating) {
		return (
			<div className="widget poll-widget">
				<div className="widget__header">
					<h3 className="widget__title">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<line x1="12" y1="20" x2="12" y2="10"/>
							<line x1="18" y1="20" x2="18" y2="4"/>
							<line x1="6" y1="20" x2="6" y2="16"/>
						</svg>
						Team Poll
					</h3>
				</div>
				
				<div className="widget__content">
					<Input
						type="text"
						label="Question"
						value={question}
						onChange={(e) => setQuestion(e.target.value)}
						placeholder="What's your question?"
						maxLength={100}
					/>
					
					<div className="poll-widget__options">
						<label className="input-label">Options</label>
						{options.map((option, index) => (
							<div key={index} className="poll-widget__option-input">
								<Input
									type="text"
									value={option}
									onChange={(e) => updateOption(index, e.target.value)}
									placeholder={`Option ${index + 1}`}
									maxLength={50}
								/>
								{options.length > 2 && (
									<button
										className="poll-widget__remove-option"
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
					
					<div className="poll-widget__actions">
						<Button variant="secondary" onClick={() => setIsCreating(false)}>
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
			</div>
		)
	}
	
	if (activePoll) {
		return (
			<div className="widget poll-widget">
				<div className="widget__header">
					<h3 className="widget__title">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<line x1="12" y1="20" x2="12" y2="10"/>
							<line x1="18" y1="20" x2="18" y2="4"/>
							<line x1="6" y1="20" x2="6" y2="16"/>
						</svg>
						Team Poll
					</h3>
				</div>
				
				<div className="widget__content">
					<div className="poll-widget__question">{activePoll.question}</div>
					<div className="poll-widget__meta">by {activePoll.createdBy} • {totalVotes} votes</div>
					
					<div className="poll-widget__results">
						{activePoll.options.map(option => {
							const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
							const hasVoted = votes[user.username] === option.id
							
							return (
								<button
									key={option.id}
									className={`poll-widget__option ${hasVoted ? 'poll-widget__option--voted' : ''} ${votes[user.username] ? 'poll-widget__option--disabled' : ''}`}
									onClick={() => vote(option.id)}
									disabled={!!votes[user.username]}
								>
									<div className="poll-widget__option-bar" style={{ width: `${percentage}%` }} />
									<div className="poll-widget__option-content">
										<span className="poll-widget__option-text">{option.text}</span>
										<span className="poll-widget__option-percentage">{percentage}%</span>
									</div>
								</button>
							)
						})}
					</div>
					
					{user.username === activePoll.createdBy && (
						<Button variant="danger" onClick={closePoll}>
							Close Poll
						</Button>
					)}
				</div>
			</div>
		)
	}
	
	return (
		<div className="widget poll-widget">
			<div className="widget__header">
				<h3 className="widget__title">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<line x1="12" y1="20" x2="12" y2="10"/>
						<line x1="18" y1="20" x2="18" y2="4"/>
						<line x1="6" y1="20" x2="6" y2="16"/>
					</svg>
					Team Poll
				</h3>
				<button
					className={`widget__pin ${isPinned ? 'widget__pin--active' : ''}`}
					onClick={onTogglePin}
					title={isPinned ? 'Unpin widget' : 'Pin widget'}
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M9 9V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/>
						<path d="M12 9v12"/>
						<path d="M6 14l6-4 6 4"/>
					</svg>
				</button>
			</div>
			
			<div className="widget__content">
				<div className="poll-widget__empty">
					<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
						<line x1="12" y1="20" x2="12" y2="10"/>
						<line x1="18" y1="20" x2="18" y2="4"/>
						<line x1="6" y1="20" x2="6" y2="16"/>
					</svg>
					<p>No active poll</p>
					<Button variant="primary" onClick={() => setIsCreating(true)}>
						Create Poll
					</Button>
				</div>
			</div>
		</div>
	)
}

export default PollWidget