// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBnysGMTtMQo0RbmEMjFPhBjZVLzovbgaA",
    authDomain: "projeto-codm-hub.firebaseapp.com",
    databaseURL: "https://projeto-codm-hub-default-rtdb.firebaseio.com",
    projectId: "projeto-codm-hub",
    storageBucket: "projeto-codm-hub.firebasestorage.app",
    messagingSenderId: "1038952355133",
    appId: "1:1038952355133:web:18f011328d2e111316a154"
};

let db = null;
let auth = null;
let lobbiesRef = null;
let rankingRef = null;
let usersRef = null;
let teamsRef = null;
let postsRef = null;

let currentUser = null;
let currentUserProfile = null;
let currentViewingUserUid = null;
let isAdmin = false;
const ADMIN_SECRET_PASSWORD = "lobark2026";

let lobbies = [];
let teamsRanking = [];
let registeredTeams = [];
let posts = [];
let allProfiles = {};

document.addEventListener('DOMContentLoaded', () => {
    initParticles();

    try {
        if (typeof firebase !== 'undefined') {
            if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
            db = firebase.database();
            auth = firebase.auth();
            
            lobbiesRef = db.ref('lobbies');
            rankingRef = db.ref('ranking');
            usersRef = db.ref('users');
            teamsRef = db.ref('teams');
            postsRef = db.ref('posts');

            listenToAuth();
            listenToFirebase();
        }
    } catch (e) {
        console.error("Erro na inicialização do Firebase:", e);
    }
});

function listenToAuth() {
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        const guestView = document.getElementById('auth-guest-view');
        const userView = document.getElementById('auth-user-view');
        const userDisplayName = document.getElementById('user-display-name');

        if (user) {
            guestView.style.display = 'none';
            userView.style.display = 'flex';
            
            db.ref(`users/${user.uid}/isOnline`).set(true);
            db.ref(`users/${user.uid}/isOnline`).onDisconnect().set(false);

            usersRef.child(user.uid).on('value', (snapshot) => {
                currentUserProfile = snapshot.val();
                if (currentUserProfile && currentUserProfile.nick) {
                    userDisplayName.innerText = currentUserProfile.nick;
                } else {
                    userDisplayName.innerText = user.email.split('@')[0];
                }
            });
        } else {
            guestView.style.display = 'block';
            userView.style.display = 'none';
            currentUserProfile = null;
        }
    });
}

function listenToFirebase() {
    lobbiesRef.on('value', (s) => {
        lobbies = [];
        if (s.val()) Object.keys(s.val()).forEach(k => lobbies.push({ firebaseKey: k, ...s.val()[k] }));
        renderLobbies();
    });

    rankingRef.on('value', (s) => {
        teamsRanking = [];
        if (s.val()) Object.keys(s.val()).forEach(k => teamsRanking.push({ firebaseKey: k, ...s.val()[k] }));
        renderRanking();
    });

    teamsRef.on('value', (s) => {
        registeredTeams = [];
        if (s.val()) Object.keys(s.val()).forEach(k => registeredTeams.push({ firebaseKey: k, ...s.val()[k] }));
        renderTeams();
    });

    postsRef.on('value', (s) => {
        posts = [];
        if (s.val()) Object.keys(s.val()).forEach(k => posts.push({ firebaseKey: k, ...s.val()[k] }));
        renderPosts();
    });

    usersRef.on('value', (s) => {
        allProfiles = s.val() || {};
        renderOnlinePlayers();
    });
}

// FEED DE PUBLICAÇÕES
function renderPosts() {
    const container = document.getElementById('posts-container');
    if (!container) return;
    container.innerHTML = '';

    if (posts.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding: 30px;">Nenhum clipe ou publicação no feed ainda.</p>`;
        return;
    }

    [...posts].reverse().forEach(post => {
        const card = document.createElement('div');
        card.className = 'post-card glass-panel';
        card.innerHTML = `
            <div class="post-header">
                <div class="post-avatar"><i class="fa-solid fa-user"></i></div>
                <strong style="cursor:pointer;" onclick="viewPlayerProfileByNick('${post.author}')">${post.author}</strong>
            </div>
            <img src="${post.imageUrl}" class="post-image" alt="Post">
            <div class="post-actions">
                <i class="fa-regular fa-heart" onclick="likePost('${post.firebaseKey}')"></i>
                <i class="fa-regular fa-comment"></i>
            </div>
            <div class="post-caption">
                <strong>${post.author}:</strong> ${post.caption}
            </div>
        `;
        container.appendChild(card);
    });
}

function handleCreatePost(e) {
    e.preventDefault();
    if (!currentUserProfile || !currentUserProfile.nick) return alert("Configure seu Nick no seu perfil antes de publicar algo.");

    const caption = document.getElementById('post-caption').value;
    const imageUrl = document.getElementById('post-image-url').value;

    postsRef.push({ 
        author: currentUserProfile.nick, 
        caption, 
        imageUrl, 
        likes: 0,
        createdAt: Date.now()
    }).then(() => {
        document.getElementById('post-caption').value = '';
        document.getElementById('post-image-url').value = '';
        closeModal('create-post');
    });
}

// PERFIL PRO & INSTAGRAM
function viewPlayerProfileByNick(nick) {
    let foundUid = null;
    let foundProfile = null;

    Object.keys(allProfiles).forEach(uid => {
        if (allProfiles[uid].nick && allProfiles[uid].nick.toLowerCase() === nick.toLowerCase()) {
            foundUid = uid;
            foundProfile = allProfiles[uid];
        }
    });

    currentViewingUserUid = foundUid;

    if (foundProfile) {
        document.getElementById('view-profile-nick').innerText = foundProfile.nick;
        document.getElementById('view-profile-kd').innerText = foundProfile.kd || '0.00';
        document.getElementById('view-profile-peak-viewers').innerText = foundProfile.peakViewers ? parseInt(foundProfile.peakViewers).toLocaleString('pt-BR') : '0';
        document.getElementById('view-profile-earnings').innerText = foundProfile.earnings ? foundProfile.earnings : '$0';
        document.getElementById('view-profile-bio').innerText = foundProfile.bio || 'Jogador oficial de CODM.';
        document.getElementById('view-profile-role').innerText = 'Role: ' + (foundProfile.role || 'Flex');
        document.getElementById('view-profile-device').innerHTML = `<i class="fa-solid fa-mobile-screen"></i> ${foundProfile.device || 'Dispositivo N/I'}`;
        
        document.getElementById('gear-device').innerText = foundProfile.device || 'iPad Pro 12.9"';
        document.getElementById('gear-hud').innerText = foundProfile.hud || '4 Dedos (Garra)';

        document.getElementById('view-profile-status-dot').className = foundProfile.isOnline ? 'status-indicator online' : 'status-indicator offline';
    } else {
        document.getElementById('view-profile-nick').innerText = nick;
        document.getElementById('view-profile-kd').innerText = 'N/A';
        document.getElementById('view-profile-peak-viewers').innerText = '0';
        document.getElementById('view-profile-earnings').innerText = '$0';
        document.getElementById('view-profile-bio').innerText = 'Perfil sem estatísticas registradas.';
        document.getElementById('view-profile-status-dot').className = 'status-indicator offline';
    }

    const adminControls = document.getElementById('admin-player-controls');
    if (adminControls) adminControls.style.display = (isAdmin && foundUid) ? 'block' : 'none';

    switchTab('profile');
}

function switchProfileSubTab(sub) {
    document.querySelectorAll('.p-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.profile-sub-content').forEach(c => c.classList.remove('active'));

    document.getElementById(`ptab-${sub}`).classList.add('active');
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}

function handleSaveProfile(e) {
    e.preventDefault();
    if (!currentUser) return alert("Faça login primeiro.");

    const nick = document.getElementById('edit-nick').value.trim();
    const kd = document.getElementById('edit-kd').value.trim();
    const role = document.getElementById('edit-role').value;
    const device = document.getElementById('edit-device').value.trim();
    const peakViewers = document.getElementById('edit-peak-viewers').value;
    const earnings = document.getElementById('edit-earnings').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();

    usersRef.child(currentUser.uid).update({
        nick, kd, role, device, peakViewers, earnings, bio, isOnline: true
    }).then(() => {
        closeModal('edit-profile');
        viewPlayerProfileByNick(nick);
    });
}

// RENDERIZADORES DE TABS
function renderOnlinePlayers() {
    const container = document.getElementById('online-players-grid');
    const badge = document.getElementById('online-count-badge');
    if (!container) return;
    container.innerHTML = '';
    let onlineCount = 0;

    Object.keys(allProfiles).forEach(uid => {
        const p = allProfiles[uid];
        if (p.isOnline) {
            onlineCount++;
            const card = document.createElement('div');
            card.className = 'card glass-panel';
            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
                    <span class="status-indicator online"></span>
                    <h3 style="font-family: var(--font-heading);">${p.nick || 'Jogador'}</h3>
                </div>
                <button class="btn-secondary btn-block" onclick="viewPlayerProfileByNick('${p.nick}')">Ver Perfil</button>
            `;
            container.appendChild(card);
        }
    });
    if (badge) badge.innerText = onlineCount;
}

function renderTeams() {
    const container = document.getElementById('teams-grid');
    if (!container) return;
    container.innerHTML = '';

    registeredTeams.forEach(team => {
        const card = document.createElement('div');
        card.className = 'card glass-panel';
        card.innerHTML = `
            <span class="badge badge-${team.tier ? team.tier.toLowerCase() : 't3'}">${team.tier || 'T3'}</span>
            <h3 style="font-family: var(--font-heading); margin-top:8px;">${team.name}</h3>
            <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:5px;">${team.desc || 'Sem descrição.'}</p>
            <button class="btn-primary btn-block" style="margin-top:15px;" onclick="openTeamDetails('${team.firebaseKey}')">Detalhes & Lineup</button>
        `;
        container.appendChild(card);
    });
}

function openTeamDetails(key) {
    const team = registeredTeams.find(t => t.firebaseKey === key);
    if (!team) return;
    document.getElementById('modal-team-title').innerText = team.name;
    document.getElementById('modal-team-body').innerHTML = `
        <p><strong>Tier:</strong> ${team.tier}</p>
        <p><strong>Descrição:</strong> ${team.desc || 'Nenhuma'}</p>
        <div style="margin-top:15px;">
            <h4>Lineup Oficial:</h4>
            <p style="color:var(--accent); font-weight:bold; margin-top:5px;">${team.roster || 'Não informada'}</p>
        </div>
    `;
    openModal('team-details');
}

function handleCreateTeam(e) {
    e.preventDefault();
    teamsRef.push({
        name: document.getElementById('team-name').value,
        tier: document.getElementById('team-tier').value,
        desc: document.getElementById('team-desc').value,
        roster: document.getElementById('team-roster').value
    }).then(() => {
        closeModal('create-team');
    });
}

function renderLobbies() {
    const container = document.getElementById('lobbies-container');
    if (!container) return;
    container.innerHTML = '';

    lobbies.forEach(lobby => {
        const card = document.createElement('div');
        card.className = 'card glass-panel';
        card.innerHTML = `
            <span class="badge ${lobby.type === 'X1' ? 'badge-x1' : 'badge-t3'}">${lobby.type}</span>
            <h3 style="font-family: var(--font-heading); margin-top:8px;">${lobby.team}</h3>
            <p style="margin-top:5px; font-size:0.9rem;">⏰ Horário: ${lobby.time}</p>
            ${lobby.mode ? `<p style="font-size:0.85rem; color:var(--text-secondary);">Regras: ${lobby.mode}</p>` : ''}
            <button class="btn-primary btn-block" style="margin-top:12px;" onclick="acceptChallenge('${lobby.firebaseKey}')">
                ${lobby.challenger ? 'Desafiado por ' + lobby.challenger : 'Aceitar Desafio'}
            </button>
        `;
        container.appendChild(card);
    });
}

function renderRanking() {
    const tbody = document.getElementById('ranking-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    teamsRanking.sort((a, b) => (b.wins || 0) - (a.wins || 0));
    teamsRanking.forEach((team, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${index + 1}</td>
            <td><strong>${team.name}</strong></td>
            <td><span class="badge badge-t3">${team.tier || 'T3'}</span></td>
            <td>${team.wins || 0}</td>
            <td>${team.losses || 0}</td>
            <td>100%</td>
            <td>500</td>
            <td><button class="btn-outline" style="padding:2px 6px; font-size:0.7rem;">Ver</button></td>
        `;
        tbody.appendChild(row);
    });
}

function handleCreateScrim(e) {
    e.preventDefault();
    lobbiesRef.push({
        type: document.getElementById('scrim-type').value,
        time: document.getElementById('scrim-time').value,
        team: document.getElementById('scrim-team-name').value,
        lineup: [
            document.getElementById('p1').value, 
            document.getElementById('p2').value, 
            document.getElementById('p3').value, 
            document.getElementById('p4').value, 
            document.getElementById('p5').value
        ]
    }).then(() => closeModal('scrim'));
}

function handleCreateX1(e) {
    e.preventDefault();
    lobbiesRef.push({
        type: 'X1',
        time: document.getElementById('x1-time').value,
        team: `${document.getElementById('x1-player').value} (X1)`,
        mode: document.getElementById('x1-mode').value
    }).then(() => closeModal('x1'));
}

// AUTENTICAÇÃO E ADMIN
function handleGoogleLogin() { 
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(() => closeModal('auth')); 
}

function handleEmailAuth(e) { 
    e.preventDefault(); 
    auth.signInWithEmailAndPassword(
        document.getElementById('auth-email').value, 
        document.getElementById('auth-password').value
    ).then(() => closeModal('auth')); 
}

function handleRegister() { 
    auth.createUserWithEmailAndPassword(
        document.getElementById('auth-email').value, 
        document.getElementById('auth-password').value
    ).then(() => closeModal('auth')); 
}

function handleLogout() { 
    auth.signOut(); 
}

function toggleAdminMode() {
    if (prompt("Senha ADM:") === ADMIN_SECRET_PASSWORD) { 
        isAdmin = true; 
        atualizarInterfaceAdmin(); 
    }
}

function atualizarInterfaceAdmin() { 
    document.getElementById('role-label').innerText = isAdmin ? 'ADMINISTRADOR' : 'JOGADOR'; 
    renderLobbies(); 
}

function adminBanPlayer() { 
    if (isAdmin && confirm("Tem certeza que deseja banir este jogador?")) {
        usersRef.child(currentViewingUserUid).remove().then(() => switchTab('online')); 
    }
}

// UTILITÁRIOS DA INTERFACE
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

function acceptChallenge(key) { 
    const team = prompt("Digite o nome da sua equipe para aceitar:"); 
    if (team) lobbiesRef.child(key).update({ challenger: team }); 
}

function openModal(t) { document.getElementById(`modal-${t}`).classList.add('active'); }
function closeModal(t) { document.getElementById(`modal-${t}`).classList.remove('active'); }

// PARTICULAS NO BACKGROUND
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    
    const particles = Array.from({ length: 30 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5
    }));

    function draw() {
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => {
            p.x += p.vx; 
            p.y += p.vy;
            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;
            ctx.beginPath(); 
            ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2); 
            ctx.fillStyle = '#00f3ff'; 
            ctx.globalAlpha = 0.3; 
            ctx.fill();
        });
        requestAnimationFrame(draw);
    }
    draw();
}