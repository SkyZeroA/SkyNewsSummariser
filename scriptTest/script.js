import * as cheerio from 'cheerio';

// Test URLs for different blog types
const TEST_URLS = {
	politics_uk: 'https://news.sky.com/story/politics-latest-mandelson-starmer-labour-farage-badenoch-12593360',
	ukraine_war: 'https://news.sky.com/story/russia-ukraine-war-latest-putin-sky-news-live-blog-12541713',
	trump_us: 'https://news.sky.com/story/trump-latest-epstein-victims-to-speak-ahead-of-trumps-state-of-the-union-address-13511578',
	iran: 'https://news.sky.com/story/iran-latest-protests-live-13492391',
	weather: 'https://news.sky.com/story/storm-chandra-latest-more-weather-warnings-kick-in-as-heavy-wind-rain-and-snow-forecast-13499467',
	entertainment: 'https://news.sky.com/story/baftas-2026-latest-updates-hollywood-stars-prepare-for-uks-biggest-night-in-film-with-one-battle-after-another-leading-nominations-13508649'
};

const analyzeStructure = async (url, blogName) => {
	console.log(`\n${'='.repeat(80)}`);
	console.log(`TESTING: ${blogName}`);
	console.log(`URL: ${url}`);
	console.log('='.repeat(80));

	const response = await fetch(url);
	const html = await response.text();
	const $ = cheerio.load(html);

	console.log('\n--- KEY POINTS SECTION ---');

	// Find all h5 headers in the key points section
	const headers = $('h5');
	console.log(`Found ${headers.length} h5 headers\n`);

	headers.each((i, header) => {
		const headerText = $(header).text().trim();
		console.log(`\nHeader>>>> ${i + 1}: "${headerText}"`);
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
	console.log(`\n\n--- POST STRUCTURE ---`);

	// Look for posts with data-ncpost-id attribute
	const posts = $('[data-ncpost-id]');
	console.log(`Found ${posts.length} posts with data-ncpost-id attribute\n`);

	posts.slice(0, 3).each((i, post) => {
		const postId = $(post).attr('data-ncpost-id');
		const title = $(post).find('.ncpost-title').text().trim();
		const content = $(post).find('.ncpost-content').text().trim();

		console.log(`\nPost ${i + 1}:`);
		console.log(`  ID: ${postId}`);
		console.log(`  Title: ${title.slice(0, 60)}...`);
		console.log(`  Content: ${content.slice(0, 100)}...`);
	});

	console.log(`\n${'='.repeat(80)}\n`);
};

// Test all URLs
 console.log('\n🚀 TESTING ALL SKY NEWS LIVE BLOGS 🚀\n');

for (const [key, url] of Object.entries(TEST_URLS)) {
	await analyzeStructure(url, key.toUpperCase().replace('_', ' '));
}


