import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import toast from 'react-hot-toast'

function ChatPanel({ teamId, teamData, chatId }) {
	const { user } = useAuth()
	const [messages, setMessages] = useState([])
	const [newMessage, setNewMessage] = useState('')
	const [loading, setLoading] = useState(false)
	const messagesEndRef = useRef(null)
	
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
				
				const message = {
					id: data.message_id,
					user_id: user.id,
					username: user.username,
					content: newMessage.trim(),
					created_at: new Date().toISOString(),
				}
				
				setMessages([...messages, message])
				setNewMessage('')
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
		const date = new Date(timestamp)
		return date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		})
	}
	
	const getAvatarLetter = (username) => {
		return username?.charAt(0).toUpperCase() || 'U'
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
						{messages.map(message => (
							<div key={message.id} className="chat-message">
								<div className="chat-message__avatar">
									<div className="chat-message__avatar-placeholder">
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
						))}
						<div ref={messagesEndRef} />
					</>
				)}
			</div>
			
			<form className="chat-panel__input" onSubmit={handleSendMessage}>
				<input
					type="text"
					value={newMessage}
					onChange={(e) => setNewMessage(e.target.value)}
					placeholder="Type a message..."
					className="chat-panel__input-field"
					disabled={loading}
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