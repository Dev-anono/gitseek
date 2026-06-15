import { useEffect, useState } from "react";
import { exchangeGithubCode, isAuthenticated, clearToken, getTokenValue } from "../deepseekAPI.ts";

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || "";
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || window.location.origin;

export default function GitHubAuth({ onAuth }: { onAuth: () => void }) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get("code");
		if (code) {
			setLoading(true);
			exchangeGithubCode(code)
				.then(() => {
					window.history.replaceState({}, "", window.location.pathname);
					onAuth();
				})
				.catch((e) => setError(e.message))
				.finally(() => setLoading(false));
		}
	}, [onAuth]);

	const handleLogin = () => {
		const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo`;
		window.location.href = url;
	};

	if (loading) {
		return (
			<div className="auth-screen">
				<div className="spinner" />
				<p>Авторизация через GitHub...</p>
			</div>
		);
	}

	if (isAuthenticated()) {
		return (
			<div className="auth-screen">
				<p>Вы авторизованы</p>
				<button className="btn btn-secondary" onClick={() => { clearToken(); window.location.reload(); }}>
					Выйти
				</button>
			</div>
		);
	}

	return (
		<div className="auth-screen">
			<h1>gitseek</h1>
			<p>Code review через DeepSeek AI</p>
			{error && <div className="error">{error}</div>}
			<button className="btn btn-primary" onClick={handleLogin}>
				<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
					<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
				</svg>
				Войти через GitHub
			</button>
		</div>
	);
}
