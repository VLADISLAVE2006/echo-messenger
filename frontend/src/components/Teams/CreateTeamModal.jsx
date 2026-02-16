import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'

function CreateTeamModal({ onClose, onCreate }) {
	const { user } = useAuth()
	const [formData, setFormData] = useState({
		name: '',
		description: '',
		is_private: false,
	})
	const [loading, setLoading] = useState(false)
	
	const handleChange = (e) => {
		const { name, value, type, checked } = e.target
		setFormData({
			...formData,
			[name]: type === 'checkbox' ? checked : value,
		})
	}
	
	const handleSubmit = async (e) => {
		e.preventDefault()
		
		if (!formData.name.trim()) {
			toast.error('Team name is required')
			return
		}
		
		if (formData.description.length > 80) {
			toast.error('Description must be less than 80 characters')
			return
		}
		
		setLoading(true)
		
		try {
			const password = localStorage.getItem('password')
			
			const response = await fetch('http://localhost:5000/api/teams', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					username: user.username,
					password: password,
					name: formData.name.trim(),
					description: formData.description.trim(),
					is_private: formData.is_private,
				}),
			})
			
			if (response.ok) {
				const data = await response.json()
				toast.success('Team created successfully!')
				onCreate(data)
			} else {
				const error = await response.json()
				toast.error(error.error || 'Failed to create team')
			}
		} catch (error) {
			console.error('Error creating team:', error)
			toast.error('Failed to create team')
		} finally {
			setLoading(false)
		}
	}
	
	return (
		<Modal title="Create Team" onClose={onClose} size="medium">
			<form onSubmit={handleSubmit} className="create-team-form">
				<Input
					type="text"
					name="name"
					label="Team Name"
					value={formData.name}
					onChange={handleChange}
					placeholder="Enter team name"
					required
				/>
				
				<div className="input-wrapper">
					<label htmlFor="description" className="input-label">
						Description
					</label>
					<textarea
						id="description"
						name="description"
						value={formData.description}
						onChange={handleChange}
						placeholder="Describe your team..."
						className="textarea"
						rows="4"
						maxLength={80}
					/>
					<div className="input-helper">
						{formData.description.length}/80 characters
					</div>
				</div>
				
				<div className="checkbox-wrapper">
					<label className="checkbox-label">
						<input
							type="checkbox"
							name="is_private"
							checked={formData.is_private}
							onChange={handleChange}
							className="checkbox-input"
						/>
						<span className="checkbox-text">Private team (requires approval to join)</span>
					</label>
				</div>
				
				<div className="modal__actions">
					<Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
						Cancel
					</Button>
					<Button type="submit" variant="primary" disabled={loading}>
						{loading ? 'Creating...' : 'Create Team'}
					</Button>
				</div>
			</form>
		</Modal>
	)
}

export default CreateTeamModal