import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import WhiteboardToolbar from './WhiteboardToolbar'
import ToolSettings from './ToolSettings'

function WhiteboardCanvas({ teamId }) {
	const { user } = useAuth()
	const canvasRef = useRef(null)
	const containerRef = useRef(null)
	const [isDrawing, setIsDrawing] = useState(false)
	const [tool, setTool] = useState('pen')
	const [drawingColor, setDrawingColor] = useState('#000000')
	const [lineWidth, setLineWidth] = useState(2)
	const [elements, setElements] = useState([])
	const [currentElement, setCurrentElement] = useState(null)
	const [history, setHistory] = useState([[]])
	const [historyStep, setHistoryStep] = useState(0)
	
	const [isPanning, setIsPanning] = useState(false)
	const [panStart, setPanStart] = useState({ x: 0, y: 0 })
	const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
	const [spacePressed, setSpacePressed] = useState(false)
	
	const [showToolSettings, setShowToolSettings] = useState(null)
	const [toolSettingsPosition, setToolSettingsPosition] = useState({ x: 0, y: 0 })
	
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.code === 'Space' && !isDrawing) {
				e.preventDefault()
				setSpacePressed(true)
			}
		}
		
		const handleKeyUp = (e) => {
			if (e.code === 'Space') {
				setSpacePressed(false)
				setIsPanning(false)
			}
		}
		
		window.addEventListener('keydown', handleKeyDown)
		window.addEventListener('keyup', handleKeyUp)
		
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
			window.removeEventListener('keyup', handleKeyUp)
		}
	}, [isDrawing])
	
	useEffect(() => {
		redrawCanvas()
	}, [elements, currentElement, panOffset])
	
	const redrawCanvas = () => {
		const canvas = canvasRef.current
		if (!canvas) return
		
		const ctx = canvas.getContext('2d')
		ctx.clearRect(0, 0, canvas.width, canvas.height)
		
		ctx.save()
		ctx.translate(panOffset.x, panOffset.y)
		
		elements.forEach(element => drawElement(ctx, element))
		if (currentElement) drawElement(ctx, currentElement)
		
		ctx.restore()
	}
	
	const drawElement = (ctx, element) => {
		ctx.strokeStyle = element.color
		ctx.lineWidth = element.lineWidth
		ctx.lineCap = 'round'
		ctx.lineJoin = 'round'
		
		if (element.tool === 'eraser') {
			ctx.globalCompositeOperation = 'destination-out'
			ctx.lineWidth = element.lineWidth * 3
		} else {
			ctx.globalCompositeOperation = 'source-over'
		}
		
		switch (element.type) {
			case 'path':
				if (element.points.length < 2) break
				ctx.beginPath()
				ctx.moveTo(element.points[0].x, element.points[0].y)
				element.points.forEach(point => ctx.lineTo(point.x, point.y))
				ctx.stroke()
				break
			
			case 'line':
				ctx.beginPath()
				ctx.moveTo(element.startX, element.startY)
				ctx.lineTo(element.endX, element.endY)
				ctx.stroke()
				break
			
			case 'rectangle':
				ctx.strokeRect(element.startX, element.startY, element.width, element.height)
				break
			
			case 'circle':
				ctx.beginPath()
				ctx.arc(element.x, element.y, element.radius, 0, 2 * Math.PI)
				ctx.stroke()
				break
			
			case 'triangle':
				ctx.beginPath()
				ctx.moveTo(element.points[0].x, element.points[0].y)
				ctx.lineTo(element.points[1].x, element.points[1].y)
				ctx.lineTo(element.points[2].x, element.points[2].y)
				ctx.closePath()
				ctx.stroke()
				break
		}
		
		ctx.globalCompositeOperation = 'source-over'
	}
	
	const getMousePos = (e) => {
		const canvas = canvasRef.current
		const rect = canvas.getBoundingClientRect()
		return {
			x: (e.clientX - rect.left - panOffset.x) * (canvas.width / rect.width),
			y: (e.clientY - rect.top - panOffset.y) * (canvas.height / rect.height),
		}
	}
	
	const getToolColor = () => {
		if (tool === 'pen' || tool === 'marker') {
			return drawingColor
		}
		return '#000000'
	}
	
	const handleMouseDown = (e) => {
		e.preventDefault()
		
		if (spacePressed) {
			setIsPanning(true)
			setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
			return
		}
		
		const pos = getMousePos(e)
		const color = getToolColor()
		setIsDrawing(true)
		
		if (tool === 'pen' || tool === 'marker' || tool === 'eraser') {
			setCurrentElement({
				type: 'path',
				tool: tool,
				color: color,
				lineWidth: tool === 'marker' ? lineWidth * 2 : lineWidth,
				points: [pos],
			})
		} else if (tool === 'line') {
			setCurrentElement({
				type: 'line',
				tool: tool,
				color: color,
				lineWidth: lineWidth,
				startX: pos.x,
				startY: pos.y,
				endX: pos.x,
				endY: pos.y,
			})
		} else if (tool === 'rectangle') {
			setCurrentElement({
				type: 'rectangle',
				tool: tool,
				color: color,
				lineWidth: lineWidth,
				startX: pos.x,
				startY: pos.y,
				width: 0,
				height: 0,
			})
		} else if (tool === 'circle') {
			setCurrentElement({
				type: 'circle',
				tool: tool,
				color: color,
				lineWidth: lineWidth,
				x: pos.x,
				y: pos.y,
				radius: 0,
			})
		} else if (tool === 'triangle') {
			setCurrentElement({
				type: 'triangle',
				tool: tool,
				color: color,
				lineWidth: lineWidth,
				startX: pos.x,
				startY: pos.y,
				points: [pos, pos, pos],
			})
		}
	}
	
	const handleMouseMove = (e) => {
		e.preventDefault()
		
		if (isPanning) {
			setPanOffset({
				x: e.clientX - panStart.x,
				y: e.clientY - panStart.y,
			})
			return
		}
		
		if (!isDrawing || !currentElement) return
		
		const pos = getMousePos(e)
		
		if (tool === 'pen' || tool === 'marker' || tool === 'eraser') {
			setCurrentElement({
				...currentElement,
				points: [...currentElement.points, pos],
			})
		} else if (tool === 'line') {
			setCurrentElement({
				...currentElement,
				endX: pos.x,
				endY: pos.y,
			})
		} else if (tool === 'rectangle') {
			setCurrentElement({
				...currentElement,
				width: pos.x - currentElement.startX,
				height: pos.y - currentElement.startY,
			})
		} else if (tool === 'circle') {
			const radius = Math.sqrt(
				Math.pow(pos.x - currentElement.x, 2) +
				Math.pow(pos.y - currentElement.y, 2)
			)
			setCurrentElement({
				...currentElement,
				radius: radius,
			})
		} else if (tool === 'triangle') {
			const centerX = currentElement.startX
			const centerY = currentElement.startY
			const top = { x: centerX, y: pos.y }
			const bottomLeft = { x: centerX - (pos.x - centerX), y: centerY + (centerY - pos.y) }
			const bottomRight = { x: pos.x, y: centerY + (centerY - pos.y) }
			
			setCurrentElement({
				...currentElement,
				points: [top, bottomLeft, bottomRight],
			})
		}
	}
	
	const handleMouseUp = () => {
		if (isPanning) {
			setIsPanning(false)
			return
		}
		
		if (currentElement) {
			const newElements = [...elements, currentElement]
			setElements(newElements)
			setHistory([...history.slice(0, historyStep + 1), newElements])
			setHistoryStep(historyStep + 1)
			setCurrentElement(null)
		}
		setIsDrawing(false)
	}
	
	const handleUndo = () => {
		if (historyStep > 0) {
			setHistoryStep(historyStep - 1)
			setElements(history[historyStep - 1])
		}
	}
	
	const handleRedo = () => {
		if (historyStep < history.length - 1) {
			setHistoryStep(historyStep + 1)
			setElements(history[historyStep + 1])
		}
	}
	
	const handleClear = () => {
		if (confirm('Clear entire whiteboard?')) {
			const newElements = []
			setElements(newElements)
			setHistory([...history.slice(0, historyStep + 1), newElements])
			setHistoryStep(historyStep + 1)
		}
	}
	
	const handleToolClick = (toolName, event) => {
		const rect = event.currentTarget.getBoundingClientRect()
		setTool(toolName)
		setShowToolSettings(toolName)
		setToolSettingsPosition({
			x: rect.right + 10,
			y: rect.top,
		})
	}
	
	return (
		<div className="whiteboard">
			<div className="whiteboard__controls">
				<button
					className="whiteboard__control"
					onClick={handleUndo}
					disabled={historyStep === 0}
					title="Undo (Ctrl+Z)"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
						<path d="M9 14L4 9l5-5"/>
						<path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
					</svg>
				</button>
				
				<button
					className="whiteboard__control"
					onClick={handleRedo}
					disabled={historyStep >= history.length - 1}
					title="Redo (Ctrl+Y)"
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
						<path d="M15 14l5-5-5-5"/>
						<path d="M4 20v-7a4 4 0 0 1 4-4h12"/>
					</svg>
				</button>
			</div>
			
			<WhiteboardToolbar
				tool={tool}
				onToolClick={handleToolClick}
				onClear={handleClear}
			/>
			
			{showToolSettings && (
				<ToolSettings
					tool={showToolSettings}
					color={drawingColor}
					setColor={setDrawingColor}
					lineWidth={lineWidth}
					setLineWidth={setLineWidth}
					position={toolSettingsPosition}
					onClose={() => setShowToolSettings(null)}
				/>
			)}
			
			<div
				ref={containerRef}
				className="whiteboard__canvas-wrapper"
			>
				<canvas
					ref={canvasRef}
					width={2000}
					height={1200}
					className={`whiteboard__canvas ${
						spacePressed ? 'whiteboard__canvas--grab' :
							isPanning ? 'whiteboard__canvas--grabbing' : ''
					}`}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseUp}
				/>
			</div>
		</div>
	)
}

export default WhiteboardCanvas