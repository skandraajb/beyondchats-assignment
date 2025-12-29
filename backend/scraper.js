const axios = require('axios');
const cheerio = require('cheerio');
const db = require('./db');

async function scrapeOldestArticles() {
  const lastPageUrl = 'https://beyondchats.com/blogs/page/15/';
  
  const { data } = await axios.get(lastPageUrl);
  const $ = cheerio.load(data);
  
  const articles = [];
  
  $('article, .blog-post, .post-item').slice(0, 5).each((i, el) => {
    const title = $(el).find('h1, h2, h3, a, .title').first().text().trim() || `Article ${i + 1}`;
    const url = $(el).find('a').first().attr('href') || `https://beyondchats.com/article-${i + 1}`;
    const content = $(el).find('p, .excerpt, .summary').first().text().trim().slice(0, 500) + '...';
    
    articles.push({ title, url: url.startsWith('http') ? url : `https://beyondchats.com${url}`, content });
  });
  
  articles.forEach(article => {
    db.run(`INSERT OR IGNORE INTO articles (title, content, url) VALUES (?, ?, ?)`,
      [article.title, article.content, article.url], (err) => {
        if (err) console.error(err);
      }
    );
  });
  
  console.log(`Scraped & stored ${articles.length} articles`);
  console.table(articles);
}

scrapeOldestArticles();
