import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@shared/api/api'
import toast from 'react-hot-toast'

export const useWhiteboard = (teamId, user, socket) => {
	const [elements, setElements] = useState([])
	const [currentElement, setCurrentElement] = useState(null)
	const [liveElements, setLiveElements] = useState({})
	const [cursors, setCursors] = useState({})
	const [history, setHistory] = useState([[]])
	const [historyStep, setHistoryStep] = useState(0)
	const [isDrawing, setIsDrawing] = useState(false)
	const [isPanning, setIsPanning] = useState(false)
	const [panStart, setPanStart] = useState({ x: 0, y: 0 })
	const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
	const [spacePressed, setSpacePressed] = useState(false)

	const cursorThrottleRef = useRef(null)

	// Присоединяемся к whiteboard-комнате когда сокет готов
	useEffect(() => {
		if (!socket?.socket?.connected || !teamId) return
		socket.joinWhiteboard(parseInt(teamId))
		return () => {
			socket.leaveWhiteboard(parseInt(teamId))
		}
	}, [socket?.socket?.connected, teamId])

	// WEBSOCKET — регистрируем слушатели один раз на teamId
	useEffect(() => {
		if (!socket || !teamId) return

		const handleWhiteboardUpdate = (data) => {
			if (data.username !== user.username) {
				setElements(prev => {
					const newElements = [...prev, data.element]
					setHistory(historyPrev => [
						...historyPrev.slice(0, historyStep + 1),
						newElements
					])
					setHistoryStep(prevStep => prevStep + 1)
					return newElements
				})
				setLiveElements(prev => {
					const updated = { ...prev }
					delete updated[data.username]
					return updated
				})
			}
		}

		const handleWhiteboardLiveDrawing = (data) => {
			if (data.username !== user.username) {
				setLiveElements(prev => ({
					...prev,
					[data.username]: data.element
				}))
			}
		}

		const handleCursorUpdate = (data) => {
			if (data.username !== user.username) {
				setCursors(prev => ({
					...prev,
					[data.username]: { x: data.x, y: data.y }
				}))
				setTimeout(() => {
					setCursors(prev => {
						const updated = { ...prev }
						if (updated[data.username]?.x === data.x && updated[data.username]?.y === data.y) {
							delete updated[data.username]
						}
						return updated
					})
				}, 2000)
			}
		}

		const handleWhiteboardCleared = (data) => {
			if (data.username !== user.username) {
				setElements([])
				setLiveElements({})
				setHistory([[]])
				setHistoryStep(0)
				toast.success(`${data.username} очистил доску`)
			}
		}

		const handleWhiteboardSync = (data) => {
			if (data.username !== user.username) {
				setElements(data.elements)
				setHistory([data.elements])
				setHistoryStep(0)
			}
		}

		socket.on('whiteboard_update', handleWhiteboardUpdate)
		socket.on('whiteboard_live_drawing', handleWhiteboardLiveDrawing)
		socket.on('whiteboard_cursor_update', handleCursorUpdate)
		socket.on('whiteboard_cleared', handleWhiteboardCleared)
		socket.on('whiteboard_sync', handleWhiteboardSync)

		return () => {
			socket.off('whiteboard_update', handleWhiteboardUpdate)
			socket.off('whiteboard_live_drawing', handleWhiteboardLiveDrawing)
			socket.off('whiteboard_cursor_update', handleCursorUpdate)
			socket.off('whiteboard_cleared', handleWhiteboardCleared)
			socket.off('whiteboard_sync', handleWhiteboardSync)
		}
	}, [teamId, user.username])

	// Загружаем whiteboard из БД
	useEffect(() => {
		loadWhiteboard()
	}, [teamId])

	const loadWhiteboard = async () => {
		try {
			const data = await apiFetch(`/teams/${teamId}/whiteboard`)
			const parsedData = JSON.parse(data.data)
			setElements(parsedData.elements || [])
			setHistory([[...(parsedData.elements || [])]])
			setHistoryStep(0)
		} catch (error) {
			console.error('Error loading whiteboard:', error)
		}
	}

	const saveWhiteboard = async (elementsToSave) => {
		try {
			await apiFetch(`/teams/${teamId}/whiteboard`, {
				method: 'PUT',
				body: JSON.stringify({ data: JSON.stringify({ elements: elementsToSave }) }),
			})
		} catch (error) {
			console.error('Error saving whiteboard:', error)
		}
	}

	// Отправка live элемента (используем emit напрямую)
	const sendLiveElement = (element) => {
		if (socket?.socket?.connected) {
			socket.emit('whiteboard_drawing', {
				team_id: parseInt(teamId),
				element,
				username: user.username,
			})
		}
	}

	// Отправка позиции курсора (с throttle, используем emit напрямую)
	const sendCursorPosition = (x, y) => {
		if (!socket?.socket?.connected) return

		if (cursorThrottleRef.current) {
			clearTimeout(cursorThrottleRef.current)
		}

		cursorThrottleRef.current = setTimeout(() => {
			socket.emit('whiteboard_cursor', {
				team_id: parseInt(teamId),
				username: user.username,
				x,
				y,
			})
		}, 50)
	}

	const addElement = (element) => {
		socket.sendWhiteboardDraw(parseInt(teamId), element, user.username)

		// Добавляем локально
		const newElements = [...elements, element]
		setElements(newElements)
		setHistory([...history.slice(0, historyStep + 1), newElements])
		setHistoryStep(historyStep + 1)

		// Сохраняем в БД
		saveWhiteboard(newElements)
	}

	const undo = () => {
		if (historyStep > 0) {
			const newStep = historyStep - 1
			const newElements = history[newStep]

			setHistoryStep(newStep)
			setElements(newElements)

			saveWhiteboard(newElements)

			if (socket?.socket?.connected) {
				socket.emit('whiteboard_sync', {
					team_id: parseInt(teamId),
					elements: newElements,
					username: user.username,
				})
			}
		}
	}

	const redo = () => {
		if (historyStep < history.length - 1) {
			const newStep = historyStep + 1
			const newElements = history[newStep]

			setHistoryStep(newStep)
			setElements(newElements)

			saveWhiteboard(newElements)

			if (socket?.socket?.connected) {
				socket.emit('whiteboard_sync', {
					team_id: parseInt(teamId),
					elements: newElements,
					username: user.username,
				})
			}
		}
	}

	const clear = () => {
		socket.clearWhiteboard(parseInt(teamId))

		const newElements = []
		setElements(newElements)
		setLiveElements({})
		setHistory([...history.slice(0, historyStep + 1), newElements])
		setHistoryStep(historyStep + 1)
		saveWhiteboard(newElements)
	}

	return {
		elements,
		currentElement,
		setCurrentElement,
		liveElements,
		cursors,
		history,
		historyStep,
		isDrawing,
		setIsDrawing,
		isPanning,
		setIsPanning,
		panStart,
		setPanStart,
		panOffset,
		setPanOffset,
		spacePressed,
		setSpacePressed,
		addElement,
		sendLiveElement,
		sendCursorPosition,
		undo,
		redo,
		clear,
		canUndo: historyStep > 0,
		canRedo: historyStep < history.length - 1,
	}
}
