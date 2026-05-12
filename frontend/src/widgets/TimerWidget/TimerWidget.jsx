import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import Button from '@shared/ui/Button'
import Input from '@shared/ui/Input'

function TimerWidget({
	teamId,
	widgetId,
	title,
	onTitleChange,
	onDelete,
	onRename,
	isEditingTitle,
	editTitleValue,
	onEditTitleChange,
	onSaveTitle,
	onCancelEdit,
	initialMinutes = 10
}) {
	const [minutes, setMinutes] = useState(initialMinutes)
	const [timeLeft, setTimeLeft] = useState(initialMinutes * 60)
	const [isActive, setIsActive] = useState(false)
	const [isEditing, setIsEditing] = useState(false)
	const intervalRef = useRef(null)
	const hasNotifiedRef = useRef(false)

	useEffect(() => {
		if (isActive && timeLeft > 0) {
			intervalRef.current = setInterval(() => {
				setTimeLeft(prev => {
					const newTime = prev - 1
					if (newTime === 0 && !hasNotifiedRef.current) {
						hasNotifiedRef.current = true
						toast.success(`Таймер "${title}" завершён!`, { duration: 5000 })
					}
					return newTime
				})
			}, 1000)
		} else if (timeLeft === 0) {
			setIsActive(false)
		}

		return () => clearInterval(intervalRef.current)
	}, [isActive, timeLeft, title])

	const startTimer = () => {
		if (isEditing) {
			setTimeLeft(minutes * 60)
			setIsEditing(false)
		}
		hasNotifiedRef.current = false
		setIsActive(true)
	}

	const pauseTimer = () => setIsActive(false)
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
		<div className="widget timer-widget">
			<div className="widget__header">
				{isEditingTitle ? (
					<div className="widget__title-edit">
						<Input
							type="text"
							value={editTitleValue}
							onChange={(e) => onEditTitleChange(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && onSaveTitle()}
							autoFocus
						/>
						<button onClick={onSaveTitle}>✓</button>
						<button onClick={onCancelEdit}>✕</button>
					</div>
				) : (
					<h3 className="widget__title" onDoubleClick={onRename}>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<circle cx="12" cy="12" r="10"/>
							<polyline points="12 6 12 12 16 14"/>
						</svg>
						{title}
					</h3>
				)}
				<div className="widget__actions">
					<button className="widget__delete" onClick={onDelete} title="Удалить виджет">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<line x1="18" y1="6" x2="6" y2="18"/>
							<line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					</button>
				</div>
			</div>

			<div className="widget__content">
				{isEditing ? (
					<div className="timer-widget__edit">
						<Input
							type="number"
							label="Минуты"
							value={minutes}
							onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value) || 1))}
							min="1"
							max="999"
						/>
					</div>
				) : (
					<div className="timer-widget__display">
						<span className={`timer-widget__time ${timeLeft === 0 ? 'timer-widget__time--finished' : ''}`}>
							{formatTime(timeLeft)}
						</span>
					</div>
				)}

				<div className="timer-widget__controls">
					{isEditing ? (
						<Button variant="primary" onClick={startTimer}>Начать</Button>
					) : (
						<>
							<Button variant="primary" onClick={isActive ? pauseTimer : startTimer}>
								{isActive ? 'Пауза' : 'Старт'}
							</Button>
							<Button variant="secondary" onClick={resetTimer}>Сброс</Button>
							<Button variant="ghost" onClick={() => setIsEditing(true)} disabled={isActive}>
								Ред.
							</Button>
						</>
					)}
				</div>
			</div>
		</div>
	)
}

export default TimerWidget
