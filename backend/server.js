const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

// Check if DB has any articles; if empty, run scraper automatically
db.get('SELECT COUNT(*) as count FROM articles', (err, row) => {
  if (err) {
    console.error('Error checking DB:', err.message);
    return;
  }
  if (!row || row.count === 0) {
    console.log('No articles found. Running scraper...');
    exec('node scraper.js', (error, stdout, stderr) => {
      if (error) {
        console.error('Scraper error:', error);
        return;
      }
      if (stdout) console.log('Scraper output:\n', stdout);
      if (stderr) console.error('Scraper stderr:\n', stderr);
      console.log('Scraping finished.');
    });
  } else {
    console.log(`DB already has ${row.count} articles.`);
  }
});

// API routes
app.get('/articles', (req, res) => {
  db.all('SELECT * FROM articles ORDER BY id', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/articles/:id', (req, res) => {
  db.get('SELECT * FROM articles WHERE id = ?', [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Article not found' });
    res.json(row);
  });
});

app.post('/articles', (req, res) => {
  const { title, content, url } = req.body;
  db.run('INSERT INTO articles (title, content, url) VALUES (?, ?, ?)', [title, content, url], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.put('/articles/:id', (req, res) => {
  const { updated_content, citations } = req.body;
  db.run('UPDATE articles SET updated_content = ?, citations = ? WHERE id = ?', [updated_content, JSON.stringify(citations), req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, changes: this.changes });
  });
});

// Optional: serve frontend build
const frontendBuildPath = path.join(__dirname, 'frontend', 'build');
app.use(express.static(frontendBuildPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// Fallback for all other routes to frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// Dynamic port for Render
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
