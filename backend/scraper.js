const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const db = path.join(__dirname, 'articles.db');

const BASE_PAGE_URL = 'https://beyondchats.com/blogs/page/';
const START_PAGE = 15;
const WANT = 5; 
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function normalizeUrl(u) {
  if (!u) return null;
  if (u.startsWith('http')) return u;
  if (u.startsWith('//')) return 'https:' + u;
  if (u.startsWith('/')) return 'https://beyondchats.com' + u;
  return 'https://beyondchats.com/' + u;
}

async function fetchHtml(url) {
  try {
    const r = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000
    });
    return r.data;
  } catch (err) {
    console.error('fetch error for', url, err.message || err);
    return null;
  }
}

function parseListing(html) {
  const $ = cheerio.load(html);
  const items = [];

  const cards = $('.elementor-post');
  if (cards.length) {
    for (let i = 1; i <= cards.length; i++) {
      const el = cards[i - 1];
      const $el = $(el);
      const a = $el.find('.elementor-post__title a').first();
      const title = (a.text() || $el.find('h2, h3, h1').first().text() || '').trim();
      const url = normalizeUrl(a.attr('href') || $el.find('a').first().attr('href'));
      const excerpt = ($el.find('.elementor-post__excerpt').first().text() || '').trim();
      if (title && url) items.push({ title, url, content: excerpt });
    }
    return items;
  }

  const heads = $('h2 a, h3 a, .entry-title a');
  for (let i = 1; i <= heads.length; i++) {
    const el = heads[i - 1];
    const $el = $(el);
    const title = ($el.text() || '').trim();
    const url = normalizeUrl($el.attr('href'));
    if (title && url) items.push({ title, url, content: '' });
  }

  return items;
}

async function fetchArticleDetails(url) {
  const html = await fetchHtml(url);
  if (!html) return null;
  const $ = cheerio.load(html);
  const title = ($('meta[property="og:title"]').attr('content') || $('title').first().text() || $('h1').first().text() || '').trim();
  let excerpt = ($('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '').trim();
  if (!excerpt) {
    const p = $('.entry-content p, .post-content p, .article-content p, p').first();
    if (p && $(p).text()) excerpt = $(p).text().trim();
  }
  return { title: title || null, url, content: excerpt ? (excerpt.slice(0, 800) + (excerpt.length > 800 ? '...' : '')) : '' };
}

async function getLinksFromFeeds() {
  const candidates = ['https://beyondchats.com/blogs/feed/', 'https://beyondchats.com/feed/', 'https://beyondchats.com/sitemap.xml'];
  const found = new Set();

  for (let i = 1; i <= candidates.length; i++) {
    const u = candidates[i - 1];
    try {
      const r = await axios.get(u, { headers: { 'User-Agent': USER_AGENT }, timeout: 10000 });
      const text = r.data || '';
      const re = /https?:\/\/beyondchats\.com[^\s"'<>]+/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        const link = m[0].split('#')[0].split('?')[0];
        if (!link.includes('/tag/') && !link.includes('/category/')) {
          found.add(normalizeUrl(link));
        }
      }
    } catch (err) {
    }
  }

  return Array.from(found);
}

(async function main() {
  try {
    const collected = [];
    const seen = new Set();
    let page = START_PAGE;

    console.log('Starting simple scraper...');

    while (collected.length < WANT && page > 0) {
      const pageUrl = `${BASE_PAGE_URL}${page}/`;
      console.log('Fetching page', pageUrl);
      const html = await fetchHtml(pageUrl);
      page--;

      if (!html) continue;

      const list = parseListing(html);
      console.log('  found', list.length, 'candidates on page', page + 1);

      for (let i = list.length; i >= 1 && collected.length < WANT; i--) {
        const it = list[i - 1];
        if (!it || !it.url) continue;
        if (seen.has(it.url)) continue;
        seen.add(it.url);

        if (!it.title) {
          const full = await fetchArticleDetails(it.url);
          if (full && full.title) {
            collected.push(full);
          }
        } else {
          collected.push(it);
        }
      }

      console.log('  collected so far:', collected.length, '/', WANT);
    }

    if (collected.length < WANT) {
      console.log('Not enough from pages. Trying feed/sitemap fallback...');
      const feedLinks = await getLinksFromFeeds();
      console.log('  feed/sitemap gave', feedLinks.length, 'links (will check until need is satisfied)');

      for (let i = 1; i <= feedLinks.length && collected.length < WANT; i++) {
        const u = feedLinks[i - 1];
        if (!u || seen.has(u)) continue;
        seen.add(u);
        const details = await fetchArticleDetails(u);
        if (details && details.title) {
          collected.push(details);
          console.log('  backfilled:', details.title);
        }
      }
    }

    if (!collected.length) {
      console.warn('No articles found. Exiting.');
      return;
    }

    const final = collected.slice(0, WANT);

    try {
      fs.writeFileSync('./oldest_simple.json', JSON.stringify(final, null, 2), 'utf8');
      console.log('Wrote ./oldest_simple.json');
    } catch (err) {
      console.warn('Could not write backup JSON:', err.message || err);
    }

    for (let i = 1; i <= final.length; i++) {
      const a = final[i - 1];
      try {
        await new Promise((resolve, reject) => {
          db.run('INSERT OR IGNORE INTO articles (title, content, url) VALUES (?, ?, ?)', [a.title, a.content, a.url], err => {
            if (err) return reject(err);
            resolve();
          });
        });
      } catch (err) {
        console.error('DB insert error for', a.url, err.message || err);
      }
    }

    console.log('Done. Scraped & stored', final.length, 'articles:');
    console.table(final.map(x => ({ title: x.title, url: x.url })));
  } catch (err) {
    console.error('Fatal error:', err);
  }
})();
