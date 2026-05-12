import { io } from 'socket.io-client'
import { getToken } from '@shared/api/api'

const SOCKET_URL = 'http://localhost:5000'

class SocketService {
	constructor() {
		this.socket = null
		this.connected = false
		this.currentTeamId = null
	}

	connect() {
		if (this.socket) return this.socket

		this.socket = io(SOCKET_URL, {
			transports: ['websocket'],
			autoConnect: true,
			upgrade: false,
			auth: { token: getToken() },
		})

		this.socket.on('connect', () => {
			this.connected = true
		})

		this.socket.on('disconnect', () => {
			this.connected = false
		})

		return this.socket
	}

	disconnect() {
		if (this.socket) {
			this.socket.io.reconnection(false)
			this.socket.disconnect()
			this.socket = null
			this.connected = false
			this.currentTeamId = null
		}
	}

	emit(event, data) {
		if (this.socket?.connected) {
			this.socket.emit(event, data)
		}
	}

	on(event, callback) {
		if (this.socket) this.socket.on(event, callback)
	}

	off(event, callback) {
		if (this.socket) this.socket.off(event, callback)
	}

	// Team methods
	joinTeam(username, teamId) {
		if (!this.socket?.connected) return
		if (this.currentTeamId === teamId) return

		this.socket.emit('join_team', { username, team_id: teamId })
		this.currentTeamId = teamId
	}

	leaveTeam(teamId) {
		if (!this.socket?.connected) return

		this.socket.emit('leave_team', { team_id: teamId })

		if (this.currentTeamId === teamId) {
			this.currentTeamId = null
		}
	}

	// Chat methods
	sendMessage(username, teamId, chatId, content) {
		this.emit('send_message', {
			username,
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
	joinWhiteboard(teamId) {
		this.emit('join_whiteboard', { team_id: teamId })
	}

	leaveWhiteboard(teamId) {
		this.emit('leave_whiteboard', { team_id: teamId })
	}

	sendWhiteboardDraw(teamId, element, username) {
		this.emit('whiteboard_draw', { team_id: teamId, element, username })
	}

	sendWhiteboardDrawing(teamId, element, username) {
		this.emit('whiteboard_drawing', { team_id: teamId, element, username })
	}

	sendWhiteboardCursor(teamId, username, x, y) {
		this.emit('whiteboard_cursor', { team_id: teamId, username, x, y })
	}

	clearWhiteboard(teamId) {
		this.emit('whiteboard_clear', { team_id: teamId })
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

	joinPersonalRoom() {
		const doJoin = () => {
			if (this.socket?.connected) {
				this.socket.emit('join_personal_room', {})
			}
		}

		if (this.socket?.connected) {
			doJoin()
		} else {
			const onConnect = () => {
				doJoin()
				this.socket?.off('connect', onConnect)
			}
			this.socket?.on('connect', onConnect)
		}
	}

	// Utility methods
	getOnlineUsers(teamId) {
		this.emit('get_online_users', { team_id: teamId })
	}
}

// Singleton instance
const socketService = new SocketService()

export default socketService
