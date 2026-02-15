import { useState, useEffect, useRef } from 'react'
import Button from '../../common/Button'

function PomodoroWidget({ teamId, isPinned, onTogglePin }) {
	const [mode, setMode] = useState('work') // 'work' or 'break'
	const [timeLeft, setTimeLeft] = useState(25 * 60) // 25 minutes in seconds
	const [isActive, setIsActive] = useState(false)
	const intervalRef = useRef(null)
	
	const workTime = 25 * 60
	const breakTime = 5 * 60
	
	useEffect(() => {
		if (isActive && timeLeft > 0) {
			intervalRef.current = setInterval(() => {
				setTimeLeft(prev => prev - 1)
			}, 1000)
		} else if (timeLeft === 0) {
			// Switch mode when timer ends
			if (mode === 'work') {
				setMode('break')
				setTimeLeft(breakTime)
			} else {
				setMode('work')
				setTimeLeft(workTime)
			}
			setIsActive(false)
		}
		
		return () => clearInterval(intervalRef.current)
	}, [isActive, timeLeft, mode])
	
	const toggleTimer = () => {
		setIsActive(!isActive)
	}
	
	const resetTimer = () => {
		setIsActive(false)
		setTimeLeft(mode === 'work' ? workTime : breakTime)
	}
	
	const switchMode = (newMode) => {
		setMode(newMode)
		setTimeLeft(newMode === 'work' ? workTime : breakTime)
		setIsActive(false)
	}
	
	const formatTime = (seconds) => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
	}
	
	const progress = ((mode === 'work' ? workTime : breakTime) - timeLeft) / (mode === 'work' ? workTime : breakTime) * 100
	
	return (
		<div className="widget pomodoro-widget">
			<div className="widget__header">
				<h3 className="widget__title">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<circle cx="12" cy="12" r="10"/>
						<polyline points="12 6 12 12 16 14"/>
					</svg>
					Pomodoro Timer
				</h3>
			</div>
			
			<div className="widget__content">
				<div className="pomodoro-widget__modes">
					<button
						className={`pomodoro-widget__mode ${mode === 'work' ? 'pomodoro-widget__mode--active' : ''}`}
						onClick={() => switchMode('work')}
					>
						Work
					</button>
					<button
						className={`pomodoro-widget__mode ${mode === 'break' ? 'pomodoro-widget__mode--active' : ''}`}
						onClick={() => switchMode('break')}
					>
						Break
					</button>
				</div>
				
				<div className="pomodoro-widget__timer">
					<div className="pomodoro-widget__circle" style={{ '--progress': `${progress}%` }}>
						<span className="pomodoro-widget__time">{formatTime(timeLeft)}</span>
					</div>
				</div>
				
				<div className="pomodoro-widget__controls">
					<Button variant="primary" onClick={toggleTimer}>
						{isActive ? 'Pause' : 'Start'}
					</Button>
					<Button variant="secondary" onClick={resetTimer}>
						Reset
					</Button>
				</div>
			</div>
		</div>
	)
}

export default PomodoroWidget