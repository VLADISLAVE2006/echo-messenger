import { useEffect, useRef } from 'react'

function ToolSettings({ tool, color, setColor, lineWidth, setLineWidth, position, onClose }) {
	const settingsRef = useRef(null)
	
	useEffect(() => {
		const handleClickOutside = (e) => {
			if (settingsRef.current && !settingsRef.current.contains(e.target)) {
				onClose()
			}
		}
		
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [onClose])
	
	const getToolName = () => {
		const names = {
			pen: 'Pen',
			marker: 'Marker',
			eraser: 'Eraser',
			line: 'Line',
			rectangle: 'Rectangle',
			circle: 'Circle',
			triangle: 'Triangle',
		}
		return names[tool] || 'Tool'
	}
	
	const showColorPicker = ['pen', 'marker'].includes(tool)
	
	return (
		<div
			ref={settingsRef}
			className="tool-settings"
			style={{
				left: `${position.x}px`,
				top: `${position.y}px`,
			}}
		>
			<div className="tool-settings__header">
				<h4 className="tool-settings__title">{getToolName()} Settings</h4>
				<button className="tool-settings__close" onClick={onClose}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<line x1="18" y1="6" x2="6" y2="18"/>
						<line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>
			
			{showColorPicker && (
				<div className="tool-settings__section">
					<label className="tool-settings__label">Color</label>
					<div className="tool-settings__color-picker">
						<input
							type="color"
							value={color}
							onChange={(e) => setColor(e.target.value)}
							className="tool-settings__color-input"
						/>
						<span className="tool-settings__color-value">{color}</span>
					</div>
					
					<div className="tool-settings__presets">
						{['#000000', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'].map(presetColor => (
							<button
								key={presetColor}
								className={`tool-settings__preset ${color === presetColor ? 'tool-settings__preset--active' : ''}`}
								style={{ backgroundColor: presetColor }}
								onClick={() => setColor(presetColor)}
							/>
						))}
					</div>
				</div>
			)}
			
			<div className="tool-settings__section">
				<label className="tool-settings__label">
					{tool === 'eraser' ? 'Eraser Size' : 'Line Width'}: {lineWidth}px
				</label>
				<input
					type="range"
					min="1"
					max="20"
					value={lineWidth}
					onChange={(e) => setLineWidth(Number(e.target.value))}
					className="tool-settings__range"
				/>
				
				<div className="tool-settings__preview">
					<div
						className="tool-settings__preview-line"
						style={{
							backgroundColor: showColorPicker ? color : '#000000',
							height: `${lineWidth}px`,
						}}
					/>
				</div>
			</div>
		</div>
	)
}

export default ToolSettings