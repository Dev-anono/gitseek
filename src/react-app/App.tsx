import { useState, useCallback } from "react";
import { isAuthenticated } from "./deepseekAPI.ts";
import GitHubAuth from "./components/GitHubAuth.tsx";
import RepoList from "./components/RepoList.tsx";
import PRViewer from "./components/PRViewer.tsx";
import "./App.css";

type Page = "auth" | "repos" | "pr";

export default function App() {
	const [page, setPage] = useState<Page>(isAuthenticated() ? "repos" : "auth");
	const [repoOwner, setRepoOwner] = useState("");
	const [repoName, setRepoName] = useState("");

	const handleAuth = useCallback(() => setPage("repos"), []);

	const handleRepoSelect = (owner: string, repo: string) => {
		setRepoOwner(owner);
		setRepoName(repo);
		setPage("pr");
	};

	return (
		<div className="app">
			<header className="app-header">
				<h1 className="app-title" onClick={() => setPage("repos")}>gitseek</h1>
				{isAuthenticated() && (
					<nav className="app-nav">
						<button className={`nav-btn ${page === "repos" ? "active" : ""}`} onClick={() => setPage("repos")}>
							Репозитории
						</button>
						{page === "pr" && (
							<button className={`nav-btn ${page === "pr" ? "active" : ""}`} onClick={() => setPage("pr")}>
								{repoOwner}/{repoName}
							</button>
						)}
					</nav>
				)}
			</header>

			<main className="app-main">
				{page === "auth" && <GitHubAuth onAuth={handleAuth} />}
				{page === "repos" && <RepoList onSelect={handleRepoSelect} />}
				{page === "pr" && <PRViewer owner={repoOwner} repo={repoName} />}
			</main>
		</div>
	);
}
