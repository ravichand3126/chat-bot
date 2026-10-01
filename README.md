# Monochrome AI Chatbot (Strictly Black & White)

A production-ready, minimal, high-performance AI chatbot web application inspired by the usability of modern chat interfaces. Built with **React**, **TypeScript**, **Vite**, **Express**, and the official **OpenAI API**.

Designed strictly in **monochrome black and white** (`#000000` / `#ffffff`) with zero colorful distractors.

---

## Features

- 🎨 **Strict Black & White Design**: Minimalist monochrome aesthetic with clear typography hierarchy and zero color distractors.
- 🔒 **Secure Architecture**: The OpenAI API key is strictly stored on the server (`server/.env`) and **NEVER** exposed to client JavaScript or browser network calls.
- ⚡ **Real-time SSE Streaming**: Tokens stream progressively chunk-by-chunk using Server-Sent Events (SSE).
- ⏹️ **Stop & Regenerate Generation**: Stop response generation mid-stream or regenerate AI answers anytime.
- 📝 **Markdown & Code Support**: Full markdown rendering with monochrome code blocks and 1-click copy buttons.
- 📱 **Fully Responsive Layout**:
  - **Desktop / Laptop**: Dual-panel view with conversation sidebar and chat canvas.
  - **Mobile / Tablet**: Sliding drawer navigation with full-width chat canvas and touch-friendly controls.
- 💬 **Conversation Management**:
  - Start new chats
  - Search conversation history
  - Auto-generate title from prompt
  - Rename and delete conversations
  - Local & server persistence
- ⚙️ **Settings Modal**: Model selection (`GPT-4o`, `GPT-4o Mini`, `GPT-3.5 Turbo`), API health status, and conversation management.

---

## Architecture

```
Frontend (Vite + React + TS)  ──[SSE / REST]──>  Backend API Proxy (Express + TS)  ──[OpenAI SDK]──>  OpenAI API
```

1. **Frontend (`/client`)**: React 19 + TypeScript single-page app. Interacts solely with the Express backend proxy.
2. **Backend Proxy (`/server`)**: Node.js + Express API server. Securely holds the `OPENAI_API_KEY` in environment variables and forwards stream completions to the client via Server-Sent Events.

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Installation

Install dependencies for all workspace modules:

```bash
npm run setup
```

*(Or run `npm install` inside root, `/client`, and `/server` individually).*

### 2. Configure OpenAI API Key

Create a `.env` file in the `server` directory (or copy from `server/.env.example`):

```bash
# inside server/.env
OPENAI_API_KEY=sk-proj-your_actual_openai_api_key_here
PORT=3001
```

> **Security Note**: Never commit your `.env` file or API key to Git. `.env` is listed in `.gitignore`.

### 3. Running Locally

To launch both backend server and frontend development server concurrently:

```bash
npm run dev
```

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`

Open `http://localhost:5173` in your browser.

---

## Available NPM Scripts

From the root directory:

- `npm run dev`: Runs both client and server in development mode.
- `npm run dev:client`: Runs Vite frontend dev server.
- `npm run dev:server`: Runs Express backend dev server with hot reload (`tsx watch`).
- `npm run build`: Compiles TypeScript and builds production bundles for client & server.
- `npm start`: Starts production Node server.

---

## Production Deployment

### Option 1: Single Node Server (Server + Client Bundle)

1. Build both client and server:
   ```bash
   npm run build
   ```
2. Serve static files from `client/dist` using Express in production or deploy to platforms like Render, Railway, or AWS.

### Option 2: Decoupled Deployment

- **Frontend**: Deploy `client` bundle (`client/dist`) to Vercel, Netlify, or Cloudflare Pages. Set `VITE_API_URL` to your backend URL.
- **Backend**: Deploy `server` to Render, Fly.io, Railway, or Docker. Set `OPENAI_API_KEY` and `CLIENT_URL` in server environment settings.

---

## License

MIT License.
