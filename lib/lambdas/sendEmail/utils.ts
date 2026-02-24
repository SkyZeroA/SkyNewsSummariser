interface Article {
	title: string;
	summary: string;
	url: string;
}

interface Summary {
	articles?: unknown[];
	date?: string;
}

export const formatEmailHtml = (summary: unknown): string => {
	const summaryData = summary as Summary;
	const allArticles = summaryData.articles || [];
	// Filter articles to only include those with title, url, and summary
	const articles = allArticles.filter((article: unknown): article is Article => {
		const a = article as Partial<Article>;
		return Boolean(a.title && a.url && a.summary);
	});
	const date = summaryData.date || new Date().toISOString().split('T')[0];

	let html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
		h1 { color: #0078d4; }
		h2 { color: #333; font-size: 18px; margin-top: 20px; }
		.article { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #ddd; }
		.summary { color: #555; }
		a { color: #0078d4; text-decoration: none; }
		a:hover { text-decoration: underline; }
		.footer { margin-top: 30px; font-size: 12px; color: #888; }
	</style>
</head>
<body>
	<h1>Sky News Daily Summary</h1>
	<p><strong>Date:</strong> ${date}</p>
	${articles
		.map(
			(article: Article) => `
		<div class="article">
			<h2>${article.title}</h2>
			<p class="summary">${article.summary}</p>
			<p><a href="${article.url}">Read more</a></p>
		</div>
	`
		)
		.join('')}
	<div class="footer">
		<p>You are receiving this email because you subscribed to Sky News Summariser.</p>
		<p>© ${new Date().getFullYear()} Sky News Summariser. All rights reserved.</p>
	</div>
</body>
</html>
	`;

	return html;
};

// Format the summary as plain text email
export const formatEmailText = (summary: unknown): string => {
	const summaryData = summary as Summary;
	const allArticles = summaryData.articles || [];
	// Filter articles to only include those with title, url, and summary
	const articles = allArticles.filter((article: unknown): article is Article => {
		const a = article as Partial<Article>;
		return Boolean(a.title && a.url && a.summary);
	});
	const date = summaryData.date || new Date().toISOString().split('T')[0];

	let text = `Sky News Daily Summary\n\n`;
	text += `Date: ${date}\n\n`;
	text += `${'='.repeat(50)}\n\n`;

	articles.forEach((article: Article, index: number) => {
		text += `${index + 1}. ${article.title}\n\n`;
		text += `${article.summary}\n\n`;
		text += `Read more: ${article.url}\n\n`;
		text += `${'-'.repeat(50)}\n\n`;
	});

	text += `You are receiving this email because you subscribed to Sky News Summariser.\n`;
	text += `© ${new Date().getFullYear()} Sky News Summariser. All rights reserved.\n`;

	return text;
};
