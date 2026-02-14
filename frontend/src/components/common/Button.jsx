function Button({
	                children,
	                type = 'button',
	                variant = 'primary',
	                onClick,
	                disabled = false,
	                fullWidth = false
                }) {
	return (
		<button
			type={type}
			className={`button button--${variant} ${fullWidth ? 'button--full' : ''}`}
			onClick={onClick}
			disabled={disabled}
		>
			{children}
		</button>
	)
}

export default Button