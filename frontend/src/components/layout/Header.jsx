import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function Header() {
	const { user, logout } = useAuth()
	const [isDropdownOpen, setIsDropdownOpen] = useState(false)
	const dropdownRef = useRef(null)
	const navigate = useNavigate()
	
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsDropdownOpen(false)
			}
		}
		
		if (isDropdownOpen) {
			document.addEventListener('mousedown', handleClickOutside)
		}
		
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isDropdownOpen])
	
	const getAvatarLetter = () => {
		return user?.username?.charAt(0).toUpperCase() || 'U'
	}
	
	const handleProfileClick = () => {
		setIsDropdownOpen(false)
		navigate('/profile')
	}
	
	const handleLogout = () => {
		setIsDropdownOpen(false)
		logout()
	}
	
	return (
		<header className="header">
			<div className="header__container">
				<div className="header__logo">
					<h1 className="header__title">Echo</h1>
				</div>
				
				<nav className="header__nav">
					<NavLink
						to="/dashboard"
						className={({ isActive }) =>
							`header__link ${isActive ? 'header__link--active' : ''}`
						}
					>
						Главная
					</NavLink>
					
					<NavLink
						to="/teams"
						className={({ isActive }) =>
							`header__link ${isActive ? 'header__link--active' : ''}`
						}
					>
						Команды
					</NavLink>
					
					<NavLink
						to="/profile"
						className={({ isActive }) =>
							`header__link ${isActive ? 'header__link--active' : ''}`
						}
					>
						Профиль
					</NavLink>
				</nav>
				
				<div className="header__user" ref={dropdownRef}>
					<button
						className="header__profile-btn"
						onClick={() => setIsDropdownOpen(!isDropdownOpen)}
					>
						<div className="header__avatar">
							{user?.avatar ? (
								<img
									src={user.avatar}
									alt={user.username}
									className="header__avatar-img"
								/>
							) : (
								getAvatarLetter()
							)}
						</div>
						<div className="header__user-info">
							<span className="header__username">{user?.username}</span>
							<span className="header__role">Участник</span>
						</div>
						<svg
							className={`header__arrow ${isDropdownOpen ? 'header__arrow--open' : ''}`}
							width="20"
							height="20"
							viewBox="0 0 20 20"
							fill="none"
						>
							<path
								d="M5 7.5L10 12.5L15 7.5"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
					
					{isDropdownOpen && (
						<div className="header__dropdown">
							<div className="header__dropdown-header">
								<div className="header__dropdown-avatar">
									{user?.avatar ? (
										<img
											src={user.avatar}
											alt={user.username}
											className="header__dropdown-avatar-img"
										/>
									) : (
										<div className="header__dropdown-avatar-placeholder">
											{getAvatarLetter()}
										</div>
									)}
								</div>
								<div className="header__dropdown-info">
									<div className="header__dropdown-name">{user?.username}</div>
									<div className="header__dropdown-email">Участник команды</div>
								</div>
							</div>
							
							<button
								className="header__dropdown-item"
								onClick={handleProfileClick}
							>
								<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
									<path
										d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z"
										fill="currentColor"
									/>
									<path
										d="M10 12C4.477 12 0 14.686 0 18V20H20V18C20 14.686 15.523 12 10 12Z"
										fill="currentColor"
									/>
								</svg>
								<span>Мой профиль</span>
							</button>
							
							<button
								className="header__dropdown-item header__dropdown-item--danger"
								onClick={handleLogout}
							>
								<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
									<path
										d="M13 0H2C0.9 0 0 0.9 0 2V18C0 19.1 0.9 20 2 20H13C14.1 20 15 19.1 15 18V16H13V18H2V2H13V4H15V2C15 0.9 14.1 0 13 0Z"
										fill="currentColor"
									/>
									<path
										d="M19.6 9.4L16.6 6.4L15.2 7.8L16.4 9H8V11H16.4L15.2 12.2L16.6 13.6L19.6 10.6C20 10.2 20 9.8 19.6 9.4Z"
										fill="currentColor"
									/>
								</svg>
								<span>Выйти</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</header>
	)
}

export default Header