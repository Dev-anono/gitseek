import { Hono } from "hono";
import { cors } from "hono/cors";

interface Env {
	GITHUB_CLIENT_ID: string;
	GITHUB_CLIENT_SECRET: string;
	DEEPSEEK_API_KEY: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors({ origin: "*", credentials: true }));

const REDIRECT_URI = "https://gitseek.weloosp.workers.dev/api/auth/github/callback";

// GitHub OAuth login — редирект на GitHub
app.get("/api/auth/github/login", (c) => {
	const url =
		"https://github.com/login/oauth/authorize" +
		`?client_id=${c.env.GITHUB_CLIENT_ID}` +
		`&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
		"&scope=repo,read:user";
	return c.redirect(url);
});

// GitHub OAuth callback — обмен code на токен и редирект на /
app.get("/api/auth/github/callback", async (c) => {
	const code = c.req.query("code");
	if (!code) return c.redirect("/?error=missing_code");

	const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify({
			client_id: c.env.GITHUB_CLIENT_ID,
			client_secret: c.env.GITHUB_CLIENT_SECRET,
			code,
			redirect_uri: REDIRECT_URI,
		}),
	});

	const data = await tokenRes.json<{ access_token?: string; error?: string }>();
	if (!data.access_token) {
		return c.redirect(`/?error=${data.error || "auth_failed"}`);
	}

	return c.redirect(`/?token=${data.access_token}`);
});

// Список репозиториев пользователя
app.get("/api/user/repos", async (c) => {
	const token = c.req.header("Authorization")?.replace("Bearer ", "");
	if (!token) return c.json({ error: "Unauthorized" }, 401);

	const res = await fetch("https://api.github.com/user/repos?per_page=100&type=all", {
		headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
	});
	if (!res.ok) return c.json({ error: "GitHub API error" }, res.status as any);

	const repos = await res.json<any[]>();
	return c.json(repos.map((r: any) => ({
		id: r.id,
		name: r.name,
		full_name: r.full_name,
		private: r.private,
		description: r.description,
		html_url: r.html_url,
		language: r.language,
		updated_at: r.updated_at,
	})));
});

// Список PR репозитория
app.get("/api/repos/:owner/:repo/pulls", async (c) => {
	const token = c.req.header("Authorization")?.replace("Bearer ", "");
	if (!token) return c.json({ error: "Unauthorized" }, 401);

	const { owner, repo } = c.req.param();
	const res = await fetch(
		`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=50`,
		{
			headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
		},
	);
	if (!res.ok) return c.json({ error: "GitHub API error" }, res.status as any);

	const pulls = await res.json<any[]>();
	return c.json(pulls.map((p: any) => ({
		number: p.number,
		title: p.title,
		state: p.state,
		user: { login: p.user?.login, avatar_url: p.user?.avatar_url },
		created_at: p.created_at,
		html_url: p.html_url,
		head: { ref: p.head?.ref, sha: p.head?.sha },
		base: { ref: p.base?.ref },
	})));
});

// Файлы изменённые в PR с кодом
app.get("/api/repos/:owner/:repo/pulls/:number/files", async (c) => {
	const token = c.req.header("Authorization")?.replace("Bearer ", "");
	if (!token) return c.json({ error: "Unauthorized" }, 401);

	const { owner, repo, number } = c.req.param();
	const res = await fetch(
		`https://api.github.com/repos/${owner}/${repo}/pulls/${number}/files?per_page=50`,
		{
			headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
		},
	);
	if (!res.ok) return c.json({ error: "GitHub API error" }, res.status as any);

	const files = await res.json<any[]>();

	// Для каждого файла получаем содержимое (с номерами строк)
	const result = await Promise.all(
		files.map(async (f: any) => {
			let content = "";
			let lines: string[] = [];

			if (f.contents_url) {
				try {
					const contentRes = await fetch(f.contents_url, {
						headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
					});
					if (contentRes.ok) {
						const data = await contentRes.json<{ content?: string }>();
						if (data.content) {
							content = atob(data.content.replace(/\n/g, ""));
							lines = content.split("\n");
						}
					}
				} catch {
					// fallback — используем patch
				}
			}

			return {
				filename: f.filename,
				status: f.status,
				additions: f.additions,
				deletions: f.deletions,
				changes: f.changes,
				patch: f.patch,
				lines,
				content,
			};
		}),
	);

	return c.json(result);
});

// Анализ кода через DeepSeek
app.post("/api/analyze", async (c) => {
	const token = c.req.header("Authorization")?.replace("Bearer ", "");
	if (!token) return c.json({ error: "Unauthorized" }, 401);

	const { code, filename } = await c.req.json<{ code: string; filename: string }>();
	if (!code) return c.json({ error: "Missing code" }, 400);

	const systemPrompt = `Ты — экспертный ревьюер кода. Проанализируй предоставленный код и найди:
1. **Багги** — логические ошибки, потенциальные краши
2. **Стиль** — нарушения code style, нечитаемый код
3. **Оптимизация** — неэффективные места, узкие горлышки
4. **Безопасность** — уязвимости, инъекции, утечки данных

Для каждой найденной проблемы верни JSON объект:
{
  "type": "bug" | "style" | "performance" | "security",
  "line": <номер строки или null>,
  "description": "<описание на русском>",
  "suggestion": "<как исправить>",
  "code": "<пример исправленного кода или null>"
}

Ответь ТОЛЬКО JSON массивом. Если проблем нет — [].`;

	const deepseekRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${c.env.DEEPSEEK_API_KEY}`,
		},
		body: JSON.stringify({
			model: "deepseek-chat",
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: `Файл: ${filename}\n\n\`\`\`\n${code}\n\`\`\`` },
			],
			temperature: 0.3,
			max_tokens: 4096,
		}),
	});

	if (!deepseekRes.ok) {
		const errText = await deepseekRes.text();
		return c.json({ error: `DeepSeek API error: ${errText}` }, 502);
	}

	const deepseekData = await deepseekRes.json<any>();
	const content = deepseekData.choices?.[0]?.message?.content || "[]";

	// Извлекаем JSON из ответа (может быть обёрнут в ```json ... ```)
	let jsonStr = content;
	if (content.includes("```")) {
		jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
	}

	try {
		const analysis = JSON.parse(jsonStr);
		return c.json({ analysis, filename });
	} catch {
		return c.json({ error: "Failed to parse DeepSeek response", raw: content }, 500);
	}
});

export default app;
