import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function Header() {
	const { user, logout } = useAuth()
	const [isDropdownOpen, setIsDropdownOpen] = useState(false)
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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
	
	useEffect(() => {
		if (isMobileMenuOpen) {
			document.body.style.overflow = 'hidden'
		} else {
			document.body.style.overflow = ''
		}
		
		return () => {
			document.body.style.overflow = ''
		}
	}, [isMobileMenuOpen])
	
	const getAvatarLetter = () => {
		return user?.username?.charAt(0).toUpperCase() || 'U'
	}
	
	const handleLogout = () => {
		setIsDropdownOpen(false)
		setIsMobileMenuOpen(false)
		logout()
	}
	
	const closeMobileMenu = () => {
		setIsMobileMenuOpen(false)
	}
	
	return (
		<>
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
					
					<div className="header__actions">
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
										className="header__dropdown-item header__dropdown-item--danger"
										onClick={handleLogout}
									>
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
											<path d="M16 17l5-5-5-5"/>
											<path d="M21 12H9"/>
										</svg>
										<span>Выйти</span>
									</button>
								</div>
							)}
						</div>
						
						<button
							className="header__burger"
							onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
							aria-label="Toggle menu"
						>
							<span className={`header__burger-line ${isMobileMenuOpen ? 'header__burger-line--open' : ''}`}></span>
							<span className={`header__burger-line ${isMobileMenuOpen ? 'header__burger-line--open' : ''}`}></span>
							<span className={`header__burger-line ${isMobileMenuOpen ? 'header__burger-line--open' : ''}`}></span>
						</button>
					</div>
				</div>
			</header>
			
			{isMobileMenuOpen && (
				<div className="mobile-menu">
					<div className="mobile-menu__overlay" onClick={closeMobileMenu}></div>
					<div className="mobile-menu__content">
						<div className="mobile-menu__header">
							<div className="mobile-menu__user">
								<div className="mobile-menu__avatar">
									{user?.avatar ? (
										<img
											src={user.avatar}
											alt={user.username}
											className="mobile-menu__avatar-img"
										/>
									) : (
										<div className="mobile-menu__avatar-placeholder">
											{getAvatarLetter()}
										</div>
									)}
								</div>
								<div className="mobile-menu__user-info">
									<div className="mobile-menu__username">{user?.username}</div>
									<div className="mobile-menu__role">Участник команды</div>
								</div>
							</div>
						</div>
						
						<nav className="mobile-menu__nav">
							<NavLink
								to="/dashboard"
								className="mobile-menu__link"
								onClick={closeMobileMenu}
							>
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
									<polyline points="9 22 9 12 15 12 15 22"/>
								</svg>
								<span>Главная</span>
							</NavLink>
							
							<NavLink
								to="/teams"
								className="mobile-menu__link"
								onClick={closeMobileMenu}
							>
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
									<circle cx="9" cy="7" r="4"/>
									<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
									<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
								</svg>
								<span>Команды</span>
							</NavLink>
							
							<NavLink
								to="/profile"
								className="mobile-menu__link"
								onClick={closeMobileMenu}
							>
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
									<circle cx="12" cy="7" r="4"/>
								</svg>
								<span>Профиль</span>
							</NavLink>
						</nav>
						
						<div className="mobile-menu__footer">
							<button
								className="mobile-menu__logout"
								onClick={handleLogout}
							>
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
									<path d="M16 17l5-5-5-5"/>
									<path d="M21 12H9"/>
								</svg>
								<span>Выйти</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}

export default Header