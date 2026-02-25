import * as cheerio from 'cheerio';

/**
 * Sky News Live Blog Content Extractor
 *
 * Extracts ALL available blog posts with full content from Sky News live blogs.
 * Note: Only the most recent ~10-11 posts per blog are available.
 */

// Test URLs for different blog types
const TEST_URLS = {
    politics_uk: 'https://news.sky.com/story/politics-latest-mandelson-starmer-labour-farage-badenoch-12593360',
    ukraine_war: 'https://news.sky.com/story/russia-ukraine-war-latest-putin-sky-news-live-blog-12541713',
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

// Function to extract ALL blog posts from JSON-LD data with full content
const extractAllBlogPosts = async (url, blogName) => {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        const posts = [];

        // Extract from JSON-LD data
        $('script[type="application/ld+json"]').each((_, script) => {
            try {
                const jsonText = $(script).html();
                const data = JSON.parse(jsonText);

                if (data['@type'] === 'LiveBlogPosting' && data.liveBlogUpdate) {
                    data.liveBlogUpdate.forEach(update => {
                        // Extract postId from URL fragment (e.g., #11137887)
                        const urlMatch = update.url?.match(/#(\d+)/);
                        const postId = urlMatch ? urlMatch[1] : null;

                        if (update.headline && update.articleBody) {
                            posts.push({
                                blogName: blogName,
                                postId: postId || 'unknown',
                                title: update.headline,
                                content: update.articleBody,
                                url: url
                            });
                        }
                    });
                }
            } catch {
                // Skip invalid JSON blocks
            }
        });

        return posts;
    } catch (error) {
        console.error(`Error extracting posts from ${blogName}:`, error.message);
        return [];
    }
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




//****************************************************/
// Extract ALL available blog posts from all blogs
console.log(`\n${'='.repeat(80)}`);
console.log('EXTRACTING ALL AVAILABLE BLOG POSTS');
console.log(`${'='.repeat(80)}\n`);

const allPosts = [];

for (const [blogName, url] of Object.entries(TEST_URLS)) {
    console.log(`Extracting posts from ${blogName}...`);
    const posts = await extractAllBlogPosts(url, blogName);
    allPosts.push(...posts);
    console.log(`  Found ${posts.length} posts\n`);
}

console.log(`Total posts extracted: ${allPosts.length}\n`);

//****************************************************/
// Display ALL posts with full content
console.log(`${'='.repeat(80)}`);
console.log('ALL BLOG POSTS WITH FULL CONTENT');
console.log(`${'='.repeat(80)}\n`);

if (allPosts.length === 0) {
    console.log('No blog posts found.\n');
} else {
    allPosts.forEach((post, idx) => {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`POST ${idx + 1} of ${allPosts.length}`);
        console.log(`${'='.repeat(80)}`);
        console.log(`Blog: ${post.blogName}`);
        console.log(`Post ID: ${post.postId}`);
        console.log(`Title: ${post.title}`);
        console.log(`\n${'-'.repeat(80)}`);
        console.log('CONTENT:');
        console.log(`${'-'.repeat(80)}`);
        console.log(post.content);
        console.log(`${'-'.repeat(80)}`);
        console.log(`Content Length: ${post.content.length} characters`);
        console.log(`${'='.repeat(80)}\n`);
    });

    // Summary statistics
    const totalContentLength = allPosts.reduce((sum, post) => sum + post.content.length, 0);
    console.log(`\n${'='.repeat(80)}`);
    console.log('SUMMARY STATISTICS');
    console.log(`${'='.repeat(80)}`);
    console.log(`Total Posts: ${allPosts.length}`);
    console.log(`Total Content Length: ${totalContentLength.toLocaleString()} characters`);
    console.log(`Average Content Length: ${Math.round(totalContentLength / allPosts.length).toLocaleString()} characters`);
    console.log(`${'='.repeat(80)}\n`);
}

//******************************************************/


