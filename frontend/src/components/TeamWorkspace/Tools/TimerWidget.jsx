import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import Button from '../../common/Button'
import Input from '../../common/Input'

function TimerWidget({ teamId, isPinned, onTogglePin }) {
	const [minutes, setMinutes] = useState(10)
	const [timeLeft, setTimeLeft] = useState(10 * 60)
	const [isActive, setIsActive] = useState(false)
	const [isEditing, setIsEditing] = useState(false)
	const intervalRef = useRef(null)
	const hasNotifiedRef = useRef(false)
	
	useEffect(() => {
		if (isActive && timeLeft > 0) {
			intervalRef.current = setInterval(() => {
				setTimeLeft(prev => {
					const newTime = prev - 1
					
					// Уведомление когда время истекло
					if (newTime === 0 && !hasNotifiedRef.current) {
						hasNotifiedRef.current = true
						
						// Toast уведомление на русском
						toast.success('Таймер завершен!', {
							duration: 5000,
							style: {
								background: '#10B981',
								color: '#fff',
								fontSize: '16px',
								fontWeight: '600',
							},
						})
					}
					
					return newTime
				})
			}, 1000)
		} else if (timeLeft === 0) {
			setIsActive(false)
		}
		
		return () => clearInterval(intervalRef.current)
	}, [isActive, timeLeft])
	
	const startTimer = () => {
		if (isEditing) {
			setTimeLeft(minutes * 60)
			setIsEditing(false)
		}
		hasNotifiedRef.current = false
		setIsActive(true)
	}
	
	const pauseTimer = () => {
		setIsActive(false)
	}
	
	const resetTimer = () => {
		setIsActive(false)
		setTimeLeft(minutes * 60)
		hasNotifiedRef.current = false
	}
	
	const formatTime = (seconds) => {
		const hrs = Math.floor(seconds / 3600)
		const mins = Math.floor((seconds % 3600) / 60)
		const secs = seconds % 60
		
		if (hrs > 0) {
			return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
		}
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
	}
	
	return (
		<div className="widget countdown-widget">
			<div className="widget__header">
				<h3 className="widget__title">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<circle cx="12" cy="12" r="10"/>
						<polyline points="12 6 12 12 16 14"/>
					</svg>
					Timer
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
				{isEditing ? (
					<div className="countdown-widget__edit">
						<Input
							type="number"
							label="Minutes"
							value={minutes}
							onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value) || 1))}
							min="1"
							max="999"
						/>
					</div>
				) : (
					<div className="countdown-widget__display">
            <span className={`countdown-widget__time ${timeLeft === 0 ? 'countdown-widget__time--finished' : ''}`}>
              {formatTime(timeLeft)}
            </span>
					</div>
				)}
				
				<div className="countdown-widget__controls">
					{isEditing ? (
						<Button variant="primary" onClick={startTimer}>
							Start Timer
						</Button>
					) : (
						<>
							<Button variant="primary" onClick={isActive ? pauseTimer : startTimer}>
								{isActive ? 'Pause' : 'Start'}
							</Button>
							<Button variant="secondary" onClick={resetTimer}>
								Reset
							</Button>
							<Button variant="ghost" onClick={() => setIsEditing(true)} disabled={isActive}>
								Edit
							</Button>
						</>
					)}
				</div>
			</div>
		</div>
	)
}

export default TimerWidget