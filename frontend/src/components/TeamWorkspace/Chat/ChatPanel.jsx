import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import toast from 'react-hot-toast'

function ChatPanel({ teamId, teamData, chatId }) {
	const { user } = useAuth()
	const [messages, setMessages] = useState([])
	const [newMessage, setNewMessage] = useState('')
	const [loading, setLoading] = useState(false)
	const messagesEndRef = useRef(null)
	const inputRef = useRef(null)
	
	useEffect(() => {
		if (chatId) {
			fetchMessages()
		}
	}, [chatId])
	
	useEffect(() => {
		scrollToBottom()
	}, [messages])
	
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
		
		if (!newMessage.trim() || !chatId) return
		
		setLoading(true)
		
		try {
			const password = localStorage.getItem('password')
			
			const response = await fetch('http://localhost:5000/api/messages', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					username: user.username,
					password: password,
					chat_id: chatId,
					content: newMessage.trim(),
				}),
			})
			
			if (response.ok) {
				const data = await response.json()
				
				const serverTimestamp = data.created_at || new Date().toISOString()
				
				const message = {
					id: data.message_id,
					user_id: user.id,
					username: user.username,
					avatar: user.avatar, // ⬅️ Добавляем аватарку
					content: newMessage.trim(),
					created_at: serverTimestamp,
				}
				
				setMessages([...messages, message])
				setNewMessage('')
				
				setTimeout(() => {
					inputRef.current?.focus()
				}, 0)
			} else {
				const error = await response.json()
				toast.error(error.error || 'Failed to send message')
			}
		} catch (error) {
			console.error('Error sending message:', error)
			toast.error('Failed to send message')
		} finally {
			setLoading(false)
		}
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
	
	// Функция для получения аватарки (из user или teamData.members)
	const getMessageAvatar = (message) => {
		// Если это текущий пользователь
		if (message.user_id === user.id || message.username === user.username) {
			return user.avatar
		}
		
		// Ищем в членах команды
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
													// Fallback на placeholder если картинка не загрузилась
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
			
			<form className="chat-panel__input" onSubmit={handleSendMessage}>
				<input
					ref={inputRef}
					type="text"
					value={newMessage}
					onChange={(e) => setNewMessage(e.target.value)}
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