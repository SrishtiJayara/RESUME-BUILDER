# ResumeAI — Groq-Powered Resume Assistant

Full-stack app: Node.js/Express backend + React frontend, using Groq's `llama-3.3-70b-versatile` for AI features.

## Features
- **Analyze** — Score your resume (0-100), ATS compatibility, section breakdown
- **Generate** — Build a full resume from scratch with AI
- **Job Match** — Compare your resume against a job description
- **Improve** — Get detailed AI suggestions, line-by-line rewrites, quick wins

## Project Structure
```
resumeai/
├── server/
│   ├── index.js          # Express + Groq API server
│   ├── package.json
│   └── .env.example      # Copy to .env and add your key
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── utils/api.js
│   └── components/
│       ├── AnalyzeTab.jsx
│       ├── GenerateTab.jsx
│       ├── MatchTab.jsx
│       ├── ImproveTab.jsx
│       └── ScoreRing.jsx
├── index.html
├── package.json
└── vite.config.js        # Proxies /api → localhost:3001
```

## Setup

### 1. Get a Groq API Key
Go to https://console.groq.com → create a free account → API Keys → Create API Key

### 2. Backend setup
```bash
cd server
npm install
cp .env.example .env
# Edit .env and paste your GROQ_API_KEY
npm run dev
```

### 3. Frontend setup (new terminal)
```bash
# from project root
npm install
npm run dev
```

Open http://localhost:5173

## API Endpoints

| Method | Endpoint       | Body                                   | Returns                          |
|--------|----------------|----------------------------------------|----------------------------------|
| POST   | /api/analyze   | `{ resumeText }`                       | score, sections, keywords, ATS   |
| POST   | /api/generate  | `{ name, jobTitle, experience, ... }`  | resumeText, bullets, skills      |
| POST   | /api/match     | `{ resumeText, jobDescription }`       | matchScore, keywords, recs       |
| POST   | /api/improve   | `{ resumeText, targetRole? }`          | quickWins, rewrites, powerWords  |
| GET    | /api/health    | —                                      | `{ status: "ok" }`               |
