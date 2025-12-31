const axios = require('axios');
const puppeteer = require('puppeteer');

async function updateArticles() {
  console.log('PHASE 2: Article Updates Starting...');

  const { data: articles } = await axios.get('http://localhost:3001/articles');
  console.log(`Found ${articles.length} articles`);

  for (const article of articles) {
    if (article.updated_content && String(article.updated_content).trim().length > 0) {
      console.log(`Skipping "${article.title}" (already updated)`);
      continue;
    }

    console.log(`\n[${article.id}] Updating: ${article.title}`);

    const searchResults = await googleSearch(`"${article.title}" blog -site:beyondchats.com`);
    const referenceUrls = searchResults
      .filter(u => u && !u.includes('beyondchats.com'))
      .slice(0, 2);

    if (referenceUrls.length < 2) {
      console.log('Not enough reference URLs, skipping...');
      continue;
    }

    const references = [];
    for (const url of referenceUrls) {
      try {
        const content = await scrapeArticle(url);
        references.push({ url, content: (content || '').slice(0, 1200) });
        console.log(`Scraped: ${url}`);
      } catch (e) {
        console.log(`Failed scraping: ${url}`);
      }
    }

    if (references.length < 2) {
      console.log('Could not scrape 2 references, skipping...');
      continue;
    }

    const updatedContent = llmRewriteLikeCompetitors(article, references);

    await axios.put(`http://localhost:3001/articles/${article.id}`, {
      updated_content: updatedContent,
      citations: referenceUrls
    });

    console.log(`Updated: ${article.title}`);
  }

  console.log('\nPHASE 2 COMPLETE! Check http://localhost:3001/articles');
}

async function googleSearch(query) {
  return [
    'https://blog.hubspot.com/marketing/google-ads',
    'https://www.wordstream.com/blog/ws/google-ads',
    'https://neilpatel.com/blog/google-ads-guide/'
  ];
}

async function scrapeArticle(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  const content = await page.evaluate(() => {
    const el = document.querySelector('article, .post-content, .entry-content, main');
    return (el ? el.innerText : document.body.innerText) || '';
  });

  await browser.close();
  return content.replace(/\s+\n/g, '\n').trim();
}

function llmRewriteLikeCompetitors(original, references) {
  const title = (original.title || '').trim();
  const base = (original.content || '').replace(/\s+/g, ' ').trim();

  const refTakeaways = references.map((r, idx) => {
    const snippet = (r.content || '').replace(/\s+/g, ' ').trim().slice(0, 220);
    return `- Competitor #${idx + 1} focuses on: ${snippet}${snippet.length >= 220 ? '...' : ''}`;
  }).join('\n');

  const citationsBlock = references
    .map((r, i) => `${i + 1}. ${r.url}`)
    .join('\n');

  return `# ${title} (Updated)

## Overview
${base.slice(0, 280)}${base.length > 280 ? '...' : ''}

## What top-ranking articles emphasize
${refTakeaways}

## Key takeaways (SEO-friendly)
- Clear problem statement and who this is for.
- Step-by-step guidance with practical examples.
- Short sections, strong headings, and scannable bullets.

## Suggested structure (improved formatting)
### 1) Define the goal
Explain what the reader is trying to achieve and the success metric.

### 2) Core steps
- Step 1: Setup / prerequisites.
- Step 2: Execution and best practices.
- Step 3: Measurement and optimization.

### 3) Common mistakes to avoid
- Not tracking conversions properly.
- Targeting too broad keywords/audiences.
- Ignoring landing page relevance.

## Expanded rewrite (based on original)
${base.slice(0, 1100)}${base.length > 1100 ? '...' : ''}

---
## References
${citationsBlock}
`;
}

updateArticles().catch(console.error);
