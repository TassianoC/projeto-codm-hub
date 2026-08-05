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

let currentUser = null;
let currentUserProfile = null;
let activeViewingUid = null; // Guarda de qual jogador o perfil está sendo exibido
let isAdmin = false;
const ADMIN_SECRET_PASSWORD = "lobark2026";

let lobbies = [];
let teamsRanking = [];
let registeredTeams = [];
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

            listenToAuth();
            listenToFirebase();
        }
    } catch (e) {
        console.error("Erro no Firebase:", e);
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
            
            // Marca usuário como Online no Firebase Realtime Database
            db.ref(`users/${user.uid}/isOnline`).set(true);
            db.ref(`users/${user.uid}/isOnline`).onDisconnect().set(false);

            usersRef.child(user.uid).on('value', (snapshot) => {
                currentUserProfile = snapshot.val() || {};
                userDisplayName.innerText = currentUserProfile.nick || user.email.split('@')[0];
                
                // Se não estiver navegando pelo perfil de outro player, exibe o meu perfil
                if (!activeViewingUid || activeViewingUid === user.uid) {
                    renderUserProfile(user.uid);
                }
            });
        } else {
            guestView.style.display = 'block';
            userView.style.display = 'none';
            currentUserProfile = null;
            if (activeViewingUid) renderUserProfile(activeViewingUid);
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

    usersRef.on('value', (s) => {
        allProfiles = s.val() || {};
        renderOnlinePlayers();
        renderAllPlayersTab();
        
        // Atualiza a visualização da tela de perfil atual
        if (activeViewingUid) renderUserProfile(activeViewingUid);
        else if (currentUser) renderUserProfile(currentUser.uid);
    });
}

// CARREGA QUALQUER PERFIL ESPECÍFICO POR UID
function renderUserProfile(targetUid) {
    activeViewingUid = targetUid;
    const profile = allProfiles[targetUid] || {};
    const isOwner = currentUser && currentUser.uid === targetUid;

    // Controla o Banner de Visita
    const visitorBanner = document.getElementById('profile-visitor-banner');
    if (!isOwner && currentUser) {
        visitorBanner.style.display = 'block';
        document.getElementById('visitor-player-name').innerText = profile.nick || 'Jogador';
    } else {
        visitorBanner.style.display = 'none';
    }

    // Avatar / Foto de Perfil
    const avatarImg = document.getElementById('profile-avatar-img');
    const avatarDefault = document.getElementById('profile-default-icon');
    if (profile.avatarUrl) {
        avatarImg.src = profile.avatarUrl;
        avatarImg.style.display = 'block';
        avatarDefault.style.display = 'none';
    } else {
        avatarImg.style.display = 'none';
        avatarDefault.style.display = 'block';
    }

    // Informações Básicas
    document.getElementById('view-profile-nick').innerText = profile.nick || (isOwner ? 'Seu Nick' : 'Jogador Anônimo');
    document.getElementById('view-profile-kd').innerText = profile.kd || '0.00';
    document.getElementById('view-profile-peak-viewers').innerText = profile.peakViewers ? parseInt(profile.peakViewers).toLocaleString('pt-BR') : '0';
    document.getElementById('view-profile-earnings').innerText = profile.earnings || '$0';
    document.getElementById('view-profile-bio').innerText = profile.bio || 'Biografia não cadastrada.';
    document.getElementById('view-profile-role').innerText = 'Role: ' + (profile.role || 'Flex');
    document.getElementById('view-profile-device').innerHTML = `<i class="fa-solid fa-mobile-screen"></i> ${profile.device || 'Dispositivo N/I'}`;
    document.getElementById('view-profile-hud').innerHTML = `<i class="fa-solid fa-hand"></i> ${profile.hud || 'HUD N/I'}`;
    
    document.getElementById('gear-device').innerText = profile.device || 'N/I';
    document.getElementById('gear-hud').innerText = profile.hud || 'N/I';
    document.getElementById('gear-sens-cam').innerText = profile.sensCam || 'N/I';
    document.getElementById('gear-sens-scope').innerText = profile.sensScope || 'N/I';

    document.getElementById('view-profile-status-dot').className = profile.isOnline ? 'status-indicator online' : 'status-indicator offline';

    // Apenas o próprio dono pode ver os botões de editar e criar posts
    const btnEdit = document.getElementById('btn-edit-my-profile');
    const btnCreatePost = document.getElementById('btn-create-my-post');
    if (btnEdit) btnEdit.style.display = isOwner ? 'inline-flex' : 'none';
    if (btnCreatePost) btnCreatePost.style.display = isOwner ? 'inline-flex' : 'none';

    if (isOwner) {
        document.getElementById('edit-avatar-url').value = profile.avatarUrl || '';
        document.getElementById('edit-nick').value = profile.nick || '';
        document.getElementById('edit-role').value = profile.role || 'Flex';
        document.getElementById('edit-kd').value = profile.kd || '';
        document.getElementById('edit-device').value = profile.device || '';
        document.getElementById('edit-hud').value = profile.hud || '';
        document.getElementById('edit-sens-cam').value = profile.sensCam || '';
        document.getElementById('edit-sens-scope').value = profile.sensScope || '';
        document.getElementById('edit-peak-viewers').value = profile.peakViewers || '';
        document.getElementById('edit-earnings').value = profile.earnings || '';
        document.getElementById('edit-bio').value = profile.bio || '';
    }

    renderProfileFeed(profile.posts || {}, targetUid);
}

// RETORNAR AO MEU PRÓPRIO PERFIL
function viewMyOwnProfile() {
    if (!currentUser) return openModal('auth');
    renderUserProfile(currentUser.uid);
    switchTab('profile');
}

// RENDERIZA O FEED NO GRID ESTILO INSTAGRAM
function renderProfileFeed(postsObject, targetUid) {
    const grid = document.getElementById('my-feed-grid');
    const postsCountLabel = document.getElementById('view-profile-posts-count');
    if (!grid) return;
    grid.innerHTML = '';

    const postKeys = Object.keys(postsObject);
    if (postsCountLabel) postsCountLabel.innerText = postKeys.length;

    if (postKeys.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">
            <i class="fa-solid fa-camera" style="font-size:2rem; margin-bottom:10px;"></i>
            <p>Nenhuma publicação ou mídia adicionada ao feed ainda.</p>
        </div>`;
        return;
    }

    postKeys.reverse().forEach(key => {
        const post = postsObject[key];
        const item = document.createElement('div');
        item.className = 'insta-grid-item';

        const isVideo = post.type === 'video';
        const mediaHtml = isVideo 
            ? `<video src="${post.mediaUrl}" muted></video>` 
            : `<img src="${post.mediaUrl}" alt="Mídia">`;

        item.innerHTML = `
            <span class="media-type-icon"><i class="fa-solid ${isVideo ? 'fa-video' : 'fa-image'}"></i></span>
            ${mediaHtml}
            <div class="grid-overlay" onclick="openPostModal('${targetUid}', '${key}')">
                <i class="fa-solid fa-heart"></i> ${post.likes || 0}
                <p style="font-size:0.75rem; color:#ddd;">${post.caption}</p>
            </div>
        `;
        grid.appendChild(item);
    });
}

function handleSaveProfile(e) {
    e.preventDefault();
    if (!currentUser) return alert("Faça login para salvar as alterações do seu perfil.");

    usersRef.child(currentUser.uid).update({
        avatarUrl: document.getElementById('edit-avatar-url').value.trim(),
        nick: document.getElementById('edit-nick').value.trim(),
        role: document.getElementById('edit-role').value,
        kd: document.getElementById('edit-kd').value.trim(),
        device: document.getElementById('edit-device').value.trim(),
        hud: document.getElementById('edit-hud').value.trim(),
        sensCam: document.getElementById('edit-sens-cam').value.trim(),
        sensScope: document.getElementById('edit-sens-scope').value.trim(),
        peakViewers: document.getElementById('edit-peak-viewers').value,
        earnings: document.getElementById('edit-earnings').value.trim(),
        bio: document.getElementById('edit-bio').value.trim(),
        isOnline: true
    }).then(() => {
        closeModal('edit-profile');
        renderUserProfile(currentUser.uid);
    });
}

function handleCreatePost(e) {
    e.preventDefault();
    if (!currentUser) return alert("Faça login para adicionar uma mídia.");

    const newPostRef = usersRef.child(`${currentUser.uid}/posts`).push();
    newPostRef.set({
        type: document.getElementById('post-type').value,
        mediaUrl: document.getElementById('post-media-url').value.trim(),
        caption: document.getElementById('post-caption').value.trim(),
        likes: 0,
        createdAt: Date.now()
    }).then(() => {
        document.getElementById('post-media-url').value = '';
        document.getElementById('post-caption').value = '';
        closeModal('create-post');
    });
}

function openPostModal(ownerUid, postKey) {
    const post = allProfiles[ownerUid]?.posts?.[postKey];
    if (!post) return;

    const isOwner = currentUser && currentUser.uid === ownerUid;
    const modalDisplay = document.getElementById('modal-post-content-display');

    const mediaElement = post.type === 'video'
        ? `<video src="${post.mediaUrl}" controls style="width:100%; max-height:400px; border-radius:8px;"></video>`
        : `<img src="${post.mediaUrl}" style="width:100%; max-height:400px; object-fit:contain; border-radius:8px;">`;

    modalDisplay.innerHTML = `
        <div style="margin-bottom:15px;">${mediaElement}</div>
        <p style="font-size:1.1rem; margin-bottom:15px;"><strong>Legenda:</strong> ${post.caption}</p>
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <button class="btn-secondary" onclick="likeProfilePost('${ownerUid}', '${postKey}')"><i class="fa-solid fa-heart"></i> Curtir (${post.likes || 0})</button>
            ${isOwner || isAdmin ? `<button class="btn-danger" onclick="deleteProfilePost('${ownerUid}', '${postKey}')"><i class="fa-solid fa-trash"></i> Excluir Mídia</button>` : ''}
        </div>
    `;

    openModal('view-post');
}

function likeProfilePost(ownerUid, postKey) {
    const currentLikes = allProfiles[ownerUid]?.posts?.[postKey]?.likes || 0;
    usersRef.child(`${ownerUid}/posts/${postKey}`).update({ likes: currentLikes + 1 }).then(() => {
        openPostModal(ownerUid, postKey);
    });
}

function deleteProfilePost(ownerUid, postKey) {
    if (confirm("Tem certeza que deseja excluir esta mídia?")) {
        usersRef.child(`${ownerUid}/posts/${postKey}`).remove().then(() => {
            closeModal('view-post');
        });
    }
}

// RENDERIZA A ABA DE TODOS OS JOGADORES DA COMUNIDADE
function renderAllPlayersTab() {
    const container = document.getElementById('all-players-grid');
    if (!container) return;
    container.innerHTML = '';

    Object.keys(allProfiles).forEach(uid => {
        const p = allProfiles[uid];
        const card = document.createElement('div');
        card.className = 'card glass-panel player-card';
        
        const avatarHtml = p.avatarUrl 
            ? `<img src="${p.avatarUrl}">` 
            : `<i class="fa-solid fa-user-ninja"></i>`;

        card.innerHTML = `
            <div class="player-card-avatar">${avatarHtml}</div>
            <h3 style="font-family: var(--font-heading); margin-bottom: 5px;">${p.nick || 'Jogador'}</h3>
            <span class="badge badge-t1" style="margin-bottom: 12px;">${p.role || 'Flex'}</span>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px;">K/D: ${p.kd || '0.00'} // Viewers: ${p.peakViewers || 0}</p>
            <button class="btn-primary btn-block" onclick="viewPlayerProfileByUid('${uid}')"><i class="fa-solid fa-eye"></i> Ver Perfil</button>
        `;
        container.appendChild(card);
    });
}

function filterPlayersList() {
    const query = document.getElementById('search-player-input').value.toLowerCase();
    const cards = document.querySelectorAll('#all-players-grid .player-card');

    cards.forEach(card => {
        const nick = card.querySelector('h3').innerText.toLowerCase();
        card.style.display = nick.includes(query) ? 'block' : 'none';
    });
}

function viewPlayerProfileByUid(uid) {
    renderUserProfile(uid);
    switchTab('profile');
}

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
                <button class="btn-secondary btn-block" onclick="viewPlayerProfileByUid('${uid}')">Ver Perfil</button>
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
            <button class="btn-primary btn-block" style="margin-top:15px;">Detalhes da Equipe</button>
        `;
        container.appendChild(card);
    });
}

function handleCreateTeam(e) {
    e.preventDefault();
    teamsRef.push({
        name: document.getElementById('team-name').value,
        tier: document.getElementById('team-tier').value
    }).then(() => closeModal('create-team'));
}

function renderLobbies() {
    const container = document.getElementById('lobbies-container');
    if (!container) return;
    container.innerHTML = '';

    lobbies.forEach(lobby => {
        const card = document.createElement('div');
        card.className = 'card glass-panel';
        card.innerHTML = `
            <span class="badge badge-t3">${lobby.type}</span>
            <h3 style="font-family: var(--font-heading); margin-top:8px;">${lobby.team}</h3>
            <p style="margin-top:5px; font-size:0.9rem;">⏰ Horário: ${lobby.time}</p>
        `;
        container.appendChild(card);
    });
}

function renderRanking() {
    const tbody = document.getElementById('ranking-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    teamsRanking.forEach((team, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${index + 1}</td>
            <td><strong>${team.name}</strong></td>
            <td><span class="badge badge-t3">${team.tier || 'T3'}</span></td>
            <td>${team.wins || 0}</td>
            <td>${team.losses || 0}</td>
            <td>100%</td>
        `;
        tbody.appendChild(row);
    });
}

function handleCreateScrim(e) {
    e.preventDefault();
    lobbiesRef.push({
        type: document.getElementById('scrim-type').value,
        time: document.getElementById('scrim-time').value,
        team: document.getElementById('scrim-team-name').value
    }).then(() => closeModal('scrim'));
}

function handleCreateX1(e) {
    e.preventDefault();
    lobbiesRef.push({
        type: 'X1',
        time: document.getElementById('x1-time').value,
        team: `${document.getElementById('x1-player').value} (X1)`
    }).then(() => closeModal('x1'));
}

function handleGoogleLogin() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(() => closeModal('auth')); }
function handleEmailAuth(e) { e.preventDefault(); auth.signInWithEmailAndPassword(document.getElementById('auth-email').value, document.getElementById('auth-password').value).then(() => closeModal('auth')); }
function handleRegister() { auth.createUserWithEmailAndPassword(document.getElementById('auth-email').value, document.getElementById('auth-password').value).then(() => closeModal('auth')); }
function handleLogout() { auth.signOut(); }

function toggleAdminMode() {
    if (prompt("Senha ADM:") === ADMIN_SECRET_PASSWORD) {
        isAdmin = true;
        document.getElementById('role-label').innerText = 'ADMINISTRADOR';
    }
}

function switchProfileSubTab(sub) {
    document.querySelectorAll('.p-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.profile-sub-content').forEach(c => c.classList.remove('active'));

    document.getElementById(`ptab-${sub}`).classList.add('active');
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Se clicar no botão "Meu Perfil", força o carregamento do próprio UID
    if (tabName === 'profile' && currentUser) {
        renderUserProfile(currentUser.uid);
    }
}

function openModal(t) { document.getElementById(`modal-${t}`).classList.add('active'); }
function closeModal(t) { document.getElementById(`modal-${t}`).classList.remove('active'); }

function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    const particles = Array.from({ length: 30 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5
    }));
    function draw() {
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;
            ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = '#00f3ff'; ctx.globalAlpha = 0.3; ctx.fill();
        });
        requestAnimationFrame(draw);
    }
    draw();
}