function Button({
	                children,
	                type = 'button',
	                variant = 'primary',
	                onClick,
	                disabled = false,
	                fullWidth = false,
	                as = 'button'
                }) {
	const Component = as
	
	return (
		<Component
			type={type}
			className={`button button--${variant} ${fullWidth ? 'button--full' : ''}`}
			onClick={onClick}
			disabled={disabled}
		>
			{children}
		</Component>
	)
}

export default Button