import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

function ChatPanel({ teamId }) {
	const { user } = useAuth()
	const [messages, setMessages] = useState([])
	const [loading, setLoading] = useState(true)
	
	useEffect(() => {
		fetchMessages()
	}, [teamId])
	
	const fetchMessages = async () => {
		// ===== MOCK MESSAGES ДЛЯ ТЕСТОВОЙ КОМАНДЫ - УДАЛИТЬ ПОТОМ =====
		if (teamId === '999') {
			setTimeout(() => {
				setMessages([
					{
						id: 1,
						user_id: 2,
						username: 'john_doe',
						content: 'Hey everyone! Welcome to the team!',
						created_at: new Date(Date.now() - 3600000).toISOString(),
					},
					{
						id: 2,
						user_id: user.id || 1,
						username: user.username,
						content: 'Thanks! Excited to be here!',
						created_at: new Date(Date.now() - 1800000).toISOString(),
					},
					{
						id: 3,
						user_id: 3,
						username: 'jane_smith',
						content: "Let's get started on the project!",
						created_at: new Date(Date.now() - 900000).toISOString(),
					},
				])
				setLoading(false)
			}, 300)
			return
		}
		// ===== КОНЕЦ MOCK MESSAGES =====
		
		try {
			const response = await fetch(
				`http://localhost:5000/api/messages?chat_id=${teamId}&username=${user.username}&password=${localStorage.getItem('password')}`
			)
			
			if (response.ok) {
				const data = await response.json()
				setMessages(data)
			}
		} catch (error) {
			console.error('Error fetching messages:', error)
		} finally {
			setLoading(false)
		}
	}
	
	const handleSendMessage = async (content) => {
		// ===== MOCK SEND ДЛЯ ТЕСТОВОЙ КОМАНДЫ - УДАЛИТЬ ПОТОМ =====
		if (teamId === '999') {
			const newMessage = {
				id: messages.length + 1,
				user_id: user.id || 1,
				username: user.username,
				content,
				created_at: new Date().toISOString(),
			}
			setMessages([...messages, newMessage])
			return
		}
		// ===== КОНЕЦ MOCK SEND =====
		
		try {
			const response = await fetch('http://localhost:5000/api/messages', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					username: user.username,
					password: localStorage.getItem('password'),
					chat_id: teamId,
					content,
				}),
			})
			
			if (response.ok) {
				fetchMessages()
			}
		} catch (error) {
			console.error('Error sending message:', error)
		}
	}
	
	return (
		<div className="chat-panel">
			<div className="chat-panel__header">
				<h3 className="chat-panel__title">Team Chat</h3>
			</div>
			
			<MessageList messages={messages} loading={loading} currentUser={user} />
			
			<MessageInput onSend={handleSendMessage} />
		</div>
	)
}

export default ChatPanel