import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import toast from 'react-hot-toast'

function ChatPanel({ teamId, teamData, chatId, socket }) {
	const { user } = useAuth()
	const [messages, setMessages] = useState([])
	const [newMessage, setNewMessage] = useState('')
	const [typingUsers, setTypingUsers] = useState([])
	const [loading, setLoading] = useState(false)
	const messagesEndRef = useRef(null)
	const inputRef = useRef(null)
	const typingTimeoutRef = useRef(null)
	
	useEffect(() => {
		if (chatId) {
			fetchMessages()
		}
	}, [chatId])
	
	useEffect(() => {
		scrollToBottom()
	}, [messages])
	
	// ⬇️ WEBSOCKET СОБЫТИЯ
	useEffect(() => {
		if (!socket?.socket || !chatId) {
			console.log('⚠️ Socket or chatId not ready:', { hasSocket: !!socket?.socket, chatId })
			return
		}
		
		console.log('💬 Setting up chat socket listeners for chatId:', chatId)
		
		// Новое сообщение
		const handleNewMessage = (data) => {
			console.log('📨 NEW MESSAGE EVENT:', data)
			if (data.chat_id === chatId) {
				setMessages(prev => [...prev, data])
				scrollToBottom()
			}
		}
		
		// Индикатор печати
		const handleUserTyping = (data) => {
			console.log('⌨️ TYPING EVENT:', data)
			if (data.username !== user.username && data.chat_id === chatId) {
				setTypingUsers(prev => {
					if (data.is_typing && !prev.includes(data.username)) {
						return [...prev, data.username]
					} else if (!data.is_typing) {
						return prev.filter(u => u !== data.username)
					}
					return prev
				})
			}
		}
		
		socket.on('new_message', handleNewMessage)
		socket.on('user_typing', handleUserTyping)
		
		return () => {
			console.log('🧹 Cleaning up chat socket listeners')
			socket.off('new_message', handleNewMessage)
			socket.off('user_typing', handleUserTyping)
		}
	}, [socket?.socket, chatId, user.username])
	
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}
	
	const fetchMessages = async () => {
		if (!chatId) return
		
		try {
			const password = localStorage.getItem('password')
			
			const params = new URLSearchParams({
				username: user.username,
				password: password,
				chat_id: chatId,
				limit: 50,
				offset: 0,
			})
			
			const response = await fetch(`http://localhost:5000/api/messages?${params}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			})
			
			if (response.ok) {
				const data = await response.json()
				setMessages(data.reverse())
			}
		} catch (error) {
			console.error('Error fetching messages:', error)
		}
	}
	
	const handleSendMessage = async (e) => {
		e.preventDefault()
		
		if (!newMessage.trim() || !chatId || !socket?.socket) return
		
		setLoading(true)
		
		try {
			const password = localStorage.getItem('password')
			
			console.log('📤 Sending message via WebSocket:', {
				username: user.username,
				teamId,
				chatId,
				content: newMessage.trim()
			})
			
			// ⬇️ ОТПРАВКА ЧЕРЕЗ WEBSOCKET
			socket.sendMessage(
				user.username,
				password,
				parseInt(teamId),
				chatId,
				newMessage.trim()
			)
			
			setNewMessage('')
			
			// Останавливаем индикатор печати
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current)
			}
			socket.sendTyping(user.username, parseInt(teamId), chatId, false)
			
			setTimeout(() => {
				inputRef.current?.focus()
			}, 0)
		} catch (error) {
			console.error('Error sending message:', error)
			toast.error('Failed to send message')
		} finally {
			setLoading(false)
		}
	}
	
	const handleTyping = (e) => {
		setNewMessage(e.target.value)
		
		if (!socket?.socket) return
		
		// Отправляем индикатор печати
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current)
		}
		
		socket.sendTyping(user.username, parseInt(teamId), chatId, true)
		
		typingTimeoutRef.current = setTimeout(() => {
			socket.sendTyping(user.username, parseInt(teamId), chatId, false)
		}, 1000)
	}
	
	const formatTime = (timestamp) => {
		if (!timestamp) return ''
		
		try {
			let date = new Date(timestamp)
			
			if (isNaN(date.getTime())) {
				date = new Date(timestamp + 'Z')
			}
			
			if (isNaN(date.getTime())) {
				return ''
			}
			
			return date.toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			})
		} catch (error) {
			console.error('Error formatting time:', error)
			return ''
		}
	}
	
	const getAvatarLetter = (username) => {
		return username?.charAt(0).toUpperCase() || 'U'
	}
	
	const getAvatarColor = (username) => {
		const colors = [
			'#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
			'#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
		]
		
		let hash = 0
		for (let i = 0; i < username.length; i++) {
			hash = username.charCodeAt(i) + ((hash << 5) - hash)
		}
		
		return colors[Math.abs(hash) % colors.length]
	}
	
	const getMessageAvatar = (message) => {
		if (message.user_id === user.id || message.username === user.username) {
			return user.avatar
		}
		
		const member = teamData?.members?.find(m => m.username === message.username)
		return member?.avatar || message.avatar
	}
	
	if (!chatId) {
		return (
			<div className="chat-panel">
				<div className="chat-panel__header">
					<h3 className="chat-panel__title">Chat</h3>
				</div>
				<div className="chat-panel__empty">
					<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
						<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
					</svg>
					<p>Chat not available</p>
				</div>
			</div>
		)
	}
	
	return (
		<div className="chat-panel">
			<div className="chat-panel__header">
				<h3 className="chat-panel__title">Team Chat</h3>
			</div>
			
			<div className="chat-panel__messages">
				{messages.length === 0 ? (
					<div className="chat-panel__empty">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
							<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
						</svg>
						<p>No messages yet</p>
						<span>Start the conversation!</span>
					</div>
				) : (
					<>
						{messages.map(message => {
							const avatarUrl = getMessageAvatar(message)
							
							return (
								<div key={message.id} className="chat-message">
									<div className="chat-message__avatar">
										{avatarUrl ? (
											<img
												src={avatarUrl}
												alt={message.username}
												className="chat-message__avatar-img"
												onError={(e) => {
													e.target.style.display = 'none'
													e.target.nextElementSibling.style.display = 'flex'
												}}
											/>
										) : null}
										<div
											className="chat-message__avatar-placeholder"
											style={{
												backgroundColor: getAvatarColor(message.username),
												display: avatarUrl ? 'none' : 'flex'
											}}
										>
											{getAvatarLetter(message.username)}
										</div>
									</div>
									<div className="chat-message__content">
										<div className="chat-message__header">
											<span className="chat-message__author">{message.username}</span>
											<span className="chat-message__time">{formatTime(message.created_at)}</span>
										</div>
										<p className="chat-message__text">{message.content}</p>
									</div>
								</div>
							)
						})}
						<div ref={messagesEndRef} />
					</>
				)}
			</div>
			
			{/* ⬇️ ИНДИКАТОР ПЕЧАТИ */}
			{typingUsers.length > 0 && (
				<div className="chat-panel__typing">
					<div className="chat-panel__typing-dots">
						<span></span>
						<span></span>
						<span></span>
					</div>
					<span className="chat-panel__typing-text">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'печатает' : 'печатают'}...
          </span>
				</div>
			)}
			
			<form className="chat-panel__input" onSubmit={handleSendMessage}>
				<input
					ref={inputRef}
					type="text"
					value={newMessage}
					onChange={handleTyping}
					onKeyDown={(e) => {
						if (e.key === ' ') {
							e.stopPropagation()
						}
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault()
							handleSendMessage(e)
						}
					}}
					placeholder="Type a message..."
					className="chat-panel__input-field"
					disabled={loading}
					autoComplete="off"
				/>
				<button
					type="submit"
					className="chat-panel__send"
					disabled={!newMessage.trim() || loading}
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<line x1="22" y1="2" x2="11" y2="13"/>
						<polygon points="22 2 15 22 11 13 2 9 22 2"/>
					</svg>
				</button>
			</form>
		</div>
	)
}

export default ChatPanel