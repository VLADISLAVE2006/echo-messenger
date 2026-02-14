import { useState } from 'react'
import EyeIcon from './EyeIcon'

function Input({
	               type = 'text',
	               name,
	               value,
	               onChange,
	               placeholder,
	               label,
	               error,
	               required = false
               }) {
	const [showPassword, setShowPassword] = useState(false)
	
	const isPassword = type === 'password'
	const inputType = isPassword && showPassword ? 'text' : type
	
	return (
		<div className="input-wrapper">
			{label && (
				<label
					htmlFor={name}
					className={`input-label ${required ? 'required' : ''}`}
				>
					{label}
				</label>
			)}
			
			<div className="input-container">
				<input
					type={inputType}
					id={name}
					name={name}
					value={value}
					onChange={onChange}
					placeholder={placeholder}
					className={`input ${error ? 'input--error' : ''}`}
				/>
				
				{isPassword && (
					<button
						type="button"
						className="input-toggle-password"
						onClick={() => setShowPassword(!showPassword)}
						aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
					>
						<EyeIcon isVisible={showPassword} size={20} />
					</button>
				)}
			</div>
			
			{error && <span className="input-error">{error}</span>}
		</div>
	)
}

export default Input