import { useParams } from 'react-router-dom'

function Workspace() {
	const { id } = useParams()
	
	return (
		<div className="workspace-page">
			<h1>Workspace {id}</h1>
			<p>Мессенджер, Whiteboard, Pomodoro</p>
		</div>
	)
}

export default Workspace