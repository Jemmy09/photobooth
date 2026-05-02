# PhotoBooth Full-Stack Monorepo

A premium, social photobooth experience built with Vite, Firebase, and Node.js.

## 📁 Repository Structure
- **`/frontend`**: React/Vite frontend application (deployed to GitHub Pages).
- **`/backend`**: Node.js/Express API with PostgreSQL (deployed to Render/Railway).
- **`sync.js`**: Unified tool for committing and pushing changes.

## 🚀 One-Command Setup

The project now uses **npm workspaces**. You only need to run setup in the root directory:

1. **Install everything**: 
   ```bash
   npm install
   ```
2. **Setup Environment**:
   - Copy `frontend/.env.example` to `frontend/.env`.
   - Copy `backend/.env.example` to `backend/.env`.
3. **Run Development Mode**:
   ```bash
   npm run dev
   ```
   *This starts both the frontend and the backend simultaneously!*

## 🛠️ Unified Commands (from root)
| Command | Description |
| :--- | :--- |
| `npm run dev` | Start both Frontend and Backend concurrently |
| `npm run build` | Build the frontend for production |
| `npm run commit` | Professional sync tool (Stages, Commits, and Pushes) |
| `npm run dev:frontend` | Start ONLY the frontend |
| `npm run dev:backend` | Start ONLY the backend |

## 📸 Usage
1. Login with Google.
2. Go to **Friends** to follow other users.
3. Once they follow back, click **Invite** to start a shared session.
4. Or just click **Open Camera** to take a solo strip!

