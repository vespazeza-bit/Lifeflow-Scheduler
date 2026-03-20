# LifeFlow Scheduler

A full-stack activity scheduling web application.

## Tech Stack
- **Backend**: Node.js + Express + sql.js (SQLite in pure JS)
- **Frontend**: React + Vite

## Quick Start

Double-click `start.bat` to launch both servers, or run manually:

### Backend
```bash
cd server
npm install
node index.js
```
Runs on: http://localhost:5001

### Frontend
```bash
cd client
npm install
npx vite --port 5173
```
Runs on: http://localhost:5173

## Features
- User authentication (register/login with JWT)
- Daily schedule view with week navigation
- Activity management (create, edit, delete)
- Repeating activities (daily / weekly on selected days)
- Activity log tracking (mark complete/pending/missed)
- Templates — save and apply activity sets to any day
- Statistics dashboard with completion rates and charts
