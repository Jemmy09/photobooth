<p align="center">
  <img src="frontend/public/lumina_logo.png" alt="Lumina Logo" width="280" />
</p>

<h1 align="center">Lumina</h1>


<p align="center">
  <i>A photobooth experience for the modern web. Capture, connect, and share — beautifully.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/STATUS-LIVE-FF6B2B?style=for-the-badge&logo=statuspage&logoColor=white" alt="Status">
  <img src="https://img.shields.io/badge/FRONTEND-GITHUB%20PAGES-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="Frontend">
  <img src="https://img.shields.io/badge/BACKEND-RENDER-00D68F?style=for-the-badge&logo=render&logoColor=white" alt="Backend">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/DATABASE-AIVEN%20POSTGRESQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="Database">
  <img src="https://img.shields.io/badge/AUTH-FIREBASE-FF6B2B?style=for-the-badge&logo=firebase&logoColor=white" alt="Auth">
  <img src="https://img.shields.io/badge/BUILD-VITE-00D68F?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
</p>

---

### Hello, I'm Jemmy Francisco.

I built **Lumina** because I wanted a photobooth experience that actually feels personal — not like another generic social app. It's a space where capturing memories is intuitive, where the film-strip format brings back that analog warmth, and where real connections between friends happen.

The entire interface is built from scratch with a **tangerine × mint** design system — clean, modern, and entirely original. No templates, no Instagram copies.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📸 **Studio** | 4-shot sequence with countdown, 7 lens filters, live preview |
| 🔄 **Camera Flip** | Switch between front & rear camera instantly |
| 🎞️ **Print Formats** | Classic Vertical Strip or Modern Postcard layout |
| 🖼️ **Frame Styles** | Pristine White, Deep Noir, or Premium Rose frames |
| 👥 **Friends** | Search, follow, and see who's online in real time |
| 🔔 **Notifications** | Live friend requests, booth invites, and alerts |
| 🔐 **Auth** | Google OAuth or Email/Password via Firebase |
| 💾 **Gallery** | Last 3 prints auto-saved to your personal dashboard |
| 📤 **Share & Download** | Share or save your prints directly from the app |

---

## 🎨 Design System

Lumina uses a fully custom, synchronized color palette — deliberately distanced from generic app aesthetics.

| Token | Color | Usage |
|---|---|---|
| `--primary` | `#FF6B2B` Tangerine | Buttons, active states, focus rings |
| `--secondary` | `#00D68F` Electric Mint | Accents, secondary actions, online indicators |
| `--accent` | `#FF4500` Deep Ember | Alerts, cancel actions |
| `--bg-dark` | `#0d1117` Near-black | Page background |

---

## 🚀 Getting Started

This project is a **monorepo** — frontend and backend live together for easy management.

### Prerequisites
- Node.js v18+
- A Firebase project (for Auth)
- An Aiven PostgreSQL database (for storage)

### Run Locally

**1. Install dependencies:**
```bash
# Install frontend
cd frontend
npm install

# Install backend
cd ../backend
npm install
```

**2. Configure environment:**

`frontend/.env`:
```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_URL=http://localhost:3010
```

`backend/.env`:
```env
DATABASE_URL=your_aiven_postgresql_url
FIREBASE_SERVICE_ACCOUNT=your_service_account_json
PORT=3010
```

**3. Start dev servers:**
```bash
# Terminal 1 — Frontend
cd frontend
npm run dev

# Terminal 2 — Backend
cd backend
node server.js
```

### Build for Production
```bash
cd frontend
npm run build
```

---

## 📁 Project Structure

```
lumina/
├── frontend/
│   ├── src/
│   │   ├── app.js          # Core application logic & routing
│   │   └── style.css       # Lumina design system & CSS variables
│   ├── public/             # Static assets
│   ├── index.html          # App shell & view templates
│   └── vite.config.js
├── backend/
│   ├── server.js           # Express API — auth, profiles, prints, friends
│   └── .env.example
└── README.md
```

---

## 📡 API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/profile/sync` | Sync Firebase user to database |
| `GET` | `/api/profile/me` | Fetch current user profile & stats |
| `POST` | `/api/prints/save` | Save a generated print |
| `GET` | `/api/prints/recent` | Fetch 3 most recent prints |
| `POST` | `/api/follow/:uid` | Send a friend request |
| `GET` | `/api/friends` | Get friends list |
| `GET` | `/api/notifications` | Get notifications |
| `POST` | `/api/notifications/:id/read` | Mark notification as read |

---

## 📜 Version History

| Version | Notes |
|---|---|
| **v1.4.0** | **STABLE** — Lumina rebrand, tangerine × mint design system, camera flip fix, functional Studio back button |
| **v1.3.5** | Notification controls, dashboard gallery optimization |
| **v1.3.0** | Premium Update — Glassmorphism UI, real-time presence |
| **v1.2.0** | Migrated to monorepo structure |
| **v1.0.0** | Initial launch — core camera & social features |

---

<p align="center">
  <b>Crafted with care by Jemmy Francisco</b><br>
  <i>Always learning, always building.</i>
</p>
