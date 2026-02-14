import Header from './Header'

function Layout({ children }) {
	return (
		<div className="layout">
			<Header />
			<main className="layout__content">
				{children}
			</main>
		</div>
	)
}

export default Layout