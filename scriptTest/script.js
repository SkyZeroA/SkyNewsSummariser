import * as cheerio from 'cheerio';

// REMEMBER:Change URL everyday!
const LIVE_BLOG_URL = 'https://news.sky.com/story/politics-latest-mandelson-starmer-labour-farage-badenoch-12593360';

const analyzeStructure = async () => {
	const response = await fetch(LIVE_BLOG_URL);
	const html = await response.text();
	const $ = cheerio.load(html);

	console.log('='.repeat(80));
	console.log('ANALYZING LIVE BLOG STRUCTURE');
	console.log('='.repeat(80));
	console.log('');

	// Find all h5 headers in the key points section
	const headers = $('h5');
	console.log(`Found ${headers.length} h5 headers\n`);

	headers.each((i, header) => {
		const headerText = $(header).text().trim();
		console.log(`\nHeader ${i + 1}: "${headerText}"`);
		console.log('-'.repeat(80));

		// Find the ul that follows this h5
		const ul = $(header).next('ul');
		if (ul.length > 0) {
			const listItems = ul.find('li');
			console.log(`  Found ${listItems.length} list items:`);

			listItems.each((j, li) => {
				const liText = $(li).text().trim();
				const link = $(li).find('a');

				if (link.length > 0) {
					const href = link.attr('href');
					const postIdMatch = href?.match(/postid=(\d+)/);
					const postId = postIdMatch ? postIdMatch[1] : 'N/A';

					console.log(`    ${j + 1}. "${liText.slice(0, 60)}..."`);
					console.log(`       Link: ${href}`);
					console.log(`       Post ID: ${postId}`);
				} else {
					console.log(`    ${j + 1}. "${liText.slice(0, 60)}..." (no link)`);
				}
			});
		} else {
			console.log('  No ul found after this header');
		}
	});

	// Now let's find posts by their IDs
	console.log(`\n\n${'='.repeat(80)}`);
	console.log('ANALYZING POST STRUCTURE');
	console.log('='.repeat(80));

	// Look for posts with data-ncpost-id attribute
	const posts = $('[data-ncpost-id]');
	console.log(`\nFound ${posts.length} posts with data-ncpost-id attribute\n`);

	posts.slice(0, 3).each((i, post) => {
		const postId = $(post).attr('data-ncpost-id');
		const title = $(post).find('.ncpost-title').text().trim();
		const content = $(post).find('.ncpost-content').text().trim();

		console.log(`\nPost ${i + 1}:`);
		console.log(`  ID: ${postId}`);
		console.log(`  Title: ${title.slice(0, 60)}...`);
		console.log(`  Content: ${content.slice(0, 100)}...`);
	});
};

await analyzeStructure();

