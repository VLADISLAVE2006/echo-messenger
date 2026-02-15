import { useEffect, useRef } from 'react'
import MessageItem from './MessageItem'

function MessageList({ messages, loading, currentUser }) {
	const messagesEndRef = useRef(null)
	
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}
	
	useEffect(() => {
		scrollToBottom()
	}, [messages])
	
	if (loading) {
		return <div className="message-list__loading">Loading messages...</div>
	}
	
	if (messages.length === 0) {
		return (
			<div className="message-list__empty">
				<p>No messages yet. Start the conversation!</p>
			</div>
		)
	}
	
	return (
		<div className="message-list">
			{messages.map(message => (
				<MessageItem
					key={message.id}
					message={message}
					isOwn={message.user_id === currentUser.id}
				/>
			))}
			<div ref={messagesEndRef} />
		</div>
	)
}

export default MessageList