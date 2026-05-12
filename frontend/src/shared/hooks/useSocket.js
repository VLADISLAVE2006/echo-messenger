import { useEffect, useRef, useCallback } from 'react'
import socketService from '@shared/socket/socket'

export const useSocket = (teamId, user) => {
	const socketRef = useRef(null)
	const isInitialized = useRef(false)
	const joinedTeamRef = useRef(null) // Отслеживаем какую команду присоединили

	useEffect(() => {
		if (!teamId || !user) return

		if (joinedTeamRef.current === teamId && socketRef.current?.connected) return

		if (!socketRef.current) {
			socketRef.current = socketService.connect()
			isInitialized.current = true
		}

		const joinTeam = () => {
			if (socketService.socket?.connected) {
				socketService.joinTeam(user.username, parseInt(teamId))
				joinedTeamRef.current = teamId
			}
		}

		if (socketService.socket?.connected) {
			joinTeam()
		} else {
			const handleConnect = () => joinTeam()
			socketService.on('connect', handleConnect)
			return () => socketService.off('connect', handleConnect)
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
