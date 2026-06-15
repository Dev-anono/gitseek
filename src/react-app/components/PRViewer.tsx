import { useEffect, useState } from "react";
import { fetchPRs, fetchPRFiles, analyzeCode, type AnalysisResult } from "../deepseekAPI.ts";

type ViewMode = "list" | "files" | "review";

export default function PRViewer({ owner, repo }: { owner: string; repo: string }) {
	const [prs, setPrs] = useState<any[]>([]);
	const [selectedPR, setSelectedPR] = useState<number | null>(null);
	const [files, setFiles] = useState<any[]>([]);
	const [selectedFile, setSelectedFile] = useState<string | null>(null);
	const [analysis, setAnalysis] = useState<Record<string, AnalysisResult>>({});
	const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({});
	const [mode, setMode] = useState<ViewMode>("list");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		fetchPRs(owner, repo)
			.then(setPrs)
			.catch((e) => setError(e.message))
			.finally(() => setLoading(false));
	}, [owner, repo]);

	const openPR = async (number: number) => {
		setSelectedPR(number);
		setMode("files");
		setFiles([]);
		setSelectedFile(null);
		try {
			const data = await fetchPRFiles(owner, repo, number);
			setFiles(data);
		} catch (e: any) {
			setError(e.message);
		}
	};

	const handleAnalyze = async (filename: string, code: string) => {
		if (analysis[filename]) return;
		setAnalyzing((prev) => ({ ...prev, [filename]: true }));
		try {
			const result = await analyzeCode(code, filename);
			setAnalysis((prev) => ({ ...prev, [filename]: result }));
			setMode("review");
			setSelectedFile(filename);
		} catch (e: any) {
			setError(e.message);
		} finally {
			setAnalyzing((prev) => ({ ...prev, [filename]: false }));
		}
	};

	if (loading) return <div className="loading"><div className="spinner" /><p>Загрузка PR...</p></div>;
	if (error) return <div className="error">{error}</div>;

	return (
		<div className="pr-viewer">
			<div className="viewer-header">
				<button className="btn btn-secondary" onClick={() => { setMode("list"); setSelectedPR(null); }}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
					</svg>
					Назад
				</button>
				<h2>{owner}/{repo}</h2>
			</div>

			{mode === "list" && (
				<div className="list-items">
					{prs.map((pr) => (
						<div key={pr.number} className="pr-card" onClick={() => openPR(pr.number)}>
							<div className={`pr-state pr-${pr.state}`}>{pr.state === "open" ? "OPEN" : "CLOSED"}</div>
							<div className="pr-info">
								<div className="pr-title">#{pr.number} {pr.title}</div>
								<div className="pr-meta">
									{pr.user?.login} — {new Date(pr.created_at).toLocaleDateString()}
								</div>
							</div>
						</div>
					))}
					{prs.length === 0 && <p className="empty">Нет pull request</p>}
				</div>
			)}

			{mode === "files" && (
				<div className="file-list">
					{files.map((f) => (
						<div key={f.filename} className="file-card">
							<div className="file-header">
								<div className="file-name">
									<code>{f.filename}</code>
									<span className="file-stats">
										<span className="stat-add">+{f.additions}</span>
										<span className="stat-del">-{f.deletions}</span>
									</span>
								</div>
								<button
									className={`btn btn-sm ${analysis[f.filename] ? "btn-outline" : "btn-primary"}`}
									onClick={() => handleAnalyze(f.filename, f.content || f.patch || "")}
									disabled={analyzing[f.filename]}
								>
									{analyzing[f.filename] ? (
										<><div className="spinner-sm" /> Анализ...</>
									) : analysis[f.filename] ? (
										"Просмотр"
									) : (
										"Анализ"
									)}
								</button>
							</div>
							{f.lines && f.lines.length > 0 && (
								<div className="code-viewer">
									{f.lines.map((line: string, i: number) => (
										<div key={i} className="code-line">
											<span className="line-num">{i + 1}</span>
											<code>{line}</code>
										</div>
									))}
								</div>
							)}
							{(!f.lines || f.lines.length === 0) && f.patch && (
								<div className="code-viewer patch-viewer">
									{f.patch.split("\n").map((line: string, i: number) => (
										<div key={i} className={`code-line ${line.startsWith("+") ? "diff-add" : ""} ${line.startsWith("-") ? "diff-rem" : ""}`}>
											<span className="line-num">{i + 1}</span>
											<code>{line}</code>
										</div>
									))}
								</div>
							)}
						</div>
					))}
				</div>
			)}

			{mode === "review" && selectedFile && analysis[selectedFile] && (
				<div className="file-review">
					<div className="review-header-bar">
						<button className="btn btn-secondary btn-sm" onClick={() => setMode("files")}>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
							</svg>
							Назад
						</button>
						<h3>Анализ: {selectedFile}</h3>
					</div>
					{analysis[selectedFile].analysis.length === 0 && <p className="empty">Проблем не найдено</p>}
					{analysis[selectedFile].analysis.map((item, i) => (
						<div key={i} className={`review-card review-${item.type}`}>
							<div className="review-header">
								<span className={`review-type type-${item.type}`}>{item.type}</span>
								{item.line && <span className="review-line">Строка {item.line}</span>}
							</div>
							<p className="review-desc">{item.description}</p>
							<p className="review-suggestion"><strong>Рекомендация:</strong> {item.suggestion}</p>
							{item.code && (
								<pre className="review-code"><code>{item.code}</code></pre>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
