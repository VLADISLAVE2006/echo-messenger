import { useState } from 'react'
import { apiFetch } from '@shared/api/api'
import toast from 'react-hot-toast'
import Modal from '@shared/ui/Modal'
import Button from '@shared/ui/Button'
import Input from '@shared/ui/Input'

function CreatePollModal({ teamId, onClose, onPollCreated }) {
	const [question, setQuestion] = useState('')
	const [options, setOptions] = useState(['', ''])

	const addOption = () => {
		if (options.length < 6) {
			setOptions([...options, ''])
		}
	}

	const removeOption = (index) => {
		if (options.length > 2) {
			setOptions(options.filter((_, i) => i !== index))
		}
	}

	const updateOption = (index, value) => {
		const newOptions = [...options]
		newOptions[index] = value
		setOptions(newOptions)
	}

	const createPoll = async () => {
		if (!question.trim()) {
			toast.error('Введите вопрос')
			return
		}

		const validOptions = options.filter(o => o.trim())
		if (validOptions.length < 2) {
			toast.error('Добавьте минимум 2 варианта ответа')
			return
		}

		try {
			const data = await apiFetch(`/teams/${teamId}/polls`, {
				method: 'POST',
				body: JSON.stringify({
					question: question.trim(),
					options: validOptions,
				}),
			})

			onPollCreated(data.poll)
			onClose()
		} catch (error) {
			toast.error(error.message || 'Не удалось создать голосование')
		}
	}

	return (
		<Modal title="Создать голосование" onClose={onClose} size="medium">
			<div className="create-poll-modal">
				<Input
					type="text"
					label="Вопрос"
					value={question}
					onChange={(e) => setQuestion(e.target.value)}
					placeholder="Ваш вопрос..."
					maxLength={100}
				/>

				<div className="create-poll-modal__options">
					<label className="input-label">Варианты ответа</label>
					{options.map((option, index) => (
						<div key={index} className="create-poll-modal__option-wrapper">
							<input
								type="text"
								className="create-poll-modal__option-input"
								value={option}
								onChange={(e) => updateOption(index, e.target.value)}
								placeholder={`Вариант ${index + 1}`}
								maxLength={50}
							/>
							{options.length > 2 && (
								<button
									className="create-poll-modal__remove-btn"
									onClick={() => removeOption(index)}
									type="button"
								>
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<line x1="18" y1="6" x2="6" y2="18"/>
										<line x1="6" y1="6" x2="18" y2="18"/>
									</svg>
								</button>
							)}
						</div>
					))}

					{options.length < 6 && (
						<Button variant="ghost" onClick={addOption}>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<line x1="12" y1="5" x2="12" y2="19"/>
								<line x1="5" y1="12" x2="19" y2="12"/>
							</svg>
							Добавить вариант
						</Button>
					)}
				</div>

				<div className="create-poll-modal__actions">
					<Button variant="secondary" onClick={onClose}>
						Отмена
					</Button>
					<Button
						variant="primary"
						onClick={createPoll}
						disabled={!question.trim() || options.filter(o => o.trim()).length < 2}
					>
						Создать
					</Button>
				</div>
			</div>
		</Modal>
	)
}

export default CreatePollModal
