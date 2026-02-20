import { io } from 'socket.io-client'

const SOCKET_URL = 'http://localhost:5000'

class SocketService {
	constructor() {
		this.socket = null
		this.connected = false
	}
	
	connect() {
		if (this.socket?.connected) {
			return this.socket
		}
		
		this.socket = io(SOCKET_URL, {
			transports: ['websocket', 'polling'],
			autoConnect: true,
		})
		
		this.socket.on('connect', () => {
			console.log('✅ Socket connected:', this.socket.id)
			this.connected = true
		})
		
		this.socket.on('disconnect', () => {
			console.log('❌ Socket disconnected')
			this.connected = false
		})
		
		this.socket.on('error', (error) => {
			console.error('Socket error:', error)
		})
		
		return this.socket
	}
	
	disconnect() {
		if (this.socket) {
			this.socket.disconnect()
			this.socket = null
			this.connected = false
		}
	}
	
	emit(event, data) {
		if (this.socket?.connected) {
			this.socket.emit(event, data)
		} else {
			console.warn('Socket not connected, cannot emit:', event)
		}
	}
	
	on(event, callback) {
		if (this.socket) {
			this.socket.on(event, callback)
		}
	}
	
	off(event, callback) {
		if (this.socket) {
			this.socket.off(event, callback)
		}
	}
	
	// Team methods
	joinTeam(username, password, teamId) {
		this.emit('join_team', { username, password, team_id: teamId })
	}
	
	leaveTeam(username, password, teamId) {
		this.emit('leave_team', { username, password, team_id: teamId })
	}
	
	// Chat methods
	sendMessage(username, password, teamId, chatId, content) {
		this.emit('send_message', {
			username,
			password,
			team_id: teamId,
			chat_id: chatId,
			content,
		})
	}
	
	sendTyping(username, teamId, chatId, isTyping) {
		this.emit('typing', {
			username,
			team_id: teamId,
			chat_id: chatId,
			is_typing: isTyping,
		})
	}
	
	// Whiteboard methods
	joinWhiteboard(username, password, teamId) {
		this.emit('join_whiteboard', { username, password, team_id: teamId })
	}
	
	leaveWhiteboard(teamId) {
		this.emit('leave_whiteboard', { team_id: teamId })
	}
	
	sendWhiteboardDraw(teamId, element, username) {
		this.emit('whiteboard_draw', {
			team_id: teamId,
			element,
			username,
		})
	}
	
	clearWhiteboard(username, password, teamId) {
		this.emit('whiteboard_clear', { username, password, team_id: teamId })
	}
	
	// Poll methods
	sendPollCreated(teamId, poll) {
		this.emit('poll_created', { team_id: teamId, poll })
	}
	
	sendPollVote(teamId, pollId, optionId, username, votes) {
		this.emit('poll_vote', {
			team_id: teamId,
			poll_id: pollId,
			option_id: optionId,
			username,
			votes,
		})
	}
	
	// Utility methods
	getOnlineUsers(teamId) {
		this.emit('get_online_users', { team_id: teamId })
	}
}

// Singleton instance
const socketService = new SocketService()

export default socketService