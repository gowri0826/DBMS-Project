# DBMS Project

This repository contains a full-stack research project system built with React on the frontend and Node.js/Express on the backend.

## Project Overview

The application is designed to support a research project workflow with roles such as students, faculty, and administrators. It includes project management, student/faculty dashboards, notifications, milestones, tasks, recommendations, and reporting features.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MySQL and optional MongoDB integration
- Styling: Custom CSS

## Repository Structure

- `frontend/` – React frontend application
- `backend/` – Express API server
- `package.json` – root scripts for running the app

## Prerequisites

- Node.js 18+
- npm
- MySQL database running locally or configured via environment variables
- Optional MongoDB connection string

## Environment Variables

Create a `.env` file in the backend folder with values similar to:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=your_database
MONGO_URI=mongodb://localhost:27017/your_db
```

## Run the Project

From the project root:

```bash
npm install
npm run backend
```

In a second terminal:

```bash
npm run frontend
```

The frontend should run on the Vite local development port, and the backend should run on port 5000 by default.

## Build the Frontend

```bash
npm run build:frontend
```

## GitHub Repository

- https://github.com/gowri0826/DBMS-Project

## Notes

This project is a collaborative academic/DBMS application and is structured as a monorepo for easier setup and deployment.
