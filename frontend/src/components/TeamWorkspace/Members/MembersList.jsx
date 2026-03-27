import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import toast from 'react-hot-toast'

function MembersList({ teamId, teamData, onRoleChanged }) {
	const { user } = useAuth()
	const [requests, setRequests] = useState([])
	const [activeTab, setActiveTab] = useState('members')

	// Modal state
	const [editingMember, setEditingMember] = useState(null)
	const [customRoles, setCustomRoles] = useState([])
	const [roleInput, setRoleInput] = useState('')
	const [saving, setSaving] = useState(false)
	const inputRef = useRef(null)

	const isAdmin = teamData.members?.some(
		m => m.username === user.username && m.roles?.includes('Admin')
	) || false

	useEffect(() => {
		if (isAdmin) loadRequests()
	}, [teamId, isAdmin])

	const loadRequests = async () => {
		try {
			const password = localStorage.getItem('password')
			const params = new URLSearchParams({ username: user.username, password })
			const response = await fetch(`http://localhost:5000/api/teams/${teamId}/requests?${params}`)
			if (response.ok) {
				const data = await response.json()
				setRequests(data.requests || [])
			}
		} catch (error) {
			console.error('Error loading requests:', error)
		}
	}

	const handleApproveRequest = async (requestId) => {
		try {
			const password = localStorage.getItem('password')
			const response = await fetch(`http://localhost:5000/api/teams/${teamId}/requests/${requestId}/approve`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: user.username, password }),
			})
			if (response.ok) {
				toast.success('Запрос одобрен')
				loadRequests()
			} else {
				const err = await response.json()
				toast.error(err.error || 'Ошибка')
			}
		} catch {
			toast.error('Ошибка сервера')
		}
	}

	const handleRejectRequest = async (requestId) => {
		try {
			const password = localStorage.getItem('password')
			const response = await fetch(`http://localhost:5000/api/teams/${teamId}/requests/${requestId}/reject`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username: user.username, password }),
			})
			if (response.ok) {
				toast.success('Запрос отклонён')
				loadRequests()
			} else {
				const err = await response.json()
				toast.error(err.error || 'Ошибка')
			}
		} catch {
			toast.error('Ошибка сервера')
		}
	}

	const openEditRoles = (member) => {
		const currentCustom = member.roles?.filter(r => r !== 'Admin') || []
		setCustomRoles([...currentCustom])
		setRoleInput('')
		setEditingMember(member)
		setTimeout(() => inputRef.current?.focus(), 50)
	}

	const closeModal = () => {
		setEditingMember(null)
		setCustomRoles([])
		setRoleInput('')
	}

	const addRole = () => {
		const trimmed = roleInput.trim()
		if (!trimmed) return
		if (trimmed.toLowerCase() === 'admin') {
			toast.error('Роль "Admin" зарезервирована')
			return
		}
		if (trimmed.length > 30) {
			toast.error('Максимум 30 символов')
			return
		}
		if (customRoles.includes(trimmed)) {
			toast.error('Такая роль уже есть')
			return
		}
		setCustomRoles(prev => [...prev, trimmed])
		setRoleInput('')
		inputRef.current?.focus()
	}

	const removeRole = (role) => {
		setCustomRoles(prev => prev.filter(r => r !== role))
	}

	const handleRoleInputKeyDown = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			addRole()
		}
		if (e.key === 'Backspace' && roleInput === '' && customRoles.length > 0) {
			setCustomRoles(prev => prev.slice(0, -1))
		}
	}

	const handleSaveRoles = async () => {
		if (!editingMember) return
		setSaving(true)
		try {
			const password = localStorage.getItem('password')
			const response = await fetch(
				`http://localhost:5000/api/teams/${teamId}/members/${editingMember.id}/roles`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						username: user.username,
						password,
						roles: customRoles,
					}),
				}
			)
			if (response.ok) {
				toast.success('Роли обновлены')
				closeModal()
				if (onRoleChanged) onRoleChanged()
			} else {
				const err = await response.json()
				toast.error(err.error || 'Ошибка обновления ролей')
			}
		} catch {
			toast.error('Ошибка сервера')
		} finally {
			setSaving(false)
		}
	}

	const getDisplayRoles = (member) => {
		const roles = member.roles || []
		const isAdminMember = roles.includes('Admin')
		const custom = roles.filter(r => r !== 'Admin')
		return { isAdminMember, custom }
	}

	return (
		<div className="members-list">
			<div className="members-list__header">
				<h2 className="members-list__title">Участники команды</h2>
				<div className="members-list__count">{teamData.members?.length || 0} в группе</div>
			</div>

			{isAdmin && (
				<div className="members-list__tabs">
					<button
						className={`members-list__tab ${activeTab === 'members' ? 'members-list__tab--active' : ''}`}
						onClick={() => setActiveTab('members')}
					>
						Участники ({teamData.members?.length || 0})
					</button>
					<button
						className={`members-list__tab ${activeTab === 'requests' ? 'members-list__tab--active' : ''}`}
						onClick={() => setActiveTab('requests')}
					>
						Запросы ({requests.length})
					</button>
				</div>
			)}

			<div className="members-list__content">
				{activeTab === 'members' ? (
					<div className="members-list__grid">
						{teamData.members?.map((member) => {
							const { isAdminMember, custom } = getDisplayRoles(member)
							const isSelf = member.username === user.username
							const canEdit = isAdmin && !isSelf && !isAdminMember

							return (
								<div key={member.id} className="member-card">
									<div className="member-card__avatar">
										{member.avatar ? (
											<img src={member.avatar} alt={member.username} />
										) : (
											<div className="member-card__avatar-placeholder">
												{member.username.charAt(0).toUpperCase()}
											</div>
										)}
										{member.is_online && <div className="member-card__online-indicator" />}
									</div>

									<div className="member-card__info">
										<h3 className="member-card__name">{member.username}</h3>
										<div className="member-card__roles">
											{isAdminMember && (
												<span className="member-card__role member-card__role--admin">
													Администратор
												</span>
											)}
											{custom.map((role, i) => (
												<span key={i} className="member-card__role">
													{role}
												</span>
											))}
											{!isAdminMember && custom.length === 0 && (
												<span className="member-card__role member-card__role--member">
													Участник
												</span>
											)}
										</div>
									</div>

									{canEdit && (
										<div className="member-card__actions">
											<button
												className="member-card__manage-btn"
												onClick={() => openEditRoles(member)}
											>
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
													<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
												</svg>
												Роли
											</button>
										</div>
									)}
								</div>
							)
						})}
					</div>
				) : (
					<div className="requests-list">
						{requests.length === 0 ? (
							<div className="requests-list__empty">
								<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
									<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
									<circle cx="9" cy="7" r="4"/>
									<line x1="19" y1="8" x2="19" y2="14"/>
									<line x1="22" y1="11" x2="16" y2="11"/>
								</svg>
								<p>Нет новых запросов</p>
							</div>
						) : (
							requests.map((request) => (
								<div key={request.id} className="request-card">
									<div className="request-card__user">
										<div className="request-card__avatar">
											{request.avatar ? (
												<img src={request.avatar} alt={request.username} />
											) : (
												<div className="request-card__avatar-placeholder">
													{request.username.charAt(0).toUpperCase()}
												</div>
											)}
										</div>
										<div className="request-card__info">
											<h3 className="request-card__name">{request.username}</h3>
											<p className="request-card__date">
												{new Date(request.created_at).toLocaleDateString('ru-RU')}
											</p>
										</div>
									</div>
									<div className="request-card__actions">
										<button className="request-btn request-btn--approve" onClick={() => handleApproveRequest(request.id)}>
											Принять
										</button>
										<button className="request-btn request-btn--reject" onClick={() => handleRejectRequest(request.id)}>
											Отклонить
										</button>
									</div>
								</div>
							))
						)}
					</div>
				)}
			</div>

			{/* ---- MODAL ---- */}
			{editingMember && (
				<div className="roles-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
					<div className="roles-modal">
						{/* Header */}
						<div className="roles-modal__header">
							<div className="roles-modal__member">
								<div className="roles-modal__avatar">
									{editingMember.avatar ? (
										<img src={editingMember.avatar} alt={editingMember.username} />
									) : (
										<span>{editingMember.username.charAt(0).toUpperCase()}</span>
									)}
								</div>
								<div className="roles-modal__member-info">
									<div className="roles-modal__member-name">{editingMember.username}</div>
									<div className="roles-modal__member-sub">Редактирование ролей</div>
								</div>
							</div>
							<button className="roles-modal__close" onClick={closeModal}>
								<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<line x1="18" y1="6" x2="6" y2="18"/>
									<line x1="6" y1="6" x2="18" y2="18"/>
								</svg>
							</button>
						</div>

						{/* Body */}
						<div className="roles-modal__body">
							<div className="roles-modal__section">
								<div className="roles-modal__label">Кастомные роли</div>
								<div className="roles-modal__hint">
									Введите название роли и нажмите Enter или кнопку «+»
								</div>

								{/* Tag input area */}
								<div className="roles-modal__tags-box">
									{customRoles.map((role, i) => (
										<span key={i} className="role-chip">
											{role}
											<button
												className="role-chip__remove"
												onClick={() => removeRole(role)}
												type="button"
											>
												<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
													<line x1="18" y1="6" x2="6" y2="18"/>
													<line x1="6" y1="6" x2="18" y2="18"/>
												</svg>
											</button>
										</span>
									))}

									{customRoles.length === 0 && (
										<span className="roles-modal__empty-hint">Нет кастомных ролей</span>
									)}
								</div>

								<div className="roles-modal__input-row">
									<input
										ref={inputRef}
										type="text"
										className="roles-modal__input"
										placeholder="Например: Дизайнер, Фронтенд..."
										value={roleInput}
										onChange={e => setRoleInput(e.target.value)}
										onKeyDown={handleRoleInputKeyDown}
										maxLength={30}
									/>
									<button
										className="roles-modal__add-btn"
										onClick={addRole}
										type="button"
										disabled={!roleInput.trim()}
									>
										<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
											<line x1="12" y1="5" x2="12" y2="19"/>
											<line x1="5" y1="12" x2="19" y2="12"/>
										</svg>
									</button>
								</div>
							</div>
						</div>

						{/* Footer */}
						<div className="roles-modal__footer">
							<button className="roles-modal__btn roles-modal__btn--cancel" onClick={closeModal}>
								Отмена
							</button>
							<button
								className="roles-modal__btn roles-modal__btn--save"
								onClick={handleSaveRoles}
								disabled={saving}
							>
								{saving ? 'Сохранение...' : 'Сохранить'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default MembersList
