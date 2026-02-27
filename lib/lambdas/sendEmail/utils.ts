interface SourceArticle {
	title: string;
	url: string;
}

interface Summary {
	summaryText?: string;
	sourceArticles?: unknown[];
}

export const formatEmailHtml = (summary: unknown, unsubscribeUrl?: string): string => {
	const summaryData = summary as Summary;
	const summaryText = summaryData.summaryText || '';
	const allArticles = summaryData.sourceArticles || [];
	// Filter articles to only include those with title and url
	const articles = allArticles.filter((article: unknown): article is SourceArticle => {
		const a = article as Partial<SourceArticle>;
		return Boolean(a.title && a.url);
	});
	const [date] = new Date().toISOString().split('T');

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
	
	${
		summaryText
			? `<div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-left: 4px solid #0078d4;">
		<p style="margin: 0; white-space: pre-wrap;">${summaryText}</p>
	</div>`
			: ''
	}
	
	${articles.length > 0 ? `<h2 style="margin-top: 30px;">Source Articles</h2>` : ''}
	${articles
		.map(
			(article: SourceArticle) => `
		<div class="article">
			<h3 style="font-size: 16px; margin: 10px 0;">${article.title}</h3>
			<p><a href="${article.url}">Read article</a></p>
		</div>
	`
		)
		.join('')}
	<div class="footer">
		<p>You are receiving this email because you subscribed to Sky News Summariser.</p>
		${unsubscribeUrl ? `<p><a href="${unsubscribeUrl}">Unsubscribe</a></p>` : ''}
		<p>© ${new Date().getFullYear()} Sky News Summariser. All rights reserved.</p>
	</div>
</body>
</html>
	`;

	return html;
};

// Format the summary as plain text email
export const formatEmailText = (summary: unknown, unsubscribeUrl?: string): string => {
	const summaryData = summary as Summary;
	const summaryText = summaryData.summaryText || '';
	const allArticles = summaryData.sourceArticles || [];
	// Filter articles to only include those with title and url
	const articles = allArticles.filter((article: unknown): article is SourceArticle => {
		const a = article as Partial<SourceArticle>;
		return Boolean(a.title && a.url);
	});
	const [date] = new Date().toISOString().split('T');

	let text = `Sky News Daily Summary\n\n`;
	text += `Date: ${date}\n\n`;
	text += `${'='.repeat(50)}\n\n`;

	if (summaryText) {
		text += `${summaryText}\n\n`;
		text += `${'='.repeat(50)}\n\n`;
	}

	if (articles.length > 0) {
		text += `Source Articles:\n\n`;
		articles.forEach((article: SourceArticle, index: number) => {
			text += `${index + 1}. ${article.title}\n`;
			text += `   ${article.url}\n\n`;
		});
		text += `${'-'.repeat(50)}\n\n`;
	}

	text += `You are receiving this email because you subscribed to Sky News Summariser.\n`;
	if (unsubscribeUrl) {
		text += `Unsubscribe: ${unsubscribeUrl}\n`;
	}
	text += `© ${new Date().getFullYear()} Sky News Summariser. All rights reserved.\n`;

	return text;
};
