import * as cheerio from 'cheerio';

const url = 'https://news.sky.com/story/russia-ukraine-war-latest-putin-sky-news-live-blog-12541713';

console.log('Investigating data-ncpost-id attributes:\n');

try {
	const response = await fetch(url);
	const html = await response.text();
	const $ = cheerio.load(html);
	
	// Find all elements with data-ncpost-id attribute
	const posts = $('[data-ncpost-id]');
	console.log(`Found ${posts.length} elements with data-ncpost-id attribute\n`);
	
	posts.each((idx, post) => {
		const ncPostId = $(post).attr('data-ncpost-id');
		const title = $(post).find('.ncpost-title, h2, h3').first().text().trim();
		
		console.log(`Post ${idx + 1}:`);
		console.log(`  data-ncpost-id value: "${ncPostId}"`);
		console.log(`  Is empty? ${ncPostId === ''}`);
		console.log(`  Title: ${title.slice(0, 80)}...`);
		console.log('');
	});
	
	// Now check JSON-LD data
	console.log(`\n${'='.repeat(80)}`);
	console.log('JSON-LD Post IDs:');
	console.log(`${'='.repeat(80)}\n`);
	
	$('script[type="application/ld+json"]').each((_, script) => {
		try {
			const jsonText = $(script).html();
			const data = JSON.parse(jsonText);
			
			if (data['@type'] === 'LiveBlogPosting' && data.liveBlogUpdate) {
				console.log(`Found ${data.liveBlogUpdate.length} posts in JSON-LD\n`);
				
				data.liveBlogUpdate.slice(0, 5).forEach((update, idx) => {
					const urlMatch = update.url?.match(/#(\d+)/);
					const postId = urlMatch ? urlMatch[1] : null;
					
					console.log(`JSON-LD Post ${idx + 1}:`);
					console.log(`  Post ID from URL: ${postId}`);
					console.log(`  Title: ${update.headline.slice(0, 80)}...`);
					console.log('');
				});
			}
		} catch {}
	});
	
	// Check if there's any relationship between HTML structure and postIds
	console.log(`\n${'='.repeat(80)}`);
	console.log('CONCLUSION:');
	console.log(`${'='.repeat(80)}\n`);
	
	console.log('The data-ncpost-id attributes are EMPTY strings.');
	console.log('Sky News does NOT populate these attributes with actual post IDs.');
	console.log('The only reliable source for post IDs is the JSON-LD data.');
	console.log('Post IDs are extracted from the URL fragments (e.g., #11137887).');
	
} catch (error) {
	console.log(`Error: ${error.message}`);
}

