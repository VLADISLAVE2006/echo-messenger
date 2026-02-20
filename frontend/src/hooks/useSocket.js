import { useEffect, useRef, useCallback } from 'react'
import socketService from '../services/socket'

export const useSocket = (teamId, user) => {
	const socketRef = useRef(null)
	const isInitialized = useRef(false)
	
	useEffect(() => {
		if (!teamId || !user || isInitialized.current) return
		
		// Подключаемся к сокету
		socketRef.current = socketService.connect()
		isInitialized.current = true
		
		// Присоединяемся к команде
		const password = localStorage.getItem('password')
		if (password) {
			socketService.joinTeam(user.username, password, teamId)
		}
		
		// Cleanup при размонтировании
		return () => {
			if (password && teamId) {
				socketService.leaveTeam(user.username, password, teamId)
			}
		}
	}, [teamId, user])
	
	// Подписка на события
	const on = useCallback((event, callback) => {
		socketService.on(event, callback)
	}, [])
	
	// Отписка от события
	const off = useCallback((event, callback) => {
		socketService.off(event, callback)
	}, [])
	
	return {
		socket: socketRef.current,
		on,
		off,
		emit: socketService.emit.bind(socketService),
		joinTeam: socketService.joinTeam.bind(socketService),
		leaveTeam: socketService.leaveTeam.bind(socketService),
		sendMessage: socketService.sendMessage.bind(socketService),
		sendTyping: socketService.sendTyping.bind(socketService),
		joinWhiteboard: socketService.joinWhiteboard.bind(socketService),
		leaveWhiteboard: socketService.leaveWhiteboard.bind(socketService),
		sendWhiteboardDraw: socketService.sendWhiteboardDraw.bind(socketService),
		clearWhiteboard: socketService.clearWhiteboard.bind(socketService),
		sendPollCreated: socketService.sendPollCreated.bind(socketService),
		sendPollVote: socketService.sendPollVote.bind(socketService),
		getOnlineUsers: socketService.getOnlineUsers.bind(socketService),
	}
}