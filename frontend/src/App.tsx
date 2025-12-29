import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

interface Article {
  id: number
  title: string
  content: string
  updated_content?: string
  citations?: string[]
}

function App() {
  const [articles, setArticles] = useState<Article[]>([])
  const [view, setView] = useState<'original' | 'updated'>('original')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('http://localhost:3001/articles')
      .then(res => {
        setArticles(res.data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="loading">Loading...</div>

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
              {view === 'updated' && article.citations && (
                <div className="refs">
                  <strong>References:</strong>
                  {article.citations.slice(0, 2).map((url, i) => (
                    <div key={i}>[{i+1}] {url}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
