import type { ReviewComment } from "../deepseekAPI.ts";

export default function CodeReview({ analysis, filename, onBack }: {
	analysis: ReviewComment[];
	filename: string;
	onBack: () => void;
}) {
	return (
		<div className="code-review">
			<div className="review-header-bar">
				<button className="btn btn-secondary btn-sm" onClick={onBack}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
					</svg>
					Назад
				</button>
				<h3>Анализ: {filename}</h3>
			</div>

			{analysis.length === 0 && (
				<div className="empty-state">
					<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--perf)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
						<polyline points="22 4 12 14.01 9 11.01" />
					</svg>
					<p>Проблем не найдено</p>
				</div>
			)}

			<div className="review-cards">
				{analysis.map((item, i) => (
					<div key={i} className={`review-card review-${item.type}`}>
						<div className="review-header">
							<span className={`review-type type-${item.type}`}>{item.type.toUpperCase()}</span>
							{item.line && <span className="review-line">Строка {item.line}</span>}
						</div>
						<p className="review-desc">{item.description}</p>
						<div className="review-suggestion">
							<strong>Рекомендация:</strong> {item.suggestion}
						</div>
						{item.code && (
							<pre className="review-code"><code>{item.code}</code></pre>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
