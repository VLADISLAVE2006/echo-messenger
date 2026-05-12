import { useState, useEffect } from 'react'
import { useAuth } from '@shared/context/AuthContext'
import { apiFetch } from '@shared/api/api'
import toast from 'react-hot-toast'

function TeamPoll({ teamId, socket, activePoll, onClosePoll }) {
	const { user } = useAuth()
	const [hasVoted, setHasVoted] = useState(false)
	const [selectedOption, setSelectedOption] = useState(null)
	const [pollData, setPollData] = useState(activePoll)

	useEffect(() => {
		setPollData(activePoll)

		if (activePoll?.options) {
			const userVoted = activePoll.options.some(opt => opt.voted_by_current_user)
			setHasVoted(userVoted)

			if (userVoted) {
				const votedOption = activePoll.options.find(opt => opt.voted_by_current_user)
				if (votedOption) setSelectedOption(votedOption.id)
			}
		}
	}, [activePoll])

	useEffect(() => {
		if (!socket?.socket || !pollData) return

		const handlePollUpdated = (data) => {
			if (data.poll_id === pollData.id) {
				setPollData(prev => ({
					...prev,
					options: prev.options.map(opt =>
						opt.id === data.option_id ? { ...opt, votes: data.votes } : opt
					)
				}))
			}
		}

		socket.on('poll_updated', handlePollUpdated)
		return () => socket.off('poll_updated', handlePollUpdated)
	}, [socket?.socket, pollData?.id])

	const handleVote = async (optionId) => {
		if (hasVoted) return

		try {
			const data = await apiFetch(`/teams/${teamId}/polls/${pollData.id}/vote`, {
				method: 'POST',
				body: JSON.stringify({ option_id: optionId }),
			})

			if (socket?.socket?.connected) {
				socket.emit('poll_vote', {
					team_id: parseInt(teamId),
					poll_id: pollData.id,
					option_id: optionId,
					username: user.username,
					votes: data.votes,
				})
			}

			setPollData(prev => ({
				...prev,
				options: prev.options.map(opt =>
					opt.id === optionId ? { ...opt, votes: data.votes } : opt
				)
			}))

			setSelectedOption(optionId)
			setHasVoted(true)
			toast.success('Голос засчитан!')
		} catch (error) {
			toast.error(error.message || 'Не удалось проголосовать')
		}
	}

	const handleClosePoll = async () => {
		try {
			await apiFetch(`/teams/${teamId}/active-poll`, {
				method: 'POST',
				body: JSON.stringify({ poll_id: null }),
			})
			onClosePoll()
			toast.success('Голосование завершено')
		} catch (error) {
			toast.error(error.message || 'Не удалось завершить голосование')
		}
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
					<span>Активное голосование</span>
				</div>
				<button className="team-poll-widget__close" onClick={handleClosePoll}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<line x1="18" y1="6" x2="6" y2="18"/>
						<line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>

			<div className="team-poll-widget__content">
				<h3 className="team-poll-widget__question">{pollData.question}</h3>
				<p className="team-poll-widget__meta">
					от {pollData.created_by} • {totalVotes} {totalVotes === 1 ? 'голос' : totalVotes < 5 ? 'голоса' : 'голосов'}
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
