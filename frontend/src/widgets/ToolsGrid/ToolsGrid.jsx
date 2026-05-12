import { useState, useEffect, useRef } from 'react'
import TimerWidget from '@widgets/TimerWidget'
import TodoWidget from '@widgets/TodoWidget'
import StatsWidget from '@widgets/StatsWidget'

function ToolsGrid({ teamId, teamData, socket }) {
	const [widgets, setWidgets] = useState(() => {
		try {
			const saved = localStorage.getItem(`widgets-${teamId}`)
			return saved ? JSON.parse(saved) : []
		} catch {
			return []
		}
	})
	const [showAddMenu, setShowAddMenu] = useState(false)
	const addMenuRef = useRef(null)
	const [editingWidgetId, setEditingWidgetId] = useState(null)
	const [editTitle, setEditTitle] = useState('')

	useEffect(() => {
		localStorage.setItem(`widgets-${teamId}`, JSON.stringify(widgets))
	}, [widgets, teamId])

	useEffect(() => {
		if (!showAddMenu) return
		const handleClickOutside = (e) => {
			if (addMenuRef.current && !addMenuRef.current.contains(e.target)) {
				setShowAddMenu(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [showAddMenu])

	const addWidget = (type) => {
		const newWidget = {
			id: Date.now() + Math.random(),
			type,
			title: getDefaultTitle(type),
			data: type === 'timer' ? { minutes: 10 } : {}
		}
		setWidgets([...widgets, newWidget])
		setShowAddMenu(false)
	}

	const getDefaultTitle = (type) => {
		switch (type) {
			case 'stats': return 'Статистика'
			case 'timer': return 'Таймер'
			case 'todo': return 'Список дел'
			default: return 'Виджет'
		}
	}

	const deleteWidget = (id) => {
		setWidgets(widgets.filter(w => w.id !== id))
	}

	const startRename = (widget) => {
		setEditingWidgetId(widget.id)
		setEditTitle(widget.title)
	}

	const saveRename = (id) => {
		setWidgets(widgets.map(w =>
			w.id === id ? { ...w, title: editTitle.trim() || w.title } : w
		))
		setEditingWidgetId(null)
	}

	const updateWidgetData = (id, newData) => {
		setWidgets(widgets.map(w =>
			w.id === id ? { ...w, data: { ...w.data, ...newData } } : w
		))
	}

	const renderWidget = (widget) => {
		const commonProps = {
			teamId,
			teamData,
			socket,
			widgetId: widget.id,
			title: widget.title,
			onTitleChange: (newTitle) => updateWidgetData(widget.id, { title: newTitle }),
			onDelete: () => deleteWidget(widget.id),
			onRename: () => startRename(widget),
			isEditingTitle: editingWidgetId === widget.id,
			editTitleValue: editTitle,
			onEditTitleChange: setEditTitle,
			onSaveTitle: () => saveRename(widget.id),
			onCancelEdit: () => setEditingWidgetId(null)
		}

		switch (widget.type) {
			case 'stats':
				return <StatsWidget key={widget.id} {...commonProps} />
			case 'timer':
				return <TimerWidget key={widget.id} {...commonProps} initialMinutes={widget.data.minutes} />
			case 'todo':
				return <TodoWidget key={widget.id} {...commonProps} />
			default:
				return null
		}
	}

	return (
		<div className="tools-grid">
			<div className="tools-grid__header">
				<h3 className="tools-grid__title">Виджеты</h3>
				<div className="tools-grid__add-wrapper" ref={addMenuRef}>
					<button
						className="tools-grid__add-btn"
						onClick={() => setShowAddMenu(!showAddMenu)}
					>
						+ Добавить виджет
					</button>
					{showAddMenu && (
						<div className="tools-grid__add-menu">
							<button onClick={() => addWidget('stats')}>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
								</svg>
								Статистика
							</button>
							<button onClick={() => addWidget('timer')}>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
								</svg>
								Таймер
							</button>
							<button onClick={() => addWidget('todo')}>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
								</svg>
								Список дел
							</button>
						</div>
					)}
				</div>
			</div>

			<div className="tools-grid__container">
				{widgets.length === 0 ? (
					<div className="tools-grid__empty">
						<p>Нет добавленных виджетов</p>
					</div>
				) : (
					widgets.map(widget => renderWidget(widget))
				)}
			</div>
		</div>
	)
}

export default ToolsGrid
