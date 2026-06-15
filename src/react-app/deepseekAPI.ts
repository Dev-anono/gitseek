export interface ReviewComment {
	type: "bug" | "style" | "performance" | "security";
	line: number | null;
	description: string;
	suggestion: string;
	code: string | null;
}

export interface AnalysisResult {
	analysis: ReviewComment[];
	filename: string;
}

function getToken(): string | null {
	if (typeof window === "undefined") return null;
	return localStorage.getItem("github_token");
}

export function setToken(token: string) {
	localStorage.setItem("github_token", token);
}

export function getTokenValue(): string | null {
	return getToken();
}

export function clearToken() {
	localStorage.removeItem("github_token");
}

export function isAuthenticated(): boolean {
	return !!getToken();
}

const BASE = "/api";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
	const token = getToken();
	const res = await fetch(`${BASE}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...options?.headers,
		},
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({ error: res.statusText }));
		throw new Error(err.error || `HTTP ${res.status}`);
	}
	return res.json();
}

export async function exchangeGithubCode(code: string): Promise<string> {
	const data = await apiFetch<{ token: string }>("/auth/github", {
		method: "POST",
		body: JSON.stringify({ code }),
	});
	setToken(data.token);
	return data.token;
}

export async function fetchRepos(): Promise<any[]> {
	return apiFetch<any[]>("/user/repos");
}

export async function fetchPRs(owner: string, repo: string): Promise<any[]> {
	return apiFetch<any[]>(`/repos/${owner}/${repo}/pulls`);
}

export async function fetchPRFiles(owner: string, repo: string, number: number): Promise<any[]> {
	return apiFetch<any[]>(`/repos/${owner}/${repo}/pulls/${number}/files`);
}

export async function analyzeCode(code: string, filename: string): Promise<AnalysisResult> {
	return apiFetch<AnalysisResult>("/analyze", {
		method: "POST",
		body: JSON.stringify({ code, filename }),
	});
}
