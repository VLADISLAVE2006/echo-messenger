import { useEffect, useRef, useCallback } from 'react'
import socketService from '../services/socket'

export const useSocket = (teamId, user) => {
	const socketRef = useRef(null)
	const isInitialized = useRef(false)
	const joinedTeamRef = useRef(null) // Отслеживаем какую команду присоединили
	
	useEffect(() => {
		if (!teamId || !user) {
			console.log('⚠️ Skipping socket init:', { teamId, user: !!user })
			return
		}
		
		// Если это та же команда - не переинициализируем
		if (joinedTeamRef.current === teamId && socketRef.current?.connected) {
			console.log('⚡ Already in this team, skipping')
			return
		}
		
		console.log('🔌 Initializing socket for team:', teamId)
		
		// Подключаемся к сокету (если еще не подключен)
		if (!socketRef.current) {
			socketRef.current = socketService.connect()
			isInitialized.current = true
		}
		
		// Функция присоединения к команде
		const joinTeam = () => {
			const password = localStorage.getItem('password')
			console.log('📤 Calling joinTeam...', {
				username: user.username,
				teamId,
				hasPassword: !!password,
				socketConnected: socketService.socket?.connected
			})
			
			if (password && socketService.socket?.connected) {
				socketService.joinTeam(user.username, password, parseInt(teamId))
				joinedTeamRef.current = teamId
			} else {
				console.warn('⚠️ Cannot join team:', {
					hasPassword: !!password,
					socketConnected: socketService.socket?.connected
				})
			}
		}
		
		// Проверяем статус подключения
		if (socketService.socket?.connected) {
			console.log('✅ Socket already connected, joining immediately')
			joinTeam()
		} else {
			console.log('⏳ Socket not connected yet, waiting...')
			
			// Ждем подключения
			const handleConnect = () => {
				console.log('✅ Socket connected event fired, joining team...')
				joinTeam()
			}
			
			socketService.on('connect', handleConnect)
			
			// Cleanup
			return () => {
				socketService.off('connect', handleConnect)
			}
		}
		
		// Cleanup при размонтировании компонента
		return () => {
			const password = localStorage.getItem('password')
			if (password && joinedTeamRef.current) {
				console.log('🧹 Leaving team on unmount:', joinedTeamRef.current)
				socketService.leaveTeam(user.username, password, joinedTeamRef.current)
				joinedTeamRef.current = null
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