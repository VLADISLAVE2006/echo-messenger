import { useState } from 'react'
import TimerWidget from './TimerWidget'
import PollWidget from './PollWidget'
import TodoWidget from './TodoWidget'
import StatsWidget from './StatsWidget'

function ToolsGrid({ teamId, teamData }) {
	const [pinnedWidgets, setPinnedWidgets] = useState({
		stats: false,
		timer: false,
		poll: false,
		todo: false,
	})
	
	const [pinOrder, setPinOrder] = useState([]) // Порядок закрепления
	
	const togglePin = (widgetId) => {
		setPinnedWidgets(prev => {
			const newPinned = !prev[widgetId]
			
			// Если закрепляем - добавляем в конец порядка
			if (newPinned) {
				setPinOrder(currentOrder => [...currentOrder, widgetId])
			} else {
				// Если открепляем - убираем из порядка
				setPinOrder(currentOrder => currentOrder.filter(id => id !== widgetId))
			}
			
			return {
				...prev,
				[widgetId]: newPinned,
			}
		})
	}
	
	const widgets = [
		{
			id: 'stats',
			component: <StatsWidget
				key="stats"
				teamId={teamId}
				teamData={teamData}
				isPinned={pinnedWidgets.stats}
				onTogglePin={() => togglePin('stats')}
			/>,
			isPinned: pinnedWidgets.stats,
		},
		{
			id: 'timer',
			component: <TimerWidget
				key="timer"
				teamId={teamId}
				isPinned={pinnedWidgets.timer}
				onTogglePin={() => togglePin('timer')}
			/>,
			isPinned: pinnedWidgets.timer,
		},
		{
			id: 'poll',
			component: <PollWidget
				key="poll"
				teamId={teamId}
				isPinned={pinnedWidgets.poll}
				onTogglePin={() => togglePin('poll')}
			/>,
			isPinned: pinnedWidgets.poll,
		},
		{
			id: 'todo',
			component: <TodoWidget
				key="todo"
				teamId={teamId}
				isPinned={pinnedWidgets.todo}
				onTogglePin={() => togglePin('todo')}
			/>,
			isPinned: pinnedWidgets.todo,
		},
	]
	
	// Сортируем: закрепленные в порядке закрепления, затем незакрепленные
	const sortedWidgets = [...widgets].sort((a, b) => {
		const aIndex = pinOrder.indexOf(a.id)
		const bIndex = pinOrder.indexOf(b.id)
		
		// Оба закреплены - сортируем по порядку закрепления
		if (a.isPinned && b.isPinned) {
			return aIndex - bIndex
		}
		
		// Только a закреплен
		if (a.isPinned && !b.isPinned) {
			return -1
		}
		
		// Только b закреплен
		if (!a.isPinned && b.isPinned) {
			return 1
		}
		
		// Оба не закреплены - оставляем исходный порядок
		return 0
	})
	
	return (
		<div className="tools-grid">
			<div className="tools-grid__container">
				{sortedWidgets.map(widget => (
					<div
						key={widget.id}
						className={`tools-grid__widget ${widget.isPinned ? 'tools-grid__widget--pinned' : ''}`}
					>
						{widget.component}
					</div>
				))}
			</div>
		</div>
	)
}

export default ToolsGrid