function Loading({ message = 'Loading...' }) {
	return (
		<div className="loading-overlay">
			<div className="loading-content">
				<div className="loading-spinner">
					<div className="loading-spinner__circle"></div>
					<div className="loading-spinner__circle"></div>
					<div className="loading-spinner__circle"></div>
				</div>
				<p className="loading-message">{message}</p>
			</div>
		</div>
	)
}

export default Loading