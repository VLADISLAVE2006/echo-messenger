import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

function TeamPoll({ teamData, isAdmin, activePoll, onClosePoll }) {
	const { user } = useAuth()
	const [hasVoted, setHasVoted] = useState(false)
	const [selectedOption, setSelectedOption] = useState(null)
	const [pollData, setPollData] = useState(activePoll)
	
	const handleVote = (optionId) => {
		if (hasVoted) return
		
		// Обновляем данные опроса локально
		const updatedOptions = pollData.options.map(opt =>
			opt.id === optionId
				? { ...opt, votes: opt.votes + 1 }
				: opt
		)
		
		setPollData({
			...pollData,
			options: updatedOptions
		})
		
		setSelectedOption(optionId)
		setHasVoted(true)
		
		// TODO: отправить голос на бэкенд
		toast.success('Vote submitted!')
	}
	
	const totalVotes = pollData.options.reduce((sum, opt) => sum + opt.votes, 0)
	
	return (
		<div className="team-poll-widget">
			<div className="team-poll-widget__header">
				<div className="team-poll-widget__icon">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<line x1="12" y1="20" x2="12" y2="10"/>
						<line x1="18" y1="20" x2="18" y2="4"/>
						<line x1="6" y1="20" x2="6" y2="16"/>
					</svg>
					<span>Active Poll</span>
				</div>
				<button className="team-poll-widget__close" onClick={onClosePoll}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<line x1="18" y1="6" x2="6" y2="18"/>
						<line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>
			
			<div className="team-poll-widget__content">
				<h3 className="team-poll-widget__question">{pollData.question}</h3>
				<p className="team-poll-widget__meta">
					by {pollData.createdBy} • {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
				</p>
				
				<div className="team-poll-widget__options">
					{pollData.options.map(option => {
						const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
						const isSelected = selectedOption === option.id
						
						return (
							<button
								key={option.id}
								className={`team-poll-widget__option ${isSelected ? 'team-poll-widget__option--selected' : ''} ${hasVoted ? 'team-poll-widget__option--disabled' : ''}`}
								onClick={() => handleVote(option.id)}
								disabled={hasVoted}
							>
								<div className="team-poll-widget__option-bar" style={{ width: `${percentage}%` }} />
								<span className="team-poll-widget__option-text">{option.text}</span>
								<span className="team-poll-widget__option-percentage">{percentage}%</span>
							</button>
						)
					})}
				</div>
			</div>
		</div>
	)
}

export default TeamPoll