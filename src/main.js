import './style.css';
import { createIcons, Menu, Camera, Users, LogOut, Bell, User, MapPin, X, Check, Heart, Share2 } from 'lucide-static';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

// --- Configuration ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyABJZRDkwNTs0Ujs2wpnSSmNMlY4uinKNo",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "francisco-61572.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "francisco-61572",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "francisco-61572.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "333100224160",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:333100224160:web:4887376c6c59b66c433a75"
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3010'; // Dynamically switch API URL

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// App State
let currentUser = null;
let currentView = 'login';
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
            syncProfile(user);
            showView('dashboard');
            navElement.classList.remove('hidden');
            updateUserUI();
            fetchFriends(); // Fetch friends when user is logged in
        } else {
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
        }

        if (e.target.closest('#logout-btn')) {
            auth.signOut();
        }

        if (e.target.closest('#menu-toggle')) {
            const navLinks = document.querySelector('.nav-links');
            navLinks.classList.toggle('active');
        }
    });
}

function refreshIcons() {
    createIcons({
        icons: { Menu, Camera, Users, LogOut, Bell, User, MapPin, X, Check, Heart, Share2 }
    });
}

// --- Routing & Views ---
function showView(view) {
    currentView = view;
    const template = document.getElementById(`view-${view}`);
    
    if (template) {
        contentElement.innerHTML = '';
        contentElement.appendChild(template.content.cloneNode(true));
        
        // View specific initialization
        if (view === 'booth') initBooth();
        if (view === 'friends') initFriends();
        if (view === 'profile') initProfile();
        
        window.scrollTo(0, 0);
        refreshIcons();
    } else {
        // Fallback for dynamic views
        renderDynamicView(view);
    }
}

function renderDynamicView(view) {
    if (view === 'booth') {
        contentElement.innerHTML = `
            <div class="fade-in mt-2">
                <header class="flex-center mb-2" style="justify-content: space-between;">
                   <div>
                      <h1 style="font-family: 'Outfit', sans-serif;">PhotoBooth</h1>
                      <p class="text-muted">Capture the moment</p>
                   </div>
                   <button data-link="dashboard" class="btn btn-secondary"><i data-lucide="x"></i></button>
                </header>

                <div class="glass-card" style="padding: 1rem; max-width: 800px; margin: 0 auto;">
                    <div class="camera-preview mb-1">
                        <video id="camera-feed" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
                        <div id="countdown" class="flex-center" style="position: absolute; inset: 0; font-size: 8rem; font-weight: 800; color: white; display: none; text-shadow: 0 0 20px rgba(0,0,0,0.5);">3</div>
                        <canvas id="photo-canvas" style="display: none;"></canvas>
                    </div>

                    <div id="captured-strips" class="flex-center mb-1" style="gap: 0.5rem; flex-wrap: wrap;"></div>

                    <div class="flex-center" style="gap: 1rem;">
                        <button id="shutter-btn" class="shutter-btn"></button>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            <button id="mode-strip" class="btn btn-secondary active" style="font-size: 0.8rem;">Classic Strip</button>
                            <button id="mode-postcard" class="btn btn-secondary" style="font-size: 0.8rem;">Postcard</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        initBooth();
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

async function initBooth() {
    const video = document.getElementById('camera-feed');
    const shutter = document.getElementById('shutter-btn');
    const capturedContainer = document.getElementById('captured-strips');
    
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        video.srcObject = mediaStream;
    } catch (err) {
        showToast("Camera access denied!", "error");
        showView('dashboard');
        return;
    }

    // Get Location
    navigator.geolocation.getCurrentPosition(pos => {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    });

    if (activeSession) {
        shutter.innerText = "Start Shared Session";
        shutter.style.width = "auto";
        shutter.style.borderRadius = "30px";
        shutter.style.padding = "1rem 2rem";
        
        // Start polling for session status (wait for both to be in booth)
        const checkReady = setInterval(async () => {
            if (activeSession.status === 'capturing') {
                clearInterval(checkReady);
                startCaptureSequence();
            }
        }, 2000);
    }

    shutter.onclick = async () => {
        if (activeSession) {
            // Signal to start capturing
            const token = await currentUser.getIdToken();
            await fetch(`${API_BASE_URL}/api/booth/session/${activeSession.id}/start`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } else {
            startCaptureSequence();
        }
    };
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
    localStorage.setItem('recent_print', dataUrl);
    
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
setInterval(async () => {
    if (currentUser) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications`, {
                headers: { 'Authorization': `Bearer ${await currentUser.getIdToken()}` }
            });
            const notifications = await res.json();
            notifications.forEach(n => {
                if (!localStorage.getItem(`notif_${n.id}`)) {
                    if (n.type === 'booth_invite') {
                        showBoothInvite(n);
                    } else {
                        showToast(`${n.sender_name}: ${n.type.replace('_', ' ')}`, 'info');
                    }
                    localStorage.setItem(`notif_${n.id}`, 'true');
                }
            });
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

window.followUser = async (targetUid) => {
    try {
        const token = await currentUser.getIdToken();
        await fetch(`${API_BASE_URL}/api/follow/${targetUid}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        showToast("Follow request sent!", "success");
    } catch (e) {
        showToast("Error sending request", "error");
    }
};

async function fetchFriends() {
    if (!currentUser) return;
    try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_BASE_URL}/api/friends`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const friends = await res.json();
        renderFriendsList(friends);
        renderMiniFriendsList(friends);
    } catch (e) {
        console.error("Error fetching friends:", e);
    }
}

function renderFriendsList(friends) {
    const container = document.getElementById('friends-list');
    if (!container) return;
    
    if (friends.length === 0) {
        container.innerHTML = `
            <div class="glass-card flex-center" style="grid-column: 1 / -1; height: 150px; border-style: dashed;">
                <p class="text-muted">No friends added yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = friends.map(f => `
        <div class="glass-card" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem;">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <img src="${f.photo_url || 'https://via.placeholder.com/40'}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover;">
                <div>
                    <p style="font-weight: 600;">${f.display_name}</p>
                    <p class="text-muted" style="font-size: 0.8rem;">Ready to snap</p>
                </div>
            </div>
            <button onclick="inviteFriend('${f.uid}')" class="btn btn-primary" style="padding: 0.5rem 1rem;">Invite</button>
        </div>
    `).join('');
}

function renderMiniFriendsList(friends) {
    const container = document.getElementById('friends-mini-list');
    if (!container) return;

    if (friends.length === 0) {
        container.innerHTML = `<p class="text-muted">Follow some friends to see them here.</p>`;
        return;
    }

    container.innerHTML = `
        <div style="display: flex; gap: 1rem; overflow-x: auto; width: 100%; padding-bottom: 0.5rem;">
            ${friends.map(f => `
                <div class="flex-center" style="flex-direction: column; min-width: 80px; cursor: pointer;" onclick="inviteFriend('${f.uid}')">
                    <div style="position: relative;">
                        <img src="${f.photo_url || 'https://via.placeholder.com/40'}" style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid var(--primary); padding: 2px;">
                        <div style="position: absolute; bottom: 5px; right: 5px; width: 12px; height: 12px; background: #10b981; border-radius: 50%; border: 2px solid var(--bg-card);"></div>
                    </div>
                    <span style="font-size: 0.75rem; margin-top: 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70px;">${f.display_name.split(' ')[0]}</span>
                </div>
            `).join('')}
        </div>
    `;
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
            const query = e.target.value;
            if (query.length < 3) return;
            
            const res = await fetch(`${API_BASE_URL}/api/users/search?query=${query}`, {
                headers: { 'Authorization': `Bearer ${await currentUser.getIdToken()}` }
            });
            const users = await res.json();
            renderSearchResults(users);
        }, 500);
    }
    fetchFriends();
}

function renderSearchResults(users) {
    const container = document.getElementById('search-results');
    container.innerHTML = users.map(u => `
        <div class="glass-card" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem;">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <img src="${u.photo_url}" style="width: 40px; height: 40px; border-radius: 50%;">
                <span>${u.display_name}</span>
            </div>
            <button onclick="followUser('${u.uid}')" class="btn btn-primary" style="padding: 0.5rem 1rem;">Follow</button>
        </div>
    `).join('');
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
    if (userName && currentUser) userName.innerText = currentUser.displayName.split(' ')[0];
    
    const recentPhotos = document.getElementById('recent-photos');
    const lastPrint = localStorage.getItem('recent_print');
    if (recentPhotos && lastPrint) {
        recentPhotos.innerHTML = `<img src="${lastPrint}" style="height: 100%; border-radius: 8px; cursor: pointer;" onclick="showLastPrint()">`;
    }
}

window.showLastPrint = () => {
    const lastPrint = localStorage.getItem('recent_print');
    if (lastPrint) {
        // Create a temporary modal to show the print
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.background = 'rgba(0,0,0,0.9)';
        modal.style.zIndex = '3000';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.padding = '2rem';
        modal.innerHTML = `
            <div style="position: relative; max-width: 100%; max-height: 100%;">
                <img src="${lastPrint}" style="max-width: 100%; max-height: 90vh; border: 10px solid white; box-shadow: 0 0 50px rgba(0,0,0,0.5);">
                <button onclick="this.parentElement.parentElement.remove()" class="btn btn-secondary" style="position: absolute; top: -2rem; right: -2rem; border-radius: 50%; width: 40px; height: 40px; padding: 0;"><i data-lucide="x"></i></button>
            </div>
        `;
        document.body.appendChild(modal);
        refreshIcons();
    }
};

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `glass-card fade-in`;
    toast.style.padding = '0.75rem 1.5rem';
    toast.style.marginBottom = '0.5rem';
    toast.style.borderLeft = `4px solid ${type === 'error' ? 'var(--accent)' : 'var(--primary)'}`;
    toast.innerHTML = `<p>${message}</p>`;
    notificationContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function initProfile() {
    if (!currentUser) return;
    const nameEl = document.getElementById('profile-name');
    const emailEl = document.getElementById('profile-email');
    const imgEl = document.getElementById('profile-img');
    const locEl = document.getElementById('profile-location');

    nameEl.innerText = currentUser.displayName;
    emailEl.innerText = currentUser.email;
    imgEl.src = currentUser.photoURL || 'https://via.placeholder.com/150';

    if (userLocation) {
        locEl.innerText = `Lat: ${userLocation.lat.toFixed(4)}, Lng: ${userLocation.lng.toFixed(4)}`;
    } else {
        navigator.geolocation.getCurrentPosition(pos => {
            userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            if (locEl) locEl.innerText = `Lat: ${userLocation.lat.toFixed(4)}, Lng: ${userLocation.lng.toFixed(4)}`;
        });
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Start
init();

// Google Login Export
window.handleGoogleLogin = async () => {
    try {
        await auth.signInWithPopup(provider);
    } catch (err) {
        showToast(err.message, "error");
    }
};

document.addEventListener('click', e => {
    if (e.target.closest('#google-login')) {
        window.handleGoogleLogin();
    }
});
