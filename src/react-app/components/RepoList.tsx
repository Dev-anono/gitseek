import { useEffect, useState } from "react";
import { fetchRepos } from "../deepseekAPI.ts";

export default function RepoList({ onSelect }: { onSelect: (owner: string, repo: string) => void }) {
	const [repos, setRepos] = useState<any[]>([]);
	const [filtered, setFiltered] = useState<any[]>([]);
	const [search, setSearch] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		fetchRepos()
			.then((data) => {
				setRepos(data);
				setFiltered(data);
			})
			.catch((e) => setError(e.message))
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		const q = search.toLowerCase();
		setFiltered(repos.filter((r) => r.name.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q)));
	}, [search, repos]);

	if (loading) return <div className="loading"><div className="spinner" /><p>Загрузка репозиториев...</p></div>;
	if (error) return <div className="error">{error}</div>;

	return (
		<div className="repo-list">
			<div className="list-header">
				<h2>Репозитории</h2>
				<input
					type="text"
					placeholder="Поиск..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="search-input"
				/>
			</div>
			<div className="list-items">
				{filtered.map((repo) => (
					<div
						key={repo.id}
						className="repo-card"
						onClick={() => {
							const [owner] = repo.full_name.split("/");
							onSelect(owner, repo.name);
						}}
					>
						<div className="repo-icon">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
								{repo.private && <path d="M12 11v4" />}
								{repo.private && <path d="M8 11a4 4 0 1 1 8 0" />}
							</svg>
						</div>
						<div className="repo-info">
							<div className="repo-name">{repo.full_name}</div>
							<div className="repo-desc">{repo.description || "Нет описания"}</div>
							<div className="repo-meta">
								{repo.language && <span className="lang-tag">{repo.language}</span>}
								<span className="updated">Обновлён: {new Date(repo.updated_at).toLocaleDateString()}</span>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
