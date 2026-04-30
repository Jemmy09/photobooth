const express = require('express');
const { Pool } = require('pg');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

let dbUrl = process.env.DATABASE_URL || '';
// Strip ?sslmode=require to prevent it from overriding our custom SSL config
if (dbUrl.includes('?')) {
  dbUrl = dbUrl.split('?')[0];
}

const pool = new Pool({
  connectionString: dbUrl,
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
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
  origin: ['http://localhost:5173', 'http://localhost:3010', 'https://jemmy09.github.io', process.env.CLIENT_URL].filter(Boolean),
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
        display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
        photo_url = CASE 
          WHEN ($4::TEXT) IS NOT NULL AND LENGTH($4::TEXT) > 20 AND (profiles.photo_url IS NULL OR LENGTH($4::TEXT) >= LENGTH(profiles.photo_url)) 
          THEN $4::TEXT 
          ELSE profiles.photo_url 
        END,
        location_lat = COALESCE(EXCLUDED.location_lat, profiles.location_lat),
        location_lng = COALESCE(EXCLUDED.location_lng, profiles.location_lng),
        last_seen = CURRENT_TIMESTAMP
    `, [uid, name, email, photoURL, lat, lng]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1.1 Get My Profile Details & Stats
app.get('/api/profile/me', authenticateUser, async (req, res) => {
  try {
    const userRes = await pool.query('SELECT *, created_at FROM profiles WHERE uid = $1', [req.user.uid]);
    const user = userRes.rows[0];

    // Stats logic:
    // Friends: Total accepted connections (bidirectional)
    const friendsRes = await pool.query(`
      SELECT COUNT(*) FROM follows 
      WHERE (follower_uid = $1 OR following_uid = $1) 
      AND status = 'accepted'
    `, [req.user.uid]);

    // Followers: People following me (all)
    const followersRes = await pool.query("SELECT COUNT(*) FROM follows WHERE following_uid = $1", [req.user.uid]);

    // Mutual: People where both directions are 'accepted'
    const mutualRes = await pool.query(`
      SELECT COUNT(*) FROM follows f1
      JOIN follows f2 ON f1.follower_uid = f2.following_uid AND f1.following_uid = f2.follower_uid
      WHERE f1.follower_uid = $1 AND f1.status = 'accepted' AND f2.status = 'accepted'
    `, [req.user.uid]);

    res.json({
      ...user,
      stats: {
        friends: parseInt(friendsRes.rows[0].count),
        followers: parseInt(followersRes.rows[0].count),
        mutual: parseInt(mutualRes.rows[0].count)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1.2 Update Profile
app.post('/api/profile/update', authenticateUser, async (req, res) => {
  const { name, photoURL } = req.body;
  try {
    await pool.query(`
      UPDATE profiles SET 
        display_name = COALESCE($1, display_name), 
        photo_url = CASE 
          WHEN ($2::TEXT) IS NOT NULL AND LENGTH($2::TEXT) > 20 THEN $2::TEXT 
          ELSE photo_url 
        END
      WHERE uid = $3
    `, [name, photoURL, req.user.uid]);
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
      SELECT p.uid, p.display_name, p.photo_url, p.email,
             (SELECT status FROM follows WHERE follower_uid = $2 AND following_uid = p.uid) as sent_status,
             (SELECT status FROM follows WHERE follower_uid = p.uid AND following_uid = $2) as received_status
      FROM profiles p
      WHERE (p.display_name ILIKE $1 OR p.email ILIKE $1) 
        AND p.uid != $2
        AND NOT EXISTS (
          SELECT 1 FROM follows 
          WHERE status = 'accepted' 
            AND ((follower_uid = $2 AND following_uid = p.uid) 
             OR (follower_uid = p.uid AND following_uid = $2))
        )
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
    // Check if already following
    const existing = await pool.query("SELECT * FROM follows WHERE follower_uid = $1 AND following_uid = $2", [req.user.uid, targetUid]);
    if (existing.rows.length > 0) return res.json({ success: true, message: 'Already requested' });

    // Create follow request
    await pool.query(`
      INSERT INTO follows (follower_uid, following_uid, status)
      VALUES ($1, $2, 'pending')
    `, [req.user.uid, targetUid]);

    // Notify target (only if no pending notification of this type exists)
    await pool.query(`
      INSERT INTO notifications (recipient_uid, sender_uid, type)
      SELECT $1, $2, 'follow_request'
      WHERE NOT EXISTS (
        SELECT 1 FROM notifications 
        WHERE recipient_uid = $1 AND sender_uid = $2 AND type = 'follow_request' AND read = FALSE
      )
    `, [targetUid, req.user.uid]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3.1 Unfollow / Unfriend
app.delete('/api/follow/:targetUid', authenticateUser, async (req, res) => {
  const { targetUid } = req.params;
  try {
    await pool.query(`
      DELETE FROM follows 
      WHERE (follower_uid = $1 AND following_uid = $2)
         OR (follower_uid = $2 AND following_uid = $1)
    `, [req.user.uid, targetUid]);

    // Also remove any pending notifications between these two
    await pool.query(`
      DELETE FROM notifications 
      WHERE (recipient_uid = $1 AND sender_uid = $2)
         OR (recipient_uid = $2 AND sender_uid = $1)
    `, [req.user.uid, targetUid]);

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

      // Notify the sender that they were accepted
      await pool.query(`
        INSERT INTO notifications (recipient_uid, sender_uid, type)
        VALUES ($1, $2, 'follow_accept')
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
  const { active } = req.query;
  try {
    let query = `
      SELECT p.uid, p.display_name, p.photo_url, f.status, p.last_seen
      FROM profiles p
      JOIN follows f ON (f.follower_uid = p.uid AND f.following_uid = $1)
      OR (f.following_uid = p.uid AND f.follower_uid = $1)
      WHERE f.status = 'accepted'
    `;

    if (active === 'true') {
      query += " AND p.last_seen > NOW() - INTERVAL '5 minutes'";
    }

    const result = await pool.query(query, [req.user.uid]);
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

// 10. Notifications
app.get('/api/notifications', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT n.*, p.display_name as sender_name, p.photo_url as sender_photo
      FROM notifications n
      JOIN profiles p ON n.sender_uid = p.uid
      WHERE n.recipient_uid = $1
      ORDER BY n.created_at DESC
      LIMIT 50
    `, [req.user.uid]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/read', authenticateUser, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = TRUE WHERE recipient_uid = $1', [req.user.uid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notifications', authenticateUser, async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications WHERE recipient_uid = $1', [req.user.uid]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3010;
app.listen(PORT, () => console.log(`PhotoBooth Backend running on port ${PORT}`));
