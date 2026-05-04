<p align="center">
  <img src="frontend/public/lumina_logo.png" alt="Lumina Logo" width="280" />
</p>

<h1 align="center">Lumina</h1>

<p align="center">
  <i>A web-based photobooth built to capture memories and connect friends.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/STATUS-LIVE-FF6B2B?style=for-the-badge&logo=statuspage&logoColor=white" alt="Status">
  <img src="https://img.shields.io/badge/FRONTEND-GITHUB%20PAGES-0d1117?style=for-the-badge&logo=github&logoColor=white" alt="Frontend">
  <img src="https://img.shields.io/badge/BACKEND-RENDER-00D68F?style=for-the-badge&logo=render&logoColor=white" alt="Backend">
  <img src="https://img.shields.io/badge/DATABASE-AIVEN%20POSTGRESQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="Database">
  <img src="https://img.shields.io/badge/AUTH-FIREBASE-FF6B2B?style=for-the-badge&logo=firebase&logoColor=white" alt="Auth">
</p>

---

### Hello, I'm Jemmy Francisco.

I built **Lumina** to create a simple, functional space for people to take photos and share moments. Rather than relying on complex architecture, this project is built practically using accessible tools: **GitHub Pages** for hosting the interface, **Render** for the backend logic, **Aiven PostgreSQL** for data management, and **Firebase** for secure user authentication. 

It is designed to be lightweight, easy to use, and focused entirely on the core experience of capturing photos with friends.

---

## 📸 How to Use Lumina

Lumina is designed to be straightforward. Here is how it works:

1. **Create an Account:** Sign up securely using your email or Google account to access your personal dashboard.
2. **Enter the Studio:** Click on the Studio tab to open the camera. You can switch between your front and rear cameras depending on your device.
3. **Set Up Your Shot:** Choose your preferred layout (like a classic 4-shot vertical strip or a postcard format) and pick a frame color.
4. **Capture:** The app runs a 3-second countdown and captures your sequence. You can apply different lens filters before saving.
5. **View Your Gallery:** Once saved, your masterpiece instantly appears on your Dashboard under "Recent Masterpiece". You can click it to view it in high resolution or download it to your device.
6. **Connect with Friends:** Use the Community tab to search for other users, send friend requests, and see who is currently online.

---

## 🧹 Storage & Cleanup Policy

Because Lumina runs on an independent Aiven PostgreSQL database with limited storage capacity, we employ a strict automated cleanup system to keep the application running fast and efficiently for everyone.

*   **3-Day Retention:** Any photo captured in the Studio is securely stored in your gallery for exactly **72 hours (3 days)**. 
*   **Automatic Deletion:** After 3 days, the system automatically and permanently deletes the image from the database to free up space. 
*   **Limit of 3:** To ensure fair storage usage, the gallery will only hold your **3 most recent** prints at any given time.

*Tip: Always make sure to download your favorite prints to your personal device before they are cleared from the server!*

---

## 🛠️ What Was Used to Build Lumina?

To build Lumina, we used a practical mix of true programming languages, structure/design languages, and cloud platforms.

### 🧠 Programming Languages (The Logic)
*   **JavaScript (JS):** Used heavily on both the Frontend (to run the camera, UI, and browser logic) and the Backend (running via Node.js to handle APIs and database connections).
*   **SQL (Structured Query Language):** Used on the backend to talk to the database (inserting, finding, and deleting photos and profiles).

### 🎨 Structure & Design (Not Programming)
*   **HTML (HyperText Markup Language):** The skeleton of the website (buttons, text boxes, and image layouts).
*   **CSS (Cascading Style Sheets):** Used purely for design, giving Lumina its custom tangerine and mint color theme.
*   **JSON & Markdown:** Used for data configurations (`package.json`) and documentation (`README.md`).

### ☁️ Tools & Cloud Platforms
*   **Vite:** A build tool that bundles all our frontend files and makes the website load as fast as possible.
*   **Node.js:** Allows JavaScript to run on the backend server.
*   **Firebase:** Handles secure user authentication (Google & Email Login).
*   **Aiven PostgreSQL:** Hosts the relational database in the cloud.
*   **Render:** Hosts and runs the backend logic 24/7.
*   **GitHub Pages:** Hosts the bundled frontend files.

---

<details>
<summary><b>💻 Developer Setup & Installation</b> (Click to expand)</summary>

### Prerequisites
- Node.js v18+
- Firebase project credentials
- Aiven PostgreSQL connection URL

### Run Locally

**1. Install dependencies:**
```bash
cd frontend && npm install
cd ../backend && npm install
```

**2. Configure environment variables:**
Create `.env` files in both the frontend and backend directories with your respective API keys.

**3. Start dev servers:**
```bash
# Terminal 1 — Frontend
cd frontend && npm run dev

# Terminal 2 — Backend
cd backend && node server.js
```
</details>

---

## 📁 Project Structure

```text
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

## 📜 Version History

| Version | Notes |
|---|---|
| **v1.5.3** | **STABLE** — Account & Gallery Deletion Logic, Modal Routing Fixes, Legal Policies |
| **v1.5.0** | **STABLE** — Offline-first Gallery, Aiven DB Sync, 3-day Auto-Purge, new Custom Favicon |
| **v1.4.0** | Lumina rebrand, tangerine × mint design system, camera flip fix, functional Studio back button |
| **v1.3.5** | Notification controls, dashboard gallery optimization |
| **v1.3.0** | Design Update — Glassmorphism UI, real-time presence |
| **v1.2.0** | Migrated to monorepo structure |
| **v1.0.0** | Initial launch — core camera & social features |

---

<p align="center">
  <b>Crafted with care by Jemmy Francisco</b><br>
  <i>Always learning, always building.</i>
</p>
