const express = require('express');
const cors = require('cors');
const db = require('./db');
const app = express();

app.use(cors());
app.use(express.json());

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
  db.run(
    'INSERT INTO articles (title, content, url) VALUES (?, ?, ?)',
    [title, content, url],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.put('/articles/:id', (req, res) => {
  const { updated_content, citations } = req.body;
  db.run(
    'UPDATE articles SET updated_content = ?, citations = ? WHERE id = ?',
    [updated_content, JSON.stringify(citations), req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, changes: this.changes });
    }
  );
});

app.listen(3001, () => {
  console.log('Backend: http://localhost:3001/articles');
});
