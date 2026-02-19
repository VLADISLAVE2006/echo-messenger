import { useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import Button from '../../common/Button'

function TodoWidget({ teamId, isPinned, onTogglePin }) {
	const { user } = useAuth()
	const [todos, setTodos] = useState([])
	const [newTodo, setNewTodo] = useState('')
	
	const addTodo = () => {
		if (!newTodo.trim()) return
		
		const todo = {
			id: Date.now(),
			text: newTodo.trim(),
			completed: false,
			completedBy: null,
			createdBy: user.username,
			createdAt: new Date().toISOString(),
		}
		
		setTodos([...todos, todo])
		setNewTodo('')
	}
	
	const toggleTodo = (id) => {
		setTodos(todos.map(todo => {
			if (todo.id === id) {
				return {
					...todo,
					completed: !todo.completed,
					completedBy: !todo.completed ? user.username : null,
				}
			}
			return todo
		}))
	}
	
	const deleteTodo = (id) => {
		setTodos(todos.filter(todo => todo.id !== id))
	}
	
	const handleKeyPress = (e) => {
		if (e.key === 'Enter') {
			addTodo()
		}
	}
	
	const completedCount = todos.filter(t => t.completed).length
	
	return (
		<div className="widget todo-widget">
			<div className="widget__header">
				<h3 className="widget__title">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<polyline points="9 11 12 14 22 4"/>
						<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
					</svg>
					Todo List
				</h3>
				<div className="widget__actions">
					{todos.length > 0 && (
						<span className="todo-widget__count">
        {completedCount}/{todos.length}
      </span>
					)}
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
			</div>
			
			<div className="widget__content">
				<div className="todo-widget__input">
					<input
						type="text"
						className="todo-widget__new-input"
						value={newTodo}
						onChange={(e) => setNewTodo(e.target.value)}
						onKeyPress={handleKeyPress}
						placeholder="Add a new task..."
						maxLength={100}
					/>
					<button
						className="todo-widget__add-button"
						onClick={addTodo}
						disabled={!newTodo.trim()}
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<line x1="12" y1="5" x2="12" y2="19"/>
							<line x1="5" y1="12" x2="19" y2="12"/>
						</svg>
					</button>
				</div>
				
				{todos.length === 0 ? (
					<div className="todo-widget__empty">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
							<polyline points="9 11 12 14 22 4"/>
							<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
						</svg>
						<p>No tasks yet</p>
					</div>
				) : (
					<div className="todo-widget__list">
						{todos.map(todo => (
							<div
								key={todo.id}
								className={`todo-widget__item ${todo.completed ? 'todo-widget__item--completed' : ''}`}
							>
								<label className="todo-widget__checkbox">
									<input
										type="checkbox"
										checked={todo.completed}
										onChange={() => toggleTodo(todo.id)}
									/>
									<span className="todo-widget__checkmark">
                    {todo.completed && (
	                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
		                    <polyline points="20 6 9 17 4 12"/>
	                    </svg>
                    )}
                  </span>
								</label>
								<div className="todo-widget__content">
									<span className="todo-widget__text">{todo.text}</span>
									{todo.completed && todo.completedBy && (
										<span className="todo-widget__completed-by">
                      Выполнил {todo.completedBy}
                    </span>
									)}
								</div>
								<button
									className="todo-widget__delete"
									onClick={() => deleteTodo(todo.id)}
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<polyline points="3 6 5 6 21 6"/>
										<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
									</svg>
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}

export default TodoWidget