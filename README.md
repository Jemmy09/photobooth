# 📸 PhotoBooth 
### *Capture, Connect, and Share the Moment.*

A high-fidelity, social photobooth platform built for modern creators. PhotoBooth combines the nostalgia of vintage film strips with a state-of-the-art glassmorphism interface and real-time social connectivity.

---

## 💎 Core Features
*   ✨ **Premium Glassmorphism UI**: A stunning, semi-transparent design system optimized for mobile and desktop.
*   🤝 **Real-Time Social Sync**: Follow friends, see who's online, and invite them to shared photo sessions instantly.
*   📸 **AI-Powered Studio**: Capture multi-shot film strips or postcards with dynamic layouts and professional filters.
*   🔔 **Instant Notifications**: Stay updated with smart follow requests and session invites.
*   📊 **Smart Dashboard**: Track your "Top 3" recent prints and monitor your social status at a glance.

## 🛠️ Technology Stack
| Layer | Tech | Description |
| :--- | :--- | :--- |
| **Frontend** | Vanilla JS / Vite | Blazing fast, lightweight, and high-performance. |
| **Backend** | Node.js / Express | Robust API architecture with secure token verification. |
| **Database** | PostgreSQL | Industrial-grade data persistence via Aiven. |
| **Auth** | Firebase | Seamless Google & Email authentication. |
| **Design** | CSS3 (Modern) | Custom tokens, animations, and responsive grid systems. |

## 🚀 Quick Start
This project uses **npm workspaces** for a unified development experience.

1.  **Installation**:
    ```bash
    npm install
    ```
2.  **Environment Setup**:
    - Populate `frontend/.env` with your Firebase config.
    - Populate `backend/.env` with your `DATABASE_URL` and `FIREBASE_SERVICE_ACCOUNT`.
3.  **Run Development**:
    ```bash
    npm run dev
    ```
    *Starts both the frontend and backend concurrently!*

## 📦 Monorepo Structure
*   `frontend/`: The client-side application (Vite).
*   `backend/`: The server-side API (Express).
*   `sync.js`: Our bespoke unified commit and deployment tool.

---
*PhotoBooth v1.3.5 — Built with precision.*
