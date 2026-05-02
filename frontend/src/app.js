/** 
 * PhotoBooth Engine v1.4.0 STABLE
 * Professional Filter System & Pro Controls
 */
import './style.css';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

// --- Configuration ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBGrIB0_NxfaQfvajUG44jm3V7-EZ62Wqs",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "turn-45eea.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "turn-45eea",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "turn-45eea.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "173251953667",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:173251953667:web:fad45aaa1826aa4a9aba36"
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://photobooth-backend-sdyv.onrender.com'; // Dynamically switch API URL

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// App State
let currentUser = null;
let currentView = 'dashboard';
let isCameraActive = false;
let currentLens = 'none';

const LENSES = {
    none: { name: 'Normal', filter: 'none', icon: 'circle' },
    vivid: { name: 'Vivid', filter: 'brightness(1.1) contrast(1.1) saturate(1.3)', icon: 'zap' },
    noir: { name: 'Noir', filter: 'grayscale(1) contrast(1.4) brightness(0.9)', icon: 'moon' },
    vintage: { name: 'Vintage', filter: 'sepia(0.5) contrast(1.1) brightness(1.05)', icon: 'film' },
    dreamy: { name: 'Dreamy', filter: 'blur(0.5px) brightness(1.1) saturate(0.8) contrast(0.9)', icon: 'cloud' },
    cool: { name: 'Cool', filter: 'hue-rotate(180deg) saturate(0.8) brightness(1.1)', icon: 'snowflake' },
    warm: { name: 'Warm', filter: 'sepia(0.3) saturate(1.5) brightness(1.1)', icon: 'sun' }
};
let mediaStream = null;
let photos = [];
let userLocation = null;

// DOM Elements
const appElement = document.getElementById('app');
const contentElement = document.getElementById('content');
const navElement = document.getElementById('main-nav');
const notificationContainer = document.getElementById('notification-container');

// --- Initialization ---
function init() {
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            console.log("🚀 PhotoBooth System — v1.4.0 STABLE — Authenticated & Active");
            syncProfile(user);
            fetchNotifications(); // Initial check
            
            // Stay active heartbeat
            if (!window.appHeartbeat) {
                window.appHeartbeat = setInterval(() => {
                    syncProfile(currentUser);
                    fetchNotifications();
                    if (currentView === 'dashboard') fetchFriends(true); // Keep dashboard active list fresh
                }, 60000); // Every minute
            }
            
            showView('dashboard');
            navElement.classList.remove('hidden');
            updateUserUI();
        } else {
            if (window.appHeartbeat) {
                clearInterval(window.appHeartbeat);
                window.appHeartbeat = null;
            }
            showView('login');
            navElement.classList.add('hidden');
        }
    });

    setupEventListeners();
    refreshIcons();
}

function setupEventListeners() {
    document.addEventListener('click', (e) => {
        const link = e.target.closest('[data-link]');
        if (link) {
            e.preventDefault();
            showView(link.dataset.link);
            
            // Highlight active nav item
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            if (link.classList.contains('nav-item')) {
                link.classList.add('active');
            } else {
                // If clicked from somewhere else (like a button), find the nav item
                const navItem = document.querySelector(`.nav-item[data-link="${link.dataset.link}"]`);
                if(navItem) navItem.classList.add('active');
            }
        }

        if (e.target.closest('#logout-btn')) {
            window.handleLogout();
        }


    });

    document.addEventListener('submit', async (e) => {
        if (e.target.id === 'login-form') {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const btn = document.getElementById('login-submit-btn');
            const loader = btn.querySelector('.loader-small');
            const span = btn.querySelector('span');
            
            btn.disabled = true;
            span.style.opacity = '0';
            loader.classList.remove('hidden');
            
            try {
                await auth.signInWithEmailAndPassword(email, password);
            } catch (err) {
                showToast(err.message, "error");
                btn.disabled = false;
                span.style.opacity = '1';
                loader.classList.add('hidden');
            }
        }
        
        if (e.target.id === 'register-form') {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const btn = document.getElementById('register-submit-btn');
            const loader = btn.querySelector('.loader-small');
            const span = btn.querySelector('span');
            
            btn.disabled = true;
            span.style.opacity = '0';
            loader.classList.remove('hidden');
            
            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                await userCredential.user.updateProfile({ displayName: name });
            } catch (err) {
                showToast(err.message, "error");
                btn.disabled = false;
                span.style.opacity = '1';
                loader.classList.add('hidden');
            }
        }
    });
}

window.toggleAuthMode = (mode) => {
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

    if (mode === 'login') {
        loginSection.classList.remove('hidden');
        registerSection.classList.add('hidden');
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
    } else {
        loginSection.classList.add('hidden');
        registerSection.classList.remove('hidden');
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
    }
    refreshIcons();
};

function refreshIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// --- Routing & Views ---
function showView(view) {
    currentView = view;
    const template = document.getElementById(`view-${view}`);
    
    if (template) {
        contentElement.innerHTML = '';
        contentElement.appendChild(template.content.cloneNode(true));
        
        // View specific initialization
        if (view === 'dashboard') {
            updateUserUI();
            fetchFriends(true); // Active friends only for dashboard
        }
        if (view === 'camera') startCamera();
        if (view === 'friends') initFriends();
        if (view === 'profile') initProfile();
        if (view === 'notifications') initNotifications();
        
        window.scrollTo(0, 0);
        refreshIcons();
    } else {
        renderDynamicView(view);
    }
}

function renderDynamicView(view) {
    if (view === 'dashboard') {
        contentElement.innerHTML = document.getElementById('view-dashboard').innerHTML;
        updateUserUI();
        fetchFriends(true); // Only active friends for dashboard
    } else if (view === 'friends') {
        contentElement.innerHTML = `
            <div class="fade-in mt-2">
                <h1 class="mb-2" style="font-family: 'Outfit', sans-serif;">Connect with Friends</h1>
                
                <div class="input-group">
                    <input type="text" id="friend-search" placeholder="Search by name or email...">
                </div>

                <div id="search-results" class="grid-2 mb-2"></div>

                <h2 class="mb-1">My Friends</h2>
                <div id="friends-list" class="grid-2">
                    <div class="loader-small"></div>
                </div>
            </div>
        `;
        initFriends();
    }
    refreshIcons();
}

// --- View Logic ---

async function startCamera() {
    const video = document.getElementById('video');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        video.srcObject = stream;
        isCameraActive = true;
        applyLens(currentLens);
        renderLensBar();
        updateCaptureIndicator(0);
        
        // Lens Bar starts hidden but ready
        const lb = document.getElementById('lens-bar-container');
        if (lb) lb.classList.add('hidden');
    } catch (err) {
        showToast("Camera access denied", "error");
        showView('dashboard');
    }
}

window.toggleLensBar = () => {
    const lb = document.getElementById('lens-bar-container');
    if (lb) {
        lb.classList.toggle('hidden');
        if (!lb.classList.contains('hidden')) {
            renderLensBar(); // Refresh on show
        }
    }
};

window.applyLens = (lensKey) => {
    currentLens = lensKey;
    const video = document.getElementById('video');
    if (video) {
        video.style.filter = LENSES[lensKey].filter;
    }
    
    // Highlight active lens in UI
    document.querySelectorAll('.lens-item').forEach(item => {
        const isActive = item.dataset.lens === lensKey;
        item.style.borderColor = isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)';
        item.style.transform = isActive ? 'scale(1.1)' : 'scale(1)';
        item.style.background = isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)';
        
        const label = item.querySelector('span');
        if (label) label.style.color = isActive ? 'white' : 'var(--text-muted)';
    });
}

function renderLensBar() {
    const carousel = document.getElementById('filter-carousel');
    if (!carousel) return;
    
    carousel.innerHTML = Object.keys(LENSES).map(key => {
        const lens = LENSES[key];
        const isActive = key === currentLens;
        return `
            <div class="lens-item flex-center" data-lens="${key}" onclick="applyLens('${key}')" style="flex: 0 0 auto; width: 72px; height: 72px; border-radius: 50%; background: ${isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)'}; border: 3px solid ${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; cursor: pointer; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); flex-direction: column; gap: 4px; box-shadow: ${isActive ? '0 0 20px var(--primary-glow)' : 'none'};">
                <i data-lucide="${lens.icon}" style="width: 22px; height: 22px; color: ${isActive ? 'white' : 'var(--text-muted)'};"></i>
                <span style="font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: ${isActive ? 'white' : 'var(--text-muted)'};">${lens.name}</span>
            </div>
        `;
    }).join('');
    refreshIcons();
}

function updateCaptureIndicator(count) {
    const indicator = document.getElementById('capture-count-indicator');
    const progressCircle = document.getElementById('shutter-progress');
    if (indicator) indicator.innerText = `${count} / 4 Shots`;
    
    if (progressCircle) {
        const offset = 201 - (count / 4) * 201;
        progressCircle.style.strokeDashoffset = offset;
    }
}

async function captureImage() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('temp-canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Apply Lens to Canvas
    ctx.filter = LENSES[currentLens].filter;
    
    // Flip horizontal for natural look
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
}

window.handleCapture = async () => {
    const shots = [];
    const countdownEl = document.getElementById('countdown');
    const shutterBtn = document.getElementById('capture-btn');
    
    shutterBtn.disabled = true;
    shutterBtn.style.transform = 'scale(0.8)';
    
    for (let i = 0; i < 4; i++) {
        // Countdown
        countdownEl.classList.remove('hidden');
        for (let j = 3; j > 0; j--) {
            countdownEl.innerText = j;
            await new Promise(r => setTimeout(r, 800));
        }
        countdownEl.classList.add('hidden');
        
        // Capture
        const shot = await captureImage();
        shots.push(shot);
        updateCaptureIndicator(i + 1);
        
        // Flash effect
        const video = document.getElementById('video');
        video.style.opacity = '0';
        setTimeout(() => video.style.opacity = '1', 100);
        
        if (i < 3) await new Promise(r => setTimeout(r, 1000));
    }
    
    shutterBtn.disabled = false;
    shutterBtn.style.transform = 'scale(1)';
    updateCaptureIndicator(0); // Reset
    
    const mode = document.getElementById('booth-mode').value;
    const frameColor = document.getElementById('frame-color').value;
    
    if (mode === 'strip') {
        processStrip(shots, frameColor);
    } else {
        processPostcard(shots, frameColor);
    }
}

async function startCaptureSequence() {
    const shutter = document.getElementById('shutter-btn');
    const capturedContainer = document.getElementById('captured-strips');
    if (shutter) shutter.disabled = true;
    photos = [];
    capturedContainer.innerHTML = '';
    
    for (let i = 0; i < 4; i++) {
        await runCountdown(3);
        const photo = capturePhoto();
        photos.push(photo);
        
        if (activeSession) {
            uploadSessionPhoto(photo);
        }
        
        const img = document.createElement('img');
        img.src = photo;
        img.style.width = '80px';
        img.style.borderRadius = '8px';
        img.classList.add('fade-in');
        capturedContainer.appendChild(img);
    }
    
    if (shutter) shutter.disabled = false;
    
    if (activeSession) {
        waitForPartnerPhotos();
    } else {
        processFinalPrint();
    }
}

async function uploadSessionPhoto(photoData) {
    const token = await currentUser.getIdToken();
    await fetch(`${API_BASE_URL}/api/booth/session/${activeSession.id}/photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ photoData })
    });
}

async function waitForPartnerPhotos() {
    showToast("Waiting for partner's photos...", "info");
    const interval = setInterval(async () => {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/booth/session/${activeSession.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const session = await res.json();
        if (session.shared_photos && session.shared_photos.length >= 8) {
            clearInterval(interval);
            processCombinedPrint(session.shared_photos);
        }
    }, 3000);
}

function processCombinedPrint(allPhotos) {
    // Sort photos: host 1, guest 1, host 2, guest 2...
    const hostPhotos = allPhotos.filter(p => p.uid === activeSession.host_uid);
    const guestPhotos = allPhotos.filter(p => p.uid === activeSession.guest_uid);
    
    const combined = [];
    for(let i=0; i<4; i++) {
        if(hostPhotos[i]) combined.push(hostPhotos[i].photo);
        if(guestPhotos[i]) combined.push(guestPhotos[i].photo);
    }
    
    photos = combined; // Override global photos for processing
    processFinalPrint(true); // pass true for shared
}

async function runCountdown(seconds) {
    const el = document.getElementById('countdown');
    el.style.display = 'flex';
    for (let i = seconds; i > 0; i--) {
        el.innerText = i;
        await new Promise(r => setTimeout(r, 1000));
    }
    el.style.display = 'none';
}

function capturePhoto() {
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('photo-canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.8);
}

function processFinalPrint(isShared = false) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const modeStrip = document.getElementById('mode-strip');
    const isStrip = modeStrip ? modeStrip.classList.contains('active') : true;
    
    showToast("Generating your masterpiece... ✨", "info");

    if (isStrip) {
        // Vertical Strip
        canvas.width = isShared ? 800 : 400;
        canvas.height = 1200;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        let loaded = 0;
        const total = photos.length;

        photos.forEach((p, i) => {
            const img = new Image();
            img.src = p;
            img.onload = () => {
                if (isShared) {
                    // 2 columns, 4 rows
                    const col = i % 2;
                    const row = Math.floor(i / 2);
                    ctx.drawImage(img, 20 + (col * 380), 20 + (row * 290), 360, 270);
                } else {
                    // 1 column, 4 rows
                    ctx.drawImage(img, 20, 20 + (i * 290), 360, 270);
                }
                loaded++;
                if (loaded === total) finalizePrint(canvas);
            };
        });
    } else {
        // Postcard (800x600)
        canvas.width = 800;
        canvas.height = isShared ? 1200 : 600;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        let loaded = 0;
        const total = photos.length;

        photos.forEach((p, i) => {
            const img = new Image();
            img.src = p;
            img.onload = () => {
                const cols = 2;
                const x = (i % cols) * 390 + 10;
                const y = Math.floor(i / cols) * 290 + 10;
                ctx.drawImage(img, x, y, 380, 280);
                loaded++;
                if (loaded === total) finalizePrint(canvas);
            };
        });
    }
}

function finalizePrint(canvas) {
    const dataUrl = canvas.toDataURL('image/png');
    
    // Save to Recent Prints Gallery (Limit 3)
    let recentPrints = JSON.parse(localStorage.getItem('recent_prints') || '[]');
    recentPrints.unshift(dataUrl); // Add to front
    recentPrints = recentPrints.slice(0, 3); // Keep only 3
    localStorage.setItem('recent_prints', JSON.stringify(recentPrints));
    
    const resultContainer = document.getElementById('captured-strips');
    resultContainer.innerHTML = `
        <div class="fade-in" style="text-align: center;">
            <h2 class="mb-1">Your Print is Ready!</h2>
            <img src="${dataUrl}" style="max-width: 100%; border: 10px solid white; box-shadow: var(--shadow-lg);">
            <div class="flex-center mt-1" style="gap: 1rem;">
                <a href="${dataUrl}" download="photobooth-print.png" class="btn btn-primary">Download</a>
                <button id="share-btn" class="btn btn-secondary">Share</button>
            </div>
        </div>
    `;
    
    document.getElementById('share-btn').onclick = () => sharePrint(dataUrl);
    showToast("Print generated! ✨", "success");
}

async function sharePrint(dataUrl) {
    try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'photobooth.png', { type: 'image/png' });
        if (navigator.share) {
            await navigator.share({
                files: [file],
                title: 'PhotoBooth Capture',
                text: 'Check out our photobooth session!'
            });
        } else {
            showToast("Sharing not supported on this browser", "info");
        }
    } catch (err) {
        console.error(err);
    }
}

let activeSession = null;
let sessionPollingInterval = null;

async function startSessionPolling(sessionId) {
    if (sessionPollingInterval) clearInterval(sessionPollingInterval);
    sessionPollingInterval = setInterval(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/booth/session/${sessionId}`, {
                headers: { 'Authorization': `Bearer ${await currentUser.getIdToken()}` }
            });
            const session = await res.json();
            activeSession = session;
            
            if (session.status === 'active' && currentView !== 'booth') {
                showView('booth');
                showToast("Joined session with " + (session.host_uid === currentUser.uid ? session.guest_name : session.host_name), "success");
            }
            
            // If host has photos and guest doesn't, guest might need to see them
            // This is a simplified sync capture
        } catch (e) {}
    }, 3000);
}

// Notification Polling
let unreadNotifCount = 0;
setInterval(async () => {
    if (currentUser) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications`, {
                headers: { 'Authorization': `Bearer ${await currentUser.getIdToken()}` }
            });
            const notifications = await res.json();
            let newCount = 0;
            notifications.forEach(n => {
                if (!localStorage.getItem(`notif_${n.id}`)) {
                    newCount++;
                    if (n.type === 'booth_invite') {
                        showBoothInvite(n);
                    } else if (n.type === 'follow_request') {
                        showFollowRequest(n);
                    } else {
                        showToast(`${n.sender_name}: ${n.type.replace('_', ' ')}`, 'info');
                    }
                    localStorage.setItem(`notif_${n.id}`, 'true');
                }
            });
            // Update nav badge
            unreadNotifCount += newCount;
            const badge = document.getElementById('nav-notification-badge');
            if (badge) {
                if (unreadNotifCount > 0) {
                    badge.textContent = unreadNotifCount > 9 ? '9+' : unreadNotifCount;
                    badge.classList.remove('hidden');
                    badge.style.display = 'flex';
                } else {
                    badge.classList.add('hidden');
                    badge.style.display = 'none';
                }
            }
        } catch (e) {}
    }
}, 5000);

function showBoothInvite(n) {
    const data = JSON.parse(n.data);
    const toast = document.createElement('div');
    toast.className = `glass-card fade-in`;
    toast.style.padding = '1rem';
    toast.style.position = 'fixed';
    toast.style.top = '1rem';
    toast.style.right = '1rem';
    toast.style.zIndex = '2000';
    toast.innerHTML = `
        <p class="mb-1"><strong>${n.sender_name}</strong> invited you to a PhotoBooth!</p>
        <div class="flex-center" style="gap: 0.5rem;">
            <button onclick="respondInvite(${data.sessionId}, 'accept', this)" class="btn btn-primary" style="padding: 0.4rem 1rem;">Accept</button>
            <button onclick="this.parentElement.parentElement.remove()" class="btn btn-secondary" style="padding: 0.4rem 1rem;">Decline</button>
        </div>
    `;
    document.body.appendChild(toast);
}

window.respondInvite = async (sessionId, action, btn) => {
    try {
        const token = await currentUser.getIdToken();
        await fetch(`${API_BASE_URL}/api/booth/respond/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action })
        });
        if (action === 'accept') {
            startSessionPolling(sessionId);
        }
        btn.parentElement.parentElement.remove();
    } catch (e) {
        showToast("Error responding to invite", "error");
    }
};

function showFollowRequest(n) {
    const toast = document.createElement('div');
    toast.className = `glass-card fade-in`;
    toast.style.padding = '1rem';
    toast.style.position = 'fixed';
    toast.style.top = '5rem';
    toast.style.right = '1rem';
    toast.style.zIndex = '2000';
    toast.innerHTML = `
        <p class="mb-1"><strong>${n.sender_name}</strong> sent a friend request!</p>
        <div class="flex-center" style="gap: 0.5rem;">
            <button onclick="respondFollowRequest('${n.sender_uid}', 'accept', this)" class="btn btn-primary" style="padding: 0.4rem 1rem;">Accept</button>
            <button onclick="respondFollowRequest('${n.sender_uid}', 'reject', this)" class="btn btn-secondary" style="padding: 0.4rem 1rem;">Reject</button>
        </div>
    `;
    document.body.appendChild(toast);
}

window.respondFollowRequest = async (senderUid, action, btn) => {
    try {
        const token = await currentUser.getIdToken();
        await fetch(`${API_BASE_URL}/api/follow/respond/${senderUid}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action })
        });
        showToast(action === 'accept' ? "Friend request accepted!" : "Friend request rejected.", "success");
        if (action === 'accept') fetchFriends();
        if (btn && btn.parentElement && btn.parentElement.parentElement) {
            btn.parentElement.parentElement.remove();
        }
        if (currentView === 'notifications') initNotifications();
    } catch (e) {
        showToast("Error responding to request", "error");
    }
};

window.followUser = async (targetUid, btn) => {
    if (!currentUser) return;
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = '...';

    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/follow/${targetUid}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            btn.innerText = 'Cancel Request';
            btn.onclick = () => cancelRequest(targetUid, btn);
            btn.className = 'btn btn-retract-now';
            btn.style.opacity = '1';
            btn.disabled = false;
            showToast("Follow request sent!", "success");
        } else {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    } catch (e) {
        btn.disabled = false;
        btn.innerText = originalText;
        showToast("Failed to follow", "error");
    }
};

window.unfollowUser = async (targetUid, btn) => {
    if (!currentUser) return;
    if (!confirm("Are you sure you want to unfriend this user?")) return;
    
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerText = '...';

    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/follow/${targetUid}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast("Removed from friends", "info");
            // Refresh lists
            fetchFriends();
            fetchAllUsers();
        } else {
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    } catch (e) {
        btn.disabled = false;
        btn.innerHTML = originalContent;
        showToast("Failed to remove friend", "error");
    }
};

window.cancelRequest = async (targetUid, btn) => {
    if (!currentUser) return;
    
    const originalText = 'Cancel Request';
    btn.disabled = true;
    btn.innerText = '...';

    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/follow/${targetUid}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast("Request cancelled", "info");
            fetchAllUsers();
        } else {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    } catch (e) {
        btn.disabled = false;
        btn.innerText = originalText;
        showToast("Failed to cancel", "error");
    }
};

async function fetchFriends(onlyActive = false) {
    if (!currentUser) return;
    try {
        const token = await currentUser.getIdToken();
        const url = onlyActive ? `${API_BASE_URL}/api/friends?active=true` : `${API_BASE_URL}/api/friends`;
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Backend response not ok");
        const friends = await res.json();
        
        if (onlyActive) {
            renderMiniFriendsList(friends);
        } else {
            renderFriendsList(friends);
        }
    } catch (e) {
        console.error("Error fetching friends:", e);
        const container = document.getElementById(onlyActive ? 'friends-mini-list' : 'friends-list');
        if (container) {
            container.innerHTML = `
                <div class="glass-card flex-center" style="grid-column: 1 / -1; height: 150px; border-style: dashed; border-color: var(--accent);">
                    <p class="text-muted" style="text-align: center;">Could not connect to backend.</p>
                </div>
            `;
        }
    }
}

function renderFriendsList(friends) {
    const container = document.getElementById('friends-list');
    if (!container) return;
    
    if (!friends || friends.length === 0) {
        container.innerHTML = `
            <div class="glass-card flex-center" style="grid-column: 1 / -1; height: 150px; border-style: dashed; border-color: rgba(255,255,255,0.1);">
                <p class="text-muted">No friends yet. Search for users above!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = friends.map(f => {
        const avatarBg = `hsl(${Math.abs(f.uid.charCodeAt(0) * 37) % 360}, 30%, 20%)`;
        const avatarHtml = (f.photo_url && f.photo_url.length > 20)
            ? `<img src="${f.photo_url}" style="width: 50px; height: 50px; border-radius: 14px; object-fit: cover;">`
            : `<div style="width: 50px; height: 50px; border-radius: 14px; background: ${avatarBg}; display: flex; align-items: center; justify-content: center; color: var(--text-muted); border: 1px solid var(--glass-border);"><i data-lucide="user" style="width: 22px;"></i></div>`;

        // Calculate Online Status (Active in last 5 mins)
        const isOnline = f.last_seen && (new Date() - new Date(f.last_seen)) < 300000;
        const statusBadge = isOnline 
            ? `<span style="color: #10b981; font-size: 0.7rem; font-weight: 700; display: flex; align-items: center; gap: 4px;"><span style="width: 6px; height: 6px; background: #10b981; border-radius: 50%;"></span> Online</span>`
            : `<span style="color: var(--text-muted); font-size: 0.7rem; font-weight: 600;">Offline</span>`;

        return `
        <div class="glass-card fade-in" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-left: 4px solid ${isOnline ? '#10b981' : 'var(--glass-border)'};">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="position: relative;">
                    ${avatarHtml}
                    ${isOnline ? `<div style="position: absolute; bottom: -2px; right: -2px; width: 12px; height: 12px; background: #10b981; border-radius: 50%; border: 2px solid var(--bg-dark);"></div>` : ''}
                </div>
                <div>
                    <p style="font-weight: 700; margin: 0; font-size: 1rem;">${f.display_name || 'Anonymous'}</p>
                    ${statusBadge}
                </div>
            </div>
            <button onclick="unfollowUser('${f.uid}', this)" class="btn btn-secondary" style="padding: 0.5rem 0.75rem; font-size: 0.8rem; border-radius: 10px;">Unfriend</button>
        </div>`;
    }).join('');
    refreshIcons();
}

function renderMiniFriendsList(friends) {
    const container = document.getElementById('friends-mini-list');
    if (!container) return;
    if (!friends || friends.length === 0) {
        container.innerHTML = `<p class="text-muted">No friends are online right now.</p>`;
        return;
    }
    container.innerHTML = friends.map(f => {
        const hasImg = (f.photo_url && f.photo_url.length > 20);
        const avatarBg = `hsl(${Math.abs(f.uid.charCodeAt(0) * 37) % 360}, 30%, 20%)`;
        
        return `
        <div class="flex-center" style="flex-direction: column; gap: 0.5rem;">
            <div style="position: relative;">
                ${hasImg 
                    ? `<img src="${f.photo_url}" style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid var(--primary); padding: 2px; object-fit: cover;">`
                    : `<div style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid var(--primary); background: ${avatarBg}; display: flex; align-items: center; justify-content: center; color: var(--text-muted);"><i data-lucide="user" style="width: 24px; height: 24px;"></i></div>`
                }
                <div style="position: absolute; bottom: 2px; right: 2px; width: 14px; height: 14px; background: #10b981; border-radius: 50%; border: 2px solid var(--bg-dark);"></div>
            </div>
            <span style="font-size: 0.8rem; font-weight: 500;">${(f.display_name || 'User').split(' ')[0]}</span>
        </div>
    `; }).join('');
    refreshIcons();
}

window.inviteFriend = async (targetUid) => {
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/booth/invite/${targetUid}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            showToast("Invitation sent! Waiting for friend...", "success");
            startSessionPolling(data.sessionId);
        }
    } catch (e) {
        showToast("Error sending invite", "error");
    }
};

function initFriends() {
    const searchInput = document.getElementById('friend-search');
    if (searchInput) {
        searchInput.oninput = debounce(async (e) => {
            const query = e.target.value.trim();
            if (query.length < 1) {
                // Reset to all users if search is cleared
                fetchAllUsers();
                return;
            }
            try {
                const res = await fetch(`${API_BASE_URL}/api/users/search?query=${encodeURIComponent(query)}`, {
                    headers: { 'Authorization': `Bearer ${await currentUser.getIdToken()}` }
                });
                const users = await res.json();
                renderSearchResults(users);
            } catch(e) {
                console.error('Search error:', e);
            }
        }, 400);
    }
    fetchFriends();
    fetchAllUsers();
}

async function fetchAllUsers() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/users/search?query=`, {
            headers: { 'Authorization': `Bearer ${await currentUser.getIdToken()}` }
        });
        if (!res.ok) throw new Error("Backend response not ok");
        const users = await res.json();
        renderSearchResults(users);
    } catch(e) {
        console.error('Error fetching all users:', e);
        const container = document.getElementById('search-results');
        if (container) {
            container.innerHTML = `
                <div class="glass-card" style="border-left: 4px solid var(--accent); padding: 1rem;">
                    <p style="margin: 0; color: var(--text-main);"><strong>Backend Disconnected</strong></p>
                    <p class="text-muted" style="margin: 0; font-size: 0.85rem;">Check if your VITE_API_URL is set in GitHub Secrets, or wait a minute for Render to wake up.</p>
                </div>
            `;
        }
    }
}

function renderSearchResults(users) {
    const container = document.getElementById('search-results');
    if (!container) return;
    if (!users || users.length === 0) {
        container.innerHTML = `<p class="text-muted" style="text-align:center; padding: 1rem; grid-column: 1/-1;">No users found.</p>`;
        return;
    }
    container.innerHTML = users.map(u => {
        let btnHtml = `<button onclick="followUser('${u.uid}', this)" class="btn btn-primary" style="padding: 0.6rem 1.2rem; border-radius: 12px; font-size: 0.85rem;">Follow</button>`;
        
        if (u.sent_status === 'pending') {
            btnHtml = `<button onclick="cancelRequest('${u.uid}', this)" class="btn btn-retract-now" style="padding: 0.6rem 1.2rem; border-radius: 12px; font-size: 0.85rem;">Cancel Request</button>`;
        } else if (u.sent_status === 'following') {
            btnHtml = `<div style="display: flex; align-items: center; gap: 0.5rem; color: var(--primary); font-weight: 600; font-size: 0.85rem;"><i data-lucide="check" style="width: 16px;"></i> Following</div>`;
        } else if (u.received_status === 'pending') {
            btnHtml = `<button onclick="respondFollowRequest('${u.uid}', 'accept', this)" class="btn btn-primary" style="padding: 0.6rem 1.2rem; border-radius: 12px; font-size: 0.85rem;">Accept Friend</button>`;
        } else if (u.sent_status === 'accepted' || u.received_status === 'accepted') {
            btnHtml = `<div style="display: flex; align-items: center; gap: 0.5rem; color: #10b981; font-weight: 600; font-size: 0.85rem;"><i data-lucide="check-circle-2" style="width: 16px;"></i> Friends</div>`;
        }

        const avatarBg = `hsl(${Math.abs(u.uid.charCodeAt(0) * 37) % 360}, 30%, 20%)`;
        const avatarHtml = (u.photo_url && u.photo_url.length > 50)
            ? `<img src="${u.photo_url}" style="width: 52px; height: 52px; border-radius: 16px; object-fit: cover;">`
            : `<div style="width: 52px; height: 52px; border-radius: 16px; background: ${avatarBg}; display: flex; align-items: center; justify-content: center; color: var(--text-muted); border: 1px solid var(--glass-border);"><i data-lucide="user" style="width: 24px;"></i></div>`;

        return `
        <div class="glass-card fade-in" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem;">
            <div style="display: flex; align-items: center; gap: 1.25rem;">
                ${avatarHtml}
                <div>
                    <p style="font-weight: 700; margin: 0; font-size: 1.05rem;">${u.display_name || 'Anonymous'}</p>
                    <p class="text-muted" style="font-size: 0.75rem; margin: 0; font-weight: 500;">${u.email || 'User'}</p>
                </div>
            </div>
            ${btnHtml}
        </div>`;
    }).join('');
    refreshIcons();
}



async function initNotifications() {
    // Clear badge
    unreadNotifCount = 0;
    const badge = document.getElementById('nav-notification-badge');
    if (badge) {
        badge.classList.add('hidden');
        badge.style.display = 'none';
        badge.textContent = '';
    }

    const container = document.getElementById('notifications-list');
    if (!container || !currentUser) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/notifications`, {
            headers: { 'Authorization': `Bearer ${await currentUser.getIdToken()}` }
        });
        const notifications = await res.json();
        
        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="flex-center" style="height: 150px; border: 2px dashed var(--border); border-radius: 12px;">
                    <p class="text-muted">No new notifications</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notifications.map(n => {
            let actionHtml = '';
            let messageText = `${n.type.replace('_', ' ')}`;
            const timeAgo = new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            if (n.type === 'booth_invite') {
                const data = JSON.parse(n.data || '{}');
                messageText = `invited you to a PhotoBooth session!`;
                actionHtml = `
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                        <button onclick="respondInvite(${data.sessionId}, 'accept', this)" class="btn btn-primary" style="padding: 0.4rem 1rem; font-size: 0.8rem; border-radius: 10px;">Accept</button>
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn btn-secondary" style="padding: 0.4rem 1rem; font-size: 0.8rem; border-radius: 10px;">Dismiss</button>
                    </div>
                `;
            } else if (n.type === 'follow_request') {
                messageText = `sent you a friend request!`;
                actionHtml = `
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                        <button onclick="respondFollowRequest('${n.sender_uid}', 'accept', this)" class="btn btn-primary" style="padding: 0.4rem 1rem; font-size: 0.8rem; border-radius: 10px;">Confirm</button>
                        <button onclick="respondFollowRequest('${n.sender_uid}', 'reject', this)" class="btn btn-secondary" style="padding: 0.4rem 1rem; font-size: 0.8rem; border-radius: 10px;">Ignore</button>
                    </div>
                `;
            }

            const avatarBg = `hsl(${Math.abs(n.sender_uid.charCodeAt(0) * 37) % 360}, 30%, 20%)`;
            const avatarHtml = (n.sender_photo && n.sender_photo.length > 50)
                ? `<img src="${n.sender_photo}" style="width: 44px; height: 44px; border-radius: 12px; object-fit: cover;">`
                : `<div style="width: 44px; height: 44px; border-radius: 12px; background: ${avatarBg}; display: flex; align-items: center; justify-content: center; color: var(--text-muted); border: 1px solid var(--glass-border);"><i data-lucide="user" style="width: 20px;"></i></div>`;

            const readActionHtml = !n.read ? `
                <button onclick="markNotificationRead(${n.id}, this)" class="btn-icon-sm" title="Mark as read" style="background: rgba(255,255,255,0.05); color: var(--primary); border: none; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
                    <i data-lucide="check" style="width: 16px;"></i>
                </button>
            ` : '';

            return `
                <div class="glass-card fade-in" style="display: flex; gap: 1rem; padding: 1rem; border-left: 4px solid ${n.read ? 'transparent' : 'var(--primary)'}; position: relative;">
                    ${avatarHtml}
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                            <p style="margin: 0; font-size: 0.95rem; line-height: 1.4;"><strong>${n.sender_name}</strong> ${messageText}</p>
                            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                                <span class="text-muted" style="font-size: 0.7rem; font-weight: 600;">${timeAgo}</span>
                                ${readActionHtml}
                            </div>
                        </div>
                        ${actionHtml}
                    </div>
                </div>
            `;
        }).join('');
        
        const clearBtn = document.getElementById('clear-notifications');
        if (clearBtn) {
            clearBtn.onclick = () => {
                container.innerHTML = `
                    <div class="flex-center" style="height: 150px; border: 2px dashed var(--border); border-radius: 12px;">
                        <p class="text-muted">No new notifications</p>
                    </div>
                `;
            };
        }
        refreshIcons();
    } catch (e) {
        console.error("Error fetching notifications:", e);
    }
}

// --- Utilities ---
async function syncProfile(user) {
    try {
        const pos = await new Promise((res, rej) => {
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 });
        }).catch(() => null);

        const token = await user.getIdToken();
        await fetch(`${API_BASE_URL}/api/profile/sync`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                uid: user.uid,
                email: user.email,
                name: user.displayName,
                photoURL: user.photoURL,
                lat: pos?.coords.latitude || null,
                lng: pos?.coords.longitude || null
            })
        });
    } catch (err) {
        console.warn("Profile sync error:", err);
    }
}

function updateUserUI() {
    const userName = document.getElementById('user-name');
    if (userName && currentUser) {
        const rawName = currentUser.displayName || currentUser.email.split('@')[0] || 'User';
        const formattedName = rawName.split(' ')[0];
        userName.innerText = formattedName.charAt(0).toUpperCase() + formattedName.slice(1).toLowerCase();
    }
    
    const recentPhotos = document.getElementById('recent-photos');
    const prints = JSON.parse(localStorage.getItem('recent_prints') || '[]');
    
    if (recentPhotos) {
        if (prints.length > 0) {
            recentPhotos.style.display = 'flex';
            recentPhotos.style.gap = '0.75rem';
            recentPhotos.style.overflowX = 'auto';
            recentPhotos.style.paddingBottom = '0.5rem';
            
            recentPhotos.innerHTML = prints.map((p, i) => `
                <div class="fade-in" style="flex: 0 0 auto; width: 100px; height: 130px; border-radius: 12px; overflow: hidden; border: 2px solid rgba(255,255,255,0.1); cursor: pointer; transition: transform 0.2s; box-shadow: var(--shadow-sm);" onclick="showPrint(${i})">
                    <img src="${p}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
            `).join('');
        } else {
            recentPhotos.innerHTML = `<p class="text-muted" style="font-size: 0.85rem;">Your gallery is empty. Head to the Studio!</p>`;
        }
    }
}

window.showPrint = (index) => {
    const prints = JSON.parse(localStorage.getItem('recent_prints') || '[]');
    const printUrl = prints[index];
    if (printUrl) {
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.background = 'rgba(15, 23, 42, 0.95)';
        modal.style.backdropFilter = 'blur(10px)';
        modal.style.zIndex = '3000';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.padding = '2rem';
        modal.innerHTML = `
            <div class="fade-in" style="position: relative; max-width: 100%; max-height: 100%; display: flex; flex-direction: column; align-items: center; gap: 1.5rem;">
                <img src="${printUrl}" style="max-width: 100%; max-height: 80vh; border: 12px solid white; border-radius: 4px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
                <div style="display: flex; gap: 1rem;">
                    <a href="${printUrl}" download="photobooth-capture.png" class="btn btn-primary" style="padding: 0.75rem 2rem; border-radius: 30px;">Download</a>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn btn-secondary" style="padding: 0.75rem 2rem; border-radius: 30px;">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        refreshIcons();
    }
};



async function initProfile() {
    if (!currentUser) return;
    const nameEl = document.getElementById('profile-name');
    const emailEl = document.getElementById('profile-email');
    const locEl = document.getElementById('profile-location');
    const joinedEl = document.getElementById('profile-joined');
    const friendsStatsEl = document.getElementById('stats-friends');
    const followersStatsEl = document.getElementById('stats-followers');
    const mutualStatsEl = document.getElementById('stats-mutual');
    const profileImg = document.getElementById('profile-img');
    const profileFallback = document.getElementById('profile-icon-fallback');

    // Initial UI state from Firebase
    nameEl.innerText = currentUser.displayName || 'Anonymous';
    emailEl.innerText = currentUser.email;
    profileImg.style.display = 'none';
    profileFallback.style.display = 'block';
    if (profileImg) {
        profileImg.onerror = () => {
            profileImg.style.display = 'none';
            profileFallback.style.display = 'block';
        };
    }

    // Fetch extra details from backend
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/profile/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data) {
            nameEl.innerText = data.display_name || currentUser.displayName || 'Anonymous';
            
            let photoToUse = (data.photo_url && data.photo_url.length > 50) ? data.photo_url : null;
            
            // Check local fallback
            if (!photoToUse) {
                const localPhoto = localStorage.getItem(`profile_photo_${currentUser.uid}`);
                if (localPhoto) photoToUse = localPhoto;
            }

            if (photoToUse) {
                profileImg.src = photoToUse;
                profileImg.style.display = 'block';
                profileFallback.style.display = 'none';
            } else {
                profileImg.style.display = 'none';
                profileFallback.style.display = 'block';
            }
            
            if (data.created_at) {
                const date = new Date(data.created_at);
                joinedEl.innerText = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            }

            if (data.stats) {
                friendsStatsEl.innerText = data.stats.friends || 0;
                followersStatsEl.innerText = data.stats.followers || 0;
                mutualStatsEl.innerText = data.stats.mutual || 0;
            }

            if (data.location_lat && data.location_lng) {
                locEl.innerText = `Lat: ${parseFloat(data.location_lat).toFixed(4)}, Lng: ${parseFloat(data.location_lng).toFixed(4)}`;
            } else {
                detectLocation(locEl);
            }
        }
    } catch (e) {
        console.error("Error fetching profile details:", e);
        detectLocation(locEl);
    }
    refreshIcons();
}

function detectLocation(el) {
    if (!el) return;
    navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        el.innerText = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        // Optionally sync back to server
    }, err => {
        el.innerText = "Location access denied";
    });
}

window.openEditModal = () => {
    const modal = document.getElementById('edit-modal');
    const nameInput = document.getElementById('edit-name');
    nameInput.value = currentUser.displayName || '';
    modal.classList.remove('hidden');
};

window.closeEditModal = () => {
    document.getElementById('edit-modal').classList.add('hidden');
};

window.saveProfileChanges = async () => {
    const newName = document.getElementById('edit-name').value;
    if (!newName) return showToast("Name cannot be empty", "error");

    try {
        const token = await currentUser.getIdToken();
        
        // 1. Update Firebase
        await currentUser.updateProfile({ displayName: newName });
        
        // 2. Update Backend
        await fetch(`${API_BASE_URL}/api/profile/update`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: newName, photoURL: currentUser.photoURL })
        });

        showToast("Profile updated!", "success");
        closeEditModal();
        initProfile();
        updateUserUI();
    } catch (e) {
        showToast("Update failed: " + e.message, "error");
    }
};

window.handleProfileUpload = async (input) => {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        return showToast("Image must be smaller than 5MB", "error");
    }

    showToast("Processing image...", "info");

    const reader = new FileReader();
    reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
            // Resize image for reliability
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Compress to JPEG
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);

            try {
                showToast("Uploading...", "info");
                const token = await currentUser.getIdToken();
                
                const res = await fetch(`${API_BASE_URL}/api/profile/update`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        name: currentUser.displayName, 
                        photoURL: compressedBase64 
                    })
                });

                if (!res.ok) {
                    const errorBody = await res.json().catch(() => ({}));
                    throw new Error(errorBody.error || "Server rejected the image (check size or connection)");
                }

                showToast("Profile image updated!", "success");
                
                // Persistence fallback
                localStorage.setItem(`profile_photo_${currentUser.uid}`, compressedBase64);
                
                // Immediate local UI update
                const profileImg = document.getElementById('profile-img');
                const profileFallback = document.getElementById('profile-icon-fallback');
                if (profileImg && profileFallback) {
                    profileImg.src = compressedBase64;
                    profileImg.style.display = 'block';
                    profileFallback.style.display = 'none';
                }
                
                // Refresh data from server to ensure sync
                setTimeout(() => initProfile(), 1000); 
            } catch (err) {
                console.error(err);
                showToast("Upload failed: " + err.message, "error");
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
};

function showToast(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `glass-card fade-in toast toast-${type}`;
    toast.style.cssText = `
        padding: 0.75rem 1.25rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 500;
        font-size: 0.9rem;
        border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : 'var(--primary)'};
        pointer-events: auto;
        min-width: 200px;
    `;

    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
    toast.innerHTML = `
        <i data-lucide="${icon}" style="width: 18px; color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : 'var(--primary)'};"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// --- Notifications Logic ---
async function fetchNotifications() {
    if (!currentUser) return;
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const notifications = await res.json();
        
        const badge = document.getElementById('nav-notification-badge');
        const unreadCount = notifications.filter(n => !n.read).length;
        
        if (unreadCount > 0) {
            if (badge) {
                badge.innerText = unreadCount > 9 ? '9+' : unreadCount;
                badge.classList.remove('hidden');
            }
        } else {
            if (badge) badge.classList.add('hidden');
        }
        
        return notifications;
    } catch (e) {
        console.error("Failed to fetch notifications:", e);
    }
}

// Duplicates removed

window.clearAllNotifications = async () => {
    if (!confirm("Clear all notifications?")) return;
    try {
        const token = await currentUser.getIdToken();
        await fetch(`${API_BASE_URL}/api/notifications`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        initNotifications();
    } catch (e) {}
};

window.markNotificationRead = async (id, btn) => {
    if (!id || id === 0) return; // Ignore local/special notifications for now
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            if (btn) {
                const card = btn.closest('.glass-card');
                if (card) card.style.borderLeftColor = 'transparent';
                btn.remove();
            }
            fetchNotifications(); // Refresh badge
        }
    } catch (e) {
        console.error("Error marking as read:", e);
    }
};

// --- Authentication Handlers ---
window.handleGoogleLogin = async () => {
    console.log("🟡 Google Login triggered");
    try {
        await auth.signInWithPopup(provider);
        console.log("✅ Google Login success");
    } catch (err) {
        console.error("❌ Google Login error:", err);
        showToast(err.message, "error");
    }
};

window.handleLogout = async () => {
    try {
        await auth.signOut();
        showToast("Logged out successfully", "success");
    } catch (err) {
        showToast("Logout failed", "error");
    }
};

// DUPLICATES REMOVED - EOF
// Initialized
console.log("✨ PhotoBooth System — Fully Operational");
init();
