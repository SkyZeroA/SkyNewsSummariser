import * as cheerio from 'cheerio';

// Test URLs for different blog types
const TEST_URLS = {
	// Politics_uk: 'https://news.sky.com/story/politics-latest-mandelson-starmer-labour-farage-badenoch-12593360',
	ukraine_war: 'https://news.sky.com/story/russia-ukraine-war-latest-putin-sky-news-live-blog-12541713',
	// Trump_us: 'https://news.sky.com/story/trump-latest-epstein-victims-to-speak-ahead-of-trumps-state-of-the-union-address-13511578',
	// Iran: 'https://news.sky.com/story/iran-latest-protests-live-13492391',
	// Weather: 'https://news.sky.com/story/storm-chandra-latest-more-weather-warnings-kick-in-as-heavy-wind-rain-and-snow-forecast-13499467',
	// Entertainment: 'https://news.sky.com/story/baftas-2026-latest-updates-hollywood-stars-prepare-for-uks-biggest-night-in-film-with-one-battle-after-another-leading-nominations-13508649'
};

const analyzeStructure = async (url) => {
	const response = await fetch(url);
	const html = await response.text();
	const $ = cheerio.load(html);

	// Find all h5 headers
	const headers = $('h5');

	// Collect headers with their post IDs, text, and links
	const headerData = [];
	headers.each((_, header) => {
		const headerText = $(header).text().trim();

		// Find the ul that follows this h5
		const ul = $(header).next('ul');
		if (ul.length > 0) {
			const listItems = ul.find('li');

			listItems.each((_, li) => {
				const liText = $(li).text().trim();
				const link = $(li).find('a');

				if (link.length > 0) {
					const href = link.attr('href');
					const postIdMatch = href?.match(/postid=(\d+)/);
					const postId = postIdMatch ? postIdMatch[1] : null;

					if (postId) {
						headerData.push({
							header: headerText,
							text: liText,
							link: href,
							postId: postId
						});
					}
				}
			});
		}
	});

	return headerData;
};

//****************************************************/
// Collect all headers with their data from all blogs
const headerDataMap = {};

for (const [, url] of Object.entries(TEST_URLS)) {
	const headerData = await analyzeStructure(url);

	headerData.forEach(({ header, text, link, postId }) => {
		if (!headerDataMap[header]) {
			headerDataMap[header] = [];
		}
		headerDataMap[header].push({ text, link, postId });
	});
}

// Display headers with their post IDs, text, and links
console.log(`\n${'='.repeat(80)}`);
console.log('HEADERS FROM ALL BLOGS');
console.log(`${'='.repeat(80)}\n`);

let counter = 1;
Object.entries(headerDataMap).forEach(([headerText, items]) => {
	console.log(`${counter}. "${headerText}"`);
	console.log(`   Total items: ${items.length}\n`);

	items.forEach((item, idx) => {
		console.log(`   ${idx + 1}. "${item.text}"`);
		console.log(`      Link: ${item.link}`);
		console.log(`      Post ID: ${item.postId}`);
		console.log('');
	});

	counter++;
});

console.log('');

//******************************************************/


