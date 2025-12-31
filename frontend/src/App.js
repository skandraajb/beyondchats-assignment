import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [articles, setArticles] = useState([]);
  const [view, setView] = useState('original');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('https://beyondchats-backend-j9ex.onrender.com')
      .then(res => {
        const fixedArticles = res.data.map(article => ({
          ...article,
          citations: typeof article.citations === 'string' 
            ? JSON.parse(article.citations || '[]') 
            : (article.citations || [])
        }));
        setArticles(fixedArticles);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="app">
      <div className="container">
        <h1 className="title">BeyondChats Article Dashboard</h1>
        
        <div className="buttons">
          <button 
            className={`btn ${view === 'original' ? 'active' : ''}`}
            onClick={() => setView('original')}
          >
            Original Articles
          </button>
          <button 
            className={`btn ${view === 'updated' ? 'active' : ''}`}
            onClick={() => setView('updated')}
          >
            Updated Articles
          </button>
        </div>

        <div className="grid">
          {articles.map(article => (
            <div key={article.id} className="card">
              <h2>{article.title}</h2>
              <p className="content">
                {view === 'original' ? article.content : article.updated_content || article.content}
              </p>
              {view === 'updated' && article.citations && article.citations.length > 0 && (
                <div className="refs">
                  <strong>References:</strong>
                  {article.citations.slice(0, 2).map((url, i) => (
                    <div key={i}>
                      [{i+1}] <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
