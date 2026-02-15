import { useState } from 'react'

function MessageInput({ onSend }) {
	const [content, setContent] = useState('')
	
	const handleSubmit = (e) => {
		e.preventDefault()
		
		if (content.trim()) {
			onSend(content)
			setContent('')
		}
	}
	
	const handleKeyPress = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSubmit(e)
		}
	}
	
	return (
		<form className="message-input" onSubmit={handleSubmit}>
			<div className="message-input__wrapper">
        <textarea
	        className="message-input__textarea"
	        placeholder="Type a message..."
	        value={content}
	        onChange={(e) => setContent(e.target.value)}
	        onKeyPress={handleKeyPress}
	        rows={1}
        />
				
				<button
					type="submit"
					className="message-input__send"
					disabled={!content.trim()}
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<line x1="22" y1="2" x2="11" y2="13"/>
						<polygon points="22 2 15 22 11 13 2 9 22 2"/>
					</svg>
				</button>
			</div>
		</form>
	)
}

export default MessageInput