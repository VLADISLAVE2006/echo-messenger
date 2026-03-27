import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/layout/Layout'
import Button from '../components/common/Button'
import toast from 'react-hot-toast'

function AdminDashboard() {
	const { user } = useAuth()
	const navigate = useNavigate()
	const [activeTab, setActiveTab] = useState('users')
	const [users, setUsers] = useState([])
	const [teams, setTeams] = useState([])
	const [loading, setLoading] = useState(true)
	const [confirmDelete, setConfirmDelete] = useState(null) // { type: 'user'|'team', id, name }

	useEffect(() => {
		if (!user?.is_site_admin) {
			navigate('/dashboard')
			return
		}
		loadData()
	}, [])

	const getCredentials = () => {
		const password = localStorage.getItem('password')
		return { username: user.username, password }
	}

	const loadData = async () => {
		setLoading(true)
		await Promise.all([loadUsers(), loadTeams()])
		setLoading(false)
	}

	const loadUsers = async () => {
		try {
			const { username, password } = getCredentials()
			const params = new URLSearchParams({ username, password })
			const res = await fetch(`http://localhost:5000/api/admin/users?${params}`)
			if (res.ok) {
				const data = await res.json()
				setUsers(data.users || [])
			} else if (res.status === 403) {
				navigate('/dashboard')
			}
		} catch (e) {
			console.error(e)
		}
	}

	const loadTeams = async () => {
		try {
			const { username, password } = getCredentials()
			const params = new URLSearchParams({ username, password })
			const res = await fetch(`http://localhost:5000/api/admin/teams?${params}`)
			if (res.ok) {
				const data = await res.json()
				setTeams(data.teams || [])
			}
		} catch (e) {
			console.error(e)
		}
	}

	const handleToggleAdmin = async (userId) => {
		try {
			const { username, password } = getCredentials()
			const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/toggle-admin`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password }),
			})
			if (res.ok) {
				const data = await res.json()
				setUsers(prev => prev.map(u =>
					u.id === userId ? { ...u, is_site_admin: data.is_site_admin ? 1 : 0 } : u
				))
				toast.success(data.is_site_admin ? 'Пользователь назначен администратором' : 'Права администратора сняты')
			} else {
				const err = await res.json()
				toast.error(err.error || 'Ошибка')
			}
		} catch (e) {
			toast.error('Ошибка сервера')
		}
	}

	const handleDeleteUser = async (userId) => {
		try {
			const { username, password } = getCredentials()
			const res = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password }),
			})
			if (res.ok) {
				setUsers(prev => prev.filter(u => u.id !== userId))
				toast.success('Пользователь удалён')
			} else {
				const err = await res.json()
				toast.error(err.error || 'Ошибка')
			}
		} catch (e) {
			toast.error('Ошибка сервера')
		}
		setConfirmDelete(null)
	}

	const handleDeleteTeam = async (teamId) => {
		try {
			const { username, password } = getCredentials()
			const res = await fetch(`http://localhost:5000/api/admin/teams/${teamId}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password }),
			})
			if (res.ok) {
				setTeams(prev => prev.filter(t => t.id !== teamId))
				toast.success('Группа удалена')
			} else {
				const err = await res.json()
				toast.error(err.error || 'Ошибка')
			}
		} catch (e) {
			toast.error('Ошибка сервера')
		}
		setConfirmDelete(null)
	}

	const formatDate = (dateStr) => {
		if (!dateStr) return '—'
		return new Date(dateStr).toLocaleDateString('ru-RU', {
			day: '2-digit', month: '2-digit', year: 'numeric',
		})
	}

	if (loading) {
		return (
			<Layout>
				<div className="admin-dashboard">
					<div className="admin-dashboard__loading">Загрузка данных...</div>
				</div>
			</Layout>
		)
	}

	return (
		<Layout>
			<div className="admin-dashboard">
				<div className="admin-dashboard__container">
					<div className="admin-dashboard__header">
						<div className="admin-dashboard__title-block">
							<h1 className="admin-dashboard__title">Панель администратора</h1>
						</div>
						<div className="admin-dashboard__stats">
							<div className="admin-dashboard__stat">
								<span className="admin-dashboard__stat-value">{users.length}</span>
								<span className="admin-dashboard__stat-label">пользователей</span>
							</div>
							<div className="admin-dashboard__stat">
								<span className="admin-dashboard__stat-value">{teams.length}</span>
								<span className="admin-dashboard__stat-label">групп</span>
							</div>
						</div>
					</div>

					<div className="admin-dashboard__tabs">
						<button
							className={`admin-dashboard__tab ${activeTab === 'users' ? 'admin-dashboard__tab--active' : ''}`}
							onClick={() => setActiveTab('users')}
						>
							Пользователи
							<span className="admin-dashboard__tab-count">{users.length}</span>
						</button>
						<button
							className={`admin-dashboard__tab ${activeTab === 'teams' ? 'admin-dashboard__tab--active' : ''}`}
							onClick={() => setActiveTab('teams')}
						>
							Группы
							<span className="admin-dashboard__tab-count">{teams.length}</span>
						</button>
					</div>

					{activeTab === 'users' && (
						<div className="admin-dashboard__section">
							<div className="admin-table">
								<div className="admin-table__head">
									<div className="admin-table__row admin-table__row--head">
										<div className="admin-table__cell admin-table__cell--avatar"></div>
										<div className="admin-table__cell">Пользователь</div>
										<div className="admin-table__cell">Роль</div>
										<div className="admin-table__cell">Дата регистрации</div>
										<div className="admin-table__cell admin-table__cell--actions">Действия</div>
									</div>
								</div>
								<div className="admin-table__body">
									{users.map(u => (
										<div key={u.id} className="admin-table__row">
											<div className="admin-table__cell admin-table__cell--avatar">
												<div className="admin-table__avatar">
													{u.avatar ? (
														<img src={u.avatar} alt={u.username} />
													) : (
														<span>{u.username.charAt(0).toUpperCase()}</span>
													)}
												</div>
											</div>
											<div className="admin-table__cell">
												<div className="admin-table__name">{u.username}</div>
												{u.id === user.id && (
													<span className="admin-table__badge admin-table__badge--you">Вы</span>
												)}
											</div>
											<div className="admin-table__cell">
												{u.is_site_admin ? (
													<span className="admin-table__badge admin-table__badge--admin">Суперадмин</span>
												) : (
													<span className="admin-table__badge admin-table__badge--member">Участник</span>
												)}
											</div>
											<div className="admin-table__cell admin-table__cell--muted">
												{formatDate(u.created_at)}
											</div>
											<div className="admin-table__cell admin-table__cell--actions">
												{u.id !== user.id && (
													<>
														<button
															className={`admin-table__action-btn ${u.is_site_admin ? 'admin-table__action-btn--warning' : 'admin-table__action-btn--primary'}`}
															onClick={() => handleToggleAdmin(u.id)}
															title={u.is_site_admin ? 'Снять права администратора' : 'Назначить администратором'}
														>
															{u.is_site_admin ? (
																<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
																	<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
																	<line x1="18" y1="6" x2="6" y2="18"/>
																</svg>
															) : (
																<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
																	<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
																</svg>
															)}
														</button>
														<button
															className="admin-table__action-btn admin-table__action-btn--danger"
															onClick={() => setConfirmDelete({ type: 'user', id: u.id, name: u.username })}
															title="Удалить пользователя"
														>
															<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
																<polyline points="3 6 5 6 21 6"/>
																<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
																<path d="M10 11v6"/>
																<path d="M14 11v6"/>
																<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
															</svg>
														</button>
													</>
												)}
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{activeTab === 'teams' && (
						<div className="admin-dashboard__section">
							<div className="admin-table admin-table--teams">
								<div className="admin-table__head">
									<div className="admin-table__row admin-table__row--head admin-table__row--teams">
										<div className="admin-table__cell admin-table__cell--avatar"></div>
										<div className="admin-table__cell">Группа</div>
										<div className="admin-table__cell">Создатель</div>
										<div className="admin-table__cell">Участники</div>
										<div className="admin-table__cell">Тип</div>
										<div className="admin-table__cell">Дата создания</div>
										<div className="admin-table__cell admin-table__cell--actions">Действия</div>
									</div>
								</div>
								<div className="admin-table__body">
									{teams.map(t => (
										<div key={t.id} className="admin-table__row admin-table__row--teams">
											<div className="admin-table__cell admin-table__cell--avatar">
												<div className="admin-table__avatar admin-table__avatar--team">
													{t.avatar ? (
														<img src={t.avatar} alt={t.name} />
													) : (
														<span>{t.name.charAt(0).toUpperCase()}</span>
													)}
												</div>
											</div>
											<div className="admin-table__cell">
												<div className="admin-table__name">{t.name}</div>
												{t.description && (
													<div className="admin-table__desc">{t.description}</div>
												)}
											</div>
											<div className="admin-table__cell admin-table__cell--muted">
												{t.creator_username}
											</div>
											<div className="admin-table__cell admin-table__cell--muted">
												{t.member_count}
											</div>
											<div className="admin-table__cell">
												{t.is_private ? (
													<span className="admin-table__badge admin-table__badge--private">Приватная</span>
												) : (
													<span className="admin-table__badge admin-table__badge--public">Публичная</span>
												)}
											</div>
											<div className="admin-table__cell admin-table__cell--muted">
												{formatDate(t.created_at)}
											</div>
											<div className="admin-table__cell admin-table__cell--actions">
												<button
													className="admin-table__action-btn admin-table__action-btn--danger"
													onClick={() => setConfirmDelete({ type: 'team', id: t.id, name: t.name })}
													title="Удалить группу"
												>
													<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
														<polyline points="3 6 5 6 21 6"/>
														<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
														<path d="M10 11v6"/>
														<path d="M14 11v6"/>
														<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
													</svg>
												</button>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{confirmDelete && (
				<div className="admin-confirm-overlay">
					<div className="admin-confirm-modal">
						<div className="admin-confirm-modal__icon">
							<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
								<line x1="12" y1="9" x2="12" y2="13"/>
								<line x1="12" y1="17" x2="12.01" y2="17"/>
							</svg>
						</div>
						<h3 className="admin-confirm-modal__title">Подтверждение удаления</h3>
						<p className="admin-confirm-modal__text">
							Вы уверены, что хотите удалить{' '}
							{confirmDelete.type === 'user' ? 'пользователя' : 'группу'}{' '}
							<strong>«{confirmDelete.name}»</strong>?
							{confirmDelete.type === 'team' && ' Все данные группы будут удалены безвозвратно.'}
						</p>
						<div className="admin-confirm-modal__actions">
							<Button variant="ghost" onClick={() => setConfirmDelete(null)}>
								Отмена
							</Button>
							<Button
								variant="danger"
								onClick={() =>
									confirmDelete.type === 'user'
										? handleDeleteUser(confirmDelete.id)
										: handleDeleteTeam(confirmDelete.id)
								}
							>
								Удалить
							</Button>
						</div>
					</div>
				</div>
			)}
		</Layout>
	)
}

export default AdminDashboard
