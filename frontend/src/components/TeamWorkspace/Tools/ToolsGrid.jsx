import { useState } from 'react'
import TimerWidget from './TimerWidget'
import TodoWidget from './TodoWidget'
import StatsWidget from './StatsWidget'

function ToolsGrid({ teamId, teamData, socket }) {
  const [widgets, setWidgets] = useState([])
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [editingWidgetId, setEditingWidgetId] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  const addWidget = (type) => {
    const newWidget = {
      id: Date.now() + Math.random(),
      type,
      title: getDefaultTitle(type),
      // специфичные начальные данные (например, minutes для таймера)
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
      key: widget.id,
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
        return <StatsWidget {...commonProps} />
      case 'timer':
        return <TimerWidget {...commonProps} initialMinutes={widget.data.minutes} />
      case 'todo':
        return <TodoWidget {...commonProps} />
      default:
        return null
    }
  }

  return (
    <div className="tools-grid">
      <div className="tools-grid__header">
        <h3 className="tools-grid__title">Виджеты</h3>
        <div className="tools-grid__add-wrapper">
          <button 
            className="tools-grid__add-btn"
            onClick={() => setShowAddMenu(!showAddMenu)}
          >
            + Добавить виджет
          </button>
          {showAddMenu && (
            <div className="tools-grid__add-menu">
              <button onClick={() => addWidget('stats')}>📊 Статистика</button>
              <button onClick={() => addWidget('timer')}>⏱️ Таймер</button>
              <button onClick={() => addWidget('todo')}>✅ Список дел</button>
            </div>
          )}
        </div>
      </div>

      <div className="tools-grid__container">
        {widgets.length === 0 ? (
          <div className="tools-grid__empty">
            <p>Нет добавленных виджетов</p>
            <button onClick={() => setShowAddMenu(true)}>Добавить первый виджет</button>
          </div>
        ) : (
          widgets.map(widget => renderWidget(widget))
        )}
      </div>
    </div>
  )
}

export default ToolsGrid