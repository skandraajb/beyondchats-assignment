# BeyondChats Assignment

This project is built as part of the BeyondChats technical assignment and is divided into three phases:
- Scraping and storing blog articles
- Updating articles using external references
- Displaying articles in a frontend UI

---

## Live Links
Frontend: (to be deployed)
Backend: (to be deployed)

---

## Tech Stack
- Backend: Node.js, Express, SQLite
- Scraping: Axios, Cheerio
- Frontend: React.js

---

## Phase 1: Blog Scraping & APIs
- Scraped the oldest articles from the BeyondChats blogs section.
- Since the last page contains very few articles, previous pages were also scraped until 5 articles were collected.
- Articles are stored in a database.
- CRUD APIs are created to manage articles.

---

## Phase 2: Article Update Script
- Fetches original articles using internal APIs.
- Searches the article title on Google.
- Scrapes content from top-ranking external articles.
- Uses an LLM to improve and reformat the original article.
- Saves the updated version using existing APIs.
- Reference links are added at the bottom of the article.

---

## Phase 3: Frontend
- React-based UI to display both original and updated articles.
- Responsive layout for better readability.

---

## Local Setup

### Backend
```bash
cd backend
npm install
node scraper.js
node server.js
