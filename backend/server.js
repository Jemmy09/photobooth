const express = require('express');
const { Pool } = require('pg');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- Database Schema Initializer ---
(async () => {
  console.log("🛠️  INITIATING PHOTOBOOTH DATABASE SETUP...");
  try {
    // User Profiles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        uid VARCHAR(255) PRIMARY KEY,
        display_name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        photo_url TEXT,
        location_lat DECIMAL,
        location_lng DECIMAL,
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Friendships (Follower/Following)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS follows (
        follower_uid VARCHAR(255) REFERENCES profiles(uid) ON DELETE CASCADE,
        following_uid VARCHAR(255) REFERENCES profiles(uid) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted'
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (follower_uid, following_uid)
      );
    `);

    // Notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        recipient_uid VARCHAR(255) REFERENCES profiles(uid) ON DELETE CASCADE,
        sender_uid VARCHAR(255) REFERENCES profiles(uid) ON DELETE CASCADE,
        type VARCHAR(50), -- 'follow_request', 'invite'
        data JSONB,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Booth Sessions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS booth_sessions (
        id SERIAL PRIMARY KEY,
        host_uid VARCHAR(255) REFERENCES profiles(uid) ON DELETE CASCADE,
        guest_uid VARCHAR(255) REFERENCES profiles(uid) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'finished'
        shared_photos JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✨ PHOTOBOOTH DATABASE IS READY!");
  } catch (err) {
    console.error("❌ DATABASE SETUP FAILED:", err.message);
  }
})();

const app = express();
// Configure CORS to restrict origins in production
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173', // Default Vite port
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Firebase Admin Initialization
let serviceAccount;
try {
    serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
        ? JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString())
        : null;
    
    if (serviceAccount) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        console.log('✅ Firebase Admin initialized.');
    }
} catch (error) {
    console.warn('⚠️ Firebase Admin not initialized (Missing FIREBASE_SERVICE_ACCOUNT).');
}

// Middleware: Authenticate User
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).send('Unauthorized');
  
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (err) {
    res.status(401).send('Invalid Token');
  }
};

// --- Endpoints ---

// 1. Sync Profile (Create or Update)
app.post('/api/profile/sync', authenticateUser, async (req, res) => {
  const { uid, email, name, photoURL, lat, lng } = req.body;
  try {
    await pool.query(`
      INSERT INTO profiles (uid, display_name, email, photo_url, location_lat, location_lng, last_seen)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (uid) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        photo_url = EXCLUDED.photo_url,
        location_lat = EXCLUDED.location_lat,
        location_lng = EXCLUDED.location_lng,
        last_seen = CURRENT_TIMESTAMP
    `, [uid, name, email, photoURL, lat, lng]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Search Users
app.get('/api/users/search', authenticateUser, async (req, res) => {
  const { query } = req.query;
  try {
    const result = await pool.query(`
      SELECT uid, display_name, photo_url FROM profiles
      WHERE (display_name ILIKE $1 OR email ILIKE $1) AND uid != $2
      LIMIT 10
    `, [`%${query}%`, req.user.uid]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Follow User (Request)
app.post('/api/follow/:targetUid', authenticateUser, async (req, res) => {
  const { targetUid } = req.params;
  try {
    // Create follow request
    await pool.query(`
      INSERT INTO follows (follower_uid, following_uid, status)
      VALUES ($1, $2, 'pending')
      ON CONFLICT DO NOTHING
    `, [req.user.uid, targetUid]);

    // Notify target
    await pool.query(`
      INSERT INTO notifications (recipient_uid, sender_uid, type, data)
      VALUES ($1, $2, 'follow_request', $3)
    `, [targetUid, req.user.uid, JSON.stringify({ name: req.user.name })]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Respond to Follow (Follow Back / Accept)
app.post('/api/follow/respond/:senderUid', authenticateUser, async (req, res) => {
  const { senderUid } = req.params;
  const { action } = req.body; // 'accept' or 'reject'
  try {
    if (action === 'accept') {
      // Set original request to accepted
      await pool.query(`
        UPDATE follows SET status = 'accepted'
        WHERE follower_uid = $1 AND following_uid = $2
      `, [senderUid, req.user.uid]);

      // Automatically follow back? User mentioned "Follow back" as an option.
      // We'll just set the status for now.
    } else {
      await pool.query(`
        DELETE FROM follows WHERE follower_uid = $1 AND following_uid = $2
      `, [senderUid, req.user.uid]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get Friends List
app.get('/api/friends', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.uid, p.display_name, p.photo_url, f.status
      FROM profiles p
      JOIN follows f ON (f.follower_uid = p.uid AND f.following_uid = $1)
      OR (f.following_uid = p.uid AND f.follower_uid = $1)
      WHERE f.status = 'accepted'
    `, [req.user.uid]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Invite to Booth
app.post('/api/booth/invite/:targetUid', authenticateUser, async (req, res) => {
  const { targetUid } = req.params;
  try {
    const session = await pool.query(`
      INSERT INTO booth_sessions (host_uid, guest_uid, status)
      VALUES ($1, $2, 'pending')
      RETURNING id
    `, [req.user.uid, targetUid]);

    await pool.query(`
      INSERT INTO notifications (recipient_uid, sender_uid, type, data)
      VALUES ($1, $2, 'booth_invite', $3)
    `, [targetUid, req.user.uid, JSON.stringify({ sessionId: session.rows[0].id, hostName: req.user.name })]);

    res.json({ success: true, sessionId: session.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Respond to Booth Invite
app.post('/api/booth/respond/:sessionId', authenticateUser, async (req, res) => {
  const { sessionId } = req.params;
  const { action } = req.body;
  try {
    if (action === 'accept') {
      await pool.query(`
        UPDATE booth_sessions SET status = 'active'
        WHERE id = $1 AND guest_uid = $2
      `, [sessionId, req.user.uid]);
    } else {
      await pool.query(`
        UPDATE booth_sessions SET status = 'rejected'
        WHERE id = $1 AND guest_uid = $2
      `, [sessionId, req.user.uid]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Start Capturing (Sync)
app.post('/api/booth/session/:id/start', authenticateUser, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("UPDATE booth_sessions SET status = 'capturing' WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Get Session Status (Polling)
app.get('/api/booth/session/:id', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, ph.display_name as host_name, pg.display_name as guest_name
      FROM booth_sessions s
      JOIN profiles ph ON s.host_uid = ph.uid
      JOIN profiles pg ON s.guest_uid = pg.uid
      WHERE s.id = $1 AND (s.host_uid = $2 OR s.guest_uid = $2)
    `, [req.params.id, req.user.uid]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Upload Photo to Session
app.post('/api/booth/session/:id/photo', authenticateUser, async (req, res) => {
  const { id } = req.params;
  const { photoData } = req.body;
  try {
    const sessionRes = await pool.query('SELECT shared_photos FROM booth_sessions WHERE id = $1', [id]);
    const sharedPhotos = sessionRes.rows[0].shared_photos || [];
    sharedPhotos.push({ uid: req.user.uid, photo: photoData, timestamp: new Date() });
    
    await pool.query('UPDATE booth_sessions SET shared_photos = $1 WHERE id = $2', [JSON.stringify(sharedPhotos), id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Get Notifications
app.get('/api/notifications', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, p.display_name as sender_name, p.photo_url as sender_photo
      FROM notifications n
      JOIN profiles p ON n.sender_uid = p.uid
      WHERE n.recipient_uid = $1 AND n.read = FALSE
      ORDER BY n.created_at DESC
    `, [req.user.uid]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => console.log(`PhotoBooth Backend running on port ${PORT}`));
