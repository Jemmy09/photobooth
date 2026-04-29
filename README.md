# PhotoBooth Web App

A premium, social photobooth experience built with Vite, Firebase, and Node.js.

## 🚀 Features
- **Smart Camera**: Capture 4 poses with a countdown.
- **Classic Prints**: Automatically generates "Strips" (vertical) or "Postcards" (grid).
- **Social Connect**: Search and follow friends.
- **Shared Booth**: Invite friends to a synchronous session and create combined prints featuring both users.
- **Premium UI**: Modern dark mode with glassmorphism and smooth animations.

## 🛠️ Setup

### Backend
1. Go to `backend` directory.
2. Install dependencies: `npm install`.
3. Rename `.env.example` to `.env` and fill in your credentials:
   - `DATABASE_URL`: PostgreSQL connection string (Aiven recommended).
   - `FIREBASE_SERVICE_ACCOUNT`: Base64 encoded Firebase service account JSON.
4. Run: `node server.js`.

### Frontend
1. Install dependencies: `npm install`.
2. Run: `npm run dev`.
3. Copy `.env.example` to `.env` and update the values.

## 📸 Usage
1. Login with Google.
2. Go to **Friends** to follow other users.
3. Once they follow back, click **Invite** to start a shared session.
4. Or just click **Open Camera** to take a solo strip!
