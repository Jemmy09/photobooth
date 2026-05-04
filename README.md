<p align="center">
  <img src="frontend/public/lumina_logo.png" alt="Lumina Logo" width="280" />
</p>

<h1 align="center">Lumina Studio</h1>

<p align="center">
  <i>A premium, cloud-native photobooth built to capture memories and connect friends.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/VERSION-v1.8.1_STABLE-00D68F?style=for-the-badge&logo=statuspage&logoColor=white" alt="Version">
  <img src="https://img.shields.io/badge/ARCHITECTURE-CLOUD%20FIRST-FF6B2B?style=for-the-badge&logo=render&logoColor=white" alt="Architecture">
  <img src="https://img.shields.io/badge/DATABASE-AIVEN%20POSTGRESQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="Database">
  <img src="https://img.shields.io/badge/AUTH-FIREBASE-FF6B2B?style=for-the-badge&logo=firebase&logoColor=white" alt="Auth">
</p>

---

### Hello, I'm Jemmy Francisco.

I built **Lumina** to create a simple, functional space for people to take photos and share moments. This project has evolved into a high-performance, cloud-native application using **Aiven PostgreSQL** as the single source of truth for all masterpieces.

---

## 🚀 What's New in v1.8.1 STABLE

*   **☁️ 100% Cloud-First Architecture**: Eliminated all `LocalStorage` dependencies. Masterpieces are synchronized in real-time with the Lumina Cloud for absolute cross-device consistency.
*   **🖼️ Premium Grid Gallery**: A redesigned, responsive grid view mimicking native gallery apps with sleek hover-activated Download/Delete controls.
*   **🛡️ Anti-Distortion Engine**: Proprietary `drawCover` canvas logic that prevents image stretching, ensuring natural facial proportions regardless of camera aspect ratio.
*   **✨ Lumina Cloud Branding**: A unified, high-end professional identity across the entire user experience.

---

## 📸 How to Use Lumina

1. **Create an Account:** Sign up securely using your email or Google account to access your personal dashboard.
2. **Enter the Studio:** Click on the Studio tab to open the camera. Choose between your front and rear cameras.
3. **Set Up Your Shot:** Choose your layout (4-shot vertical strip, postcard, etc.) and pick a themed frame.
4. **Capture:** The app runs a 3-second countdown and captures your sequence using the **drawCover** engine.
5. **View Your Gallery:** Your masterpiece instantly appears on your Dashboard in the new **Grid Gallery**.
6. **Connect with Friends:** Use the Community tab to search for users and send friend requests.

---

## 🧹 Storage & Cleanup Policy

Lumina runs on a high-performance Aiven PostgreSQL database. To maintain speed and reliability, we employ the following policies:

*   **3-Day Retention:** Masterpieces are securely stored in the Lumina Cloud for **72 hours (3 days)**.
*   **Automatic Deletion:** After 3 days, the system automatically purges stale images to optimize storage.
*   **Source of Truth:** All data is fetched directly from the cloud—no local caching issues.

---

## 🛠️ Technical Stack

### 🧠 Programming Languages
*   **JavaScript (JS):** Core logic for Frontend (Vite) and Backend (Node.js/Express).
*   **SQL:** Direct database management for Aiven PostgreSQL.

### 🎨 Design & Structure
*   **HTML5 & CSS3:** Custom Glassmorphism UI system.
*   **Face-API.js:** AI-powered face tracking and intelligent bokeh.

### ☁️ Cloud Platforms
*   **Aiven PostgreSQL:** Managed cloud database (The Source of Truth).
*   **Firebase:** Secure user authentication.
*   **Render:** High-availability backend hosting.
*   **GitHub Pages:** Fast, edge-distributed frontend hosting.

---

## 📁 Project Structure

```text
lumina/
├── frontend/
│   ├── src/
│   │   ├── app.js          # Core logic & Cloud Sync engine
│   │   └── style.css       # Design system & Glassmorphism
│   ├── public/             # Static assets
│   ├── index.html          # App shell & views
│   └── vite.config.js
├── backend/
│   ├── server.js           # Lumina Cloud API (Aiven PG + Auth)
│   └── .env.example
└── README.md
```

---

## 📜 Version History

| Version | Notes |
|---|---|
| **v1.8.1** | **STABLE** — Cloud-First Architecture, Premium Grid Gallery, and drawCover Anti-Distortion Engine |
| **v1.7.3** | Migrated to Aiven PostgreSQL source of truth; removed LocalStorage masterpiece cache |
| **v1.6.1** | **STABLE** — AI Face Tracking, Smart Bokeh, High-Res Cinema Layouts, and 10+ Themed Studio Frames |
| **v1.6.0** | Unified Filter Engine v2.0: Optimized overlays, Bokeh safety checks, and Puppy V2 logic |
| **v1.5.0** | Offline-first Gallery, Aiven DB Sync, 3-day Auto-Purge, new Custom Favicon |
| **v1.4.0** | Lumina rebrand, tangerine × mint design system |
| **v1.0.0** | Initial launch — core camera & social features |

---

<p align="center">
  <b>Crafted with care by Jemmy Francisco</b><br>
  <i>Always learning, always building.</i>
</p>
