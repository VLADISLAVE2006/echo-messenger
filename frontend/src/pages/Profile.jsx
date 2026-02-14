import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/layout/Layout'
import Button from '../components/common/Button'
import EditProfileModal from '../components/Profile/EditProfileModal'
import ChangeAvatarModal from '../components/Profile/ChangeAvatarModal'

function Profile() {
	const { user, updateUser } = useAuth()
	const [isEditModalOpen, setIsEditModalOpen] = useState(false)
	const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
	
	const [profileData, setProfileData] = useState({
		username: user?.username || 'User',
		avatar: user?.avatar || null,
		bio: user?.bio || 'Добавьте описание о себе',
	})
	
	useEffect(() => {
		if (user) {
			setProfileData({
				username: user.username,
				avatar: user.avatar || null,
				bio: user.bio || 'Добавьте описание о себе',
			})
		}
	}, [user])
	
	const getAvatarLetter = () => {
		return profileData.username.charAt(0).toUpperCase()
	}
	
	const handleSaveProfile = (data) => {
		setProfileData({ ...profileData, username: data.username, bio: data.bio })
		updateUser({ ...profileData, username: data.username, bio: data.bio })
		setIsEditModalOpen(false)
	}
	
	const handleSaveAvatar = (avatar) => {
		const updatedData = { ...profileData, avatar }
		setProfileData(updatedData)
		updateUser(updatedData)
		setIsAvatarModalOpen(false)
	}
	
	return (
		<Layout>
			<div className="profile">
				<div className="profile__header">
					<h2 className="profile__title">Мой профиль</h2>
					<Button
						variant="primary"
						onClick={() => setIsEditModalOpen(true)}
					>
						Редактировать
					</Button>
				</div>
				
				<div className="profile__card">
					<div className="profile__main">
						<button
							className="profile__avatar-btn"
							onClick={() => setIsAvatarModalOpen(true)}
						>
							<div className="profile__avatar">
								{profileData.avatar ? (
									<img
										src={profileData.avatar}
										alt={profileData.username}
										className="profile__avatar-img"
									/>
								) : (
									<div className="profile__avatar-placeholder">
										{getAvatarLetter()}
									</div>
								)}
								<div className="profile__avatar-overlay">
									<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
										<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
										<circle cx="12" cy="13" r="4"/>
									</svg>
								</div>
							</div>
						</button>
						
						<div className="profile__content">
							<div className="profile__field">
								<label className="profile__label">Имя пользователя</label>
								<div className="profile__value">{profileData.username}</div>
							</div>
							
							<div className="profile__field">
								<label className="profile__label">О себе</label>
								<div className="profile__value profile__value--bio">
									{profileData.bio}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			
			{isEditModalOpen && (
				<EditProfileModal
					data={profileData}
					onSave={handleSaveProfile}
					onClose={() => setIsEditModalOpen(false)}
				/>
			)}
			
			{isAvatarModalOpen && (
				<ChangeAvatarModal
					currentAvatar={profileData.avatar}
					onSave={handleSaveAvatar}
					onClose={() => setIsAvatarModalOpen(false)}
				/>
			)}
		</Layout>
	)
}

export default Profile