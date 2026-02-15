function MessageItem({ message, isOwn }) {
	const formatTime = (timestamp) => {
		const date = new Date(timestamp)
		return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
	}
	
	return (
		<div className={`message-item ${isOwn ? 'message-item--own' : ''}`}>
			<div className="message-item__header">
				<span className="message-item__author">{message.username}</span>
				<span className="message-item__time">{formatTime(message.created_at)}</span>
			</div>
			
			<div className="message-item__content">
				{message.content}
			</div>
			
			{isOwn && (
				<div className="message-item__actions">
					<button className="message-item__action">Edit</button>
					<button className="message-item__action">Delete</button>
				</div>
			)}
		</div>
	)
}

export default MessageItem