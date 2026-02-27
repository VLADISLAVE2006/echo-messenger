import { io } from 'socket.io-client'

const SOCKET_URL = 'http://localhost:5000'

class SocketService {
	constructor() {
		this.socket = null
		this.connected = false
		this.currentTeamId = null
	}
	
	connect() {
		if (this.socket) {
			console.log('🔄 Reusing existing socket')
			return this.socket
		}
		
		console.log('🔌 Creating new socket connection to:', SOCKET_URL)
		
		this.socket = io(SOCKET_URL, {
			transports: ['websocket'],
			autoConnect: true,
		})
		
		this.socket.on('connect', () => {
			console.log('✅ Socket connected:', this.socket.id)
			this.connected = true
		})
		
		this.socket.on('disconnect', (reason) => {
			console.log('❌ Socket disconnected:', reason)
			this.connected = false
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
		if (!this.socket?.connected) return
		
		// 🚫 Если уже в этой команде — ничего не делаем
		if (this.currentTeamId === teamId) {
			console.log('⚡ Already joined this team, skipping')
			return
		}
		
		console.log('📤 joinTeam called:', { username, teamId })
		
		this.socket.emit('join_team', {
			username,
			password,
			team_id: teamId
		})
		
		this.currentTeamId = teamId
	}
	
	leaveTeam(username, password, teamId) {
		if (!this.socket?.connected) return
		
		this.socket.emit('leave_team', {
			username,
			password,
			team_id: teamId
		})
		
		if (this.currentTeamId === teamId) {
			this.currentTeamId = null
		}
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
	
	// ⬇️ НОВЫЕ МЕТОДЫ
	sendWhiteboardDrawing(teamId, element, username) {
		this.emit('whiteboard_drawing', {
			team_id: teamId,
			element,
			username,
		})
	}
	
	sendWhiteboardCursor(teamId, username, x, y) {
		this.emit('whiteboard_cursor', {
			team_id: teamId,
			username,
			x,
			y,
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