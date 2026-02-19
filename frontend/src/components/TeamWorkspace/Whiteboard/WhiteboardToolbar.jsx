function WhiteboardToolbar({ tool, onToolClick, onClear }) {
	return (
		<div className="whiteboard-toolbar">
			<div className="whiteboard-toolbar__section">
				<h4 className="whiteboard-toolbar__title">Drawing Tools</h4>
				<div className="whiteboard-toolbar__tools">
					<button
						className={`whiteboard-toolbar__tool ${tool === 'pen' ? 'whiteboard-toolbar__tool--active' : ''}`}
						onClick={(e) => onToolClick('pen', e)}
						title="Pen"
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
						</svg>
						<span>Pen</span>
					</button>
					
					<button
						className={`whiteboard-toolbar__tool ${tool === 'marker' ? 'whiteboard-toolbar__tool--active' : ''}`}
						onClick={(e) => onToolClick('marker', e)}
						title="Marker"
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
							<path d="m15 5 4 4"/>
						</svg>
						<span>Marker</span>
					</button>
					
					<button
						className={`whiteboard-toolbar__tool ${tool === 'eraser' ? 'whiteboard-toolbar__tool--active' : ''}`}
						onClick={(e) => onToolClick('eraser', e)}
						title="Eraser"
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/>
							<path d="M22 21H7"/>
							<path d="m5 11 9 9"/>
						</svg>
						<span>Eraser</span>
					</button>
				</div>
			</div>
			
			<div className="whiteboard-toolbar__divider"></div>
			
			<div className="whiteboard-toolbar__section">
				<h4 className="whiteboard-toolbar__title">Shapes</h4>
				<div className="whiteboard-toolbar__tools">
					<button
						className={`whiteboard-toolbar__tool ${tool === 'line' ? 'whiteboard-toolbar__tool--active' : ''}`}
						onClick={(e) => onToolClick('line', e)}
						title="Line"
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<line x1="5" y1="19" x2="19" y2="5"/>
						</svg>
						<span>Line</span>
					</button>
					
					<button
						className={`whiteboard-toolbar__tool ${tool === 'rectangle' ? 'whiteboard-toolbar__tool--active' : ''}`}
						onClick={(e) => onToolClick('rectangle', e)}
						title="Rectangle"
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<rect x="3" y="3" width="18" height="18" rx="2"/>
						</svg>
						<span>Rectangle</span>
					</button>
					
					<button
						className={`whiteboard-toolbar__tool ${tool === 'circle' ? 'whiteboard-toolbar__tool--active' : ''}`}
						onClick={(e) => onToolClick('circle', e)}
						title="Circle"
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<circle cx="12" cy="12" r="10"/>
						</svg>
						<span>Circle</span>
					</button>
					
					<button
						className={`whiteboard-toolbar__tool ${tool === 'triangle' ? 'whiteboard-toolbar__tool--active' : ''}`}
						onClick={(e) => onToolClick('triangle', e)}
						title="Triangle"
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M12 2 L22 20 L2 20 Z"/>
						</svg>
						<span>Triangle</span>
					</button>
				</div>
			</div>
			
			<div className="whiteboard-toolbar__divider"></div>
			
			<div className="whiteboard-toolbar__section">
				<h4 className="whiteboard-toolbar__title">Actions</h4>
				<div className="whiteboard-toolbar__tools">
					<button
						className="whiteboard-toolbar__tool whiteboard-toolbar__tool--danger"
						onClick={onClear}
						title="Clear"
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<polyline points="3 6 5 6 21 6"/>
							<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
						</svg>
						<span>Clear All</span>
					</button>
				</div>
			</div>
		</div>
	)
}

export default WhiteboardToolbar