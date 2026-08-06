/* ==========================================================================
   CODM eSports Hub - Lógica e Firebase Integrações
   ========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyBnysGMTtMQo0RbmEMjFPhBjZVLzovbgaA",
  authDomain: "projeto-codm-hub.firebaseapp.com",
  databaseURL: "https://projeto-codm-hub-default-rtdb.firebaseio.com",
  projectId: "projeto-codm-hub",
  storageBucket: "projeto-codm-hub.firebasestorage.app",
  messagingSenderId: "1038952355133",
  appId: "1:1038952355133:web:18f011328d2e111316a154"
};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = typeof firebase !== 'undefined' ? firebase.auth() : null;
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

let currentUser = null;
let isSignUpMode = false;
let isAdmin = false;

const mockLeaderboard = [
    { rank: 1, name: "Viper_CODM", kd: "3.42", wins: 320, points: 2850 },
    { rank: 2, name: "Alpha_Squad", kd: "2.98", wins: 280, points: 2410 },
    { rank: 3, name: "Ghost_Reaper", kd: "2.75", wins: 245, points: 2150 },
    { rank: 4, name: "Shadow_Clan", kd: "2.50", wins: 210, points: 1980 },
    { rank: 5, name: "Nexus_eSports", kd: "2.35", wins: 190, points: 1720 }
];

const mockTrophies = [
    { title: "Campeão 5v5 Series", desc: "1º Lugar no Torneio Primavera CODM", icon: "fa-crown" },
    { title: "Lenda do Sniper 1v1", desc: "Invicto em 15 partidas seguidas", icon: "fa-crosshair" },
    { title: "Dominador Duo", desc: "Campeão da Liga Busca & Destruir 2v2", icon: "fa-award" },
    { title: "MVP da Temporada", desc: "Maior pontuação acumulada do Hub", icon: "fa-star" }
];

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initCounters();
    renderLeaderboard(mockLeaderboard);
    renderTrophies(mockTrophies);
    setupEventListeners();
    if (auth) listenAuthState();
    if (db) listenFeedUpdates();
});

function initParticles() {
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            particles: {
                number: { value: 50, density: { enable: true, value_area: 800 } },
                color: { value: '#00f0ff' },
                shape: { type: 'circle' },
                opacity: { value: 0.25, random: true },
                size: { value: 3, random: true },
                line_linked: { enable: true, distance: 150, color: '#00f0ff', opacity: 0.12, width: 1 },
                move: { enable: true, speed: 1.5, direction: 'none', random: false, straight: false, out_mode: 'out', bounce: false }
            },
            interactivity: {
                detect_on: 'canvas',
                events: { onhover: { enable: true, mode: 'grab' }, onclick: { enable: true, mode: 'push' } },
                modes: { grab: { distance: 140, line_linked: { opacity: 0.3 } }, push: { particles_nb: 3 } }
            },
            retina_detect: true
        });
    }
}

function initCounters() {
    const counters = document.querySelectorAll('.counter');
    const speed = 150;

    counters.forEach(counter => {
        const updateCount = () => {
            const target = +counter.getAttribute('data-target');
            const count = +counter.innerText;
            const inc = target / speed;

            if (count < target) {
                counter.innerText = Math.ceil(count + inc);
                setTimeout(updateCount, 15);
            } else {
                counter.innerText = target;
            }
        };
        updateCount();
    });
}

function renderLeaderboard(data) {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    data.forEach((item) => {
        const rankClass = item.rank === 1 ? 'top-1' : item.rank === 2 ? 'top-2' : item.rank === 3 ? 'top-3' : '';
        const row = `
            <tr>
                <td class="rank-position ${rankClass}">#${item.rank}</td>
                <td><strong>${item.name}</strong></td>
                <td>${item.kd}</td>
                <td>${item.wins}</td>
                <td class="highlight">${item.points} pts</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function renderTrophies(trophies) {
    const container = document.getElementById('trophy-container');
    if (!container) return;

    container.innerHTML = '';
    trophies.forEach(t => {
        const card = `
            <div class="glass-card trophy-card">
                <i class="fa-solid ${t.icon}"></i>
                <h4>${t.title}</h4>
                <p>${t.desc}</p>
            </div>
        `;
        container.innerHTML += card;
    });
}

function setupEventListeners() {
    // Alternar tema
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const icon = themeBtn.querySelector('i');
            icon.className = document.body.classList.contains('light-theme') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        });
    }

    // Modal Auth
    const loginBtn = document.getElementById('btn-login');
    const authModal = document.getElementById('auth-modal');
    const closeAuth = document.querySelector('.close-modal');
    const toggleAuthMode = document.getElementById('toggle-auth-mode');

    if (loginBtn && authModal) {
        loginBtn.addEventListener('click', () => {
            if (currentUser) {
                auth.signOut();
            } else {
                authModal.classList.remove('hidden');
            }
        });
    }
    if (closeAuth) closeAuth.addEventListener('click', () => authModal.classList.add('hidden'));

    if (toggleAuthMode) {
        toggleAuthMode.addEventListener('click', (e) => {
            e.preventDefault();
            isSignUpMode = !isSignUpMode;
            document.getElementById('modal-title').innerText = isSignUpMode ? 'Cadastrar no CODM Hub' : 'Acessar CODM Hub';
            document.getElementById('auth-submit-btn').innerText = isSignUpMode ? 'Cadastrar' : 'Entrar';
            toggleAuthMode.innerText = isSignUpMode ? 'Já tem conta? Entre aqui' : 'Cadastre-se';
        });
    }

    const authForm = document.getElementById('auth-form');
    if (authForm) authForm.addEventListener('submit', handleAuthSubmit);

    // Modal Perfil
    const btnProfile = document.getElementById('btn-profile');
    const profileModal = document.getElementById('profile-modal');
    const closeProfile = document.querySelector('.close-profile-modal');
    const profileForm = document.getElementById('profile-form');

    if (btnProfile && profileModal) btnProfile.addEventListener('click', openProfileModal);
    if (closeProfile) closeProfile.addEventListener('click', () => profileModal.classList.add('hidden'));
    if (profileForm) profileForm.addEventListener('submit', handleProfileSave);

    // Modal Partida
    const matchBtns = document.querySelectorAll('.btn-match');
    const matchModal = document.getElementById('match-modal');
    const closeMatch = document.querySelector('.close-match-modal');
    const matchForm = document.getElementById('match-form');

    matchBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.getAttribute('data-mode');
            if (!currentUser) {
                alert('Faça login na sua conta para se inscrever!');
                authModal.classList.remove('hidden');
                return;
            }
            document.getElementById('match-mode-selected').value = mode;
            matchModal.classList.remove('hidden');
        });
    });

    if (closeMatch) closeMatch.addEventListener('click', () => matchModal.classList.add('hidden'));
    if (matchForm) matchForm.addEventListener('submit', handleMatchSubscription);

    // Modal Admin
    const adminBtn = document.getElementById('btn-admin');
    const adminModal = document.getElementById('admin-modal');
    const closeAdmin = document.querySelector('.close-modal-admin');

    if (adminBtn && adminModal) adminBtn.addEventListener('click', () => adminModal.classList.remove('hidden'));
    if (closeAdmin) closeAdmin.addEventListener('click', () => adminModal.classList.add('hidden'));

    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
        });
    });

    const postBtn = document.getElementById('btn-post');
    if (postBtn) postBtn.addEventListener('click', handleNewPost);

    const adminStatsForm = document.getElementById('admin-update-stats');
    if (adminStatsForm) adminStatsForm.addEventListener('submit', handleAdminStatUpdate);
}

function openProfileModal() {
    if (!currentUser || !db) return;
    const profileModal = document.getElementById('profile-modal');
    
    db.collection('users').doc(currentUser.uid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('profile-nickname').value = data.nickname || '';
            document.getElementById('profile-role').value = data.gameRole || 'Sniper';
            document.getElementById('profile-bio').value = data.bio || '';
            document.getElementById('profile-avatar').value = data.avatarUrl || '';
        }
        profileModal.classList.remove('hidden');
    });
}

function handleProfileSave(e) {
    e.preventDefault();
    if (!currentUser || !db) return;

    const nickname = document.getElementById('profile-nickname').value;
    const gameRole = document.getElementById('profile-role').value;
    const bio = document.getElementById('profile-bio').value;
    const avatarUrl = document.getElementById('profile-avatar').value;

    db.collection('users').doc(currentUser.uid).set({
        nickname: nickname,
        gameRole: gameRole,
        bio: bio,
        avatarUrl: avatarUrl,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(() => {
        alert('Perfil atualizado com sucesso!');
        document.getElementById('profile-modal').classList.add('hidden');
    }).catch(err => alert('Erro ao salvar perfil: ' + err.message));
}

function handleMatchSubscription(e) {
    e.preventDefault();
    if (!currentUser || !db) return;

    const mode = document.getElementById('match-mode-selected').value;
    const teamName = document.getElementById('match-team-name').value;
    const whatsapp = document.getElementById('match-whatsapp').value;

    db.collection('matches').add({
        userId: currentUser.uid,
        userEmail: currentUser.email,
        mode: mode,
        teamName: teamName,
        whatsapp: whatsapp,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert(`Inscrição confirmada para o modo ${mode}! O organizador entrará em contato.`);
        document.getElementById('match-modal').classList.add('hidden');
        document.getElementById('match-form').reset();
    }).catch(err => alert('Erro na inscrição: ' + err.message));
}

function handleAuthSubmit(e) {
    e.preventDefault();
    if (!auth) return;

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (isSignUpMode) {
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                return db.collection('users').doc(user.uid).set({
                    email: user.email,
                    role: 'player',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(() => {
                alert('Conta criada com sucesso!');
                document.getElementById('auth-modal').classList.add('hidden');
            })
            .catch((error) => alert('Erro no cadastro: ' + error.message));
    } else {
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                document.getElementById('auth-modal').classList.add('hidden');
            })
            .catch((error) => alert('Erro no login: ' + error.message));
    }
}

function listenAuthState() {
    auth.onAuthStateChanged((user) => {
        const authBtnText = document.getElementById('auth-btn-text');
        const adminBtn = document.getElementById('btn-admin');
        const profileBtn = document.getElementById('btn-profile');

        if (user) {
            currentUser = user;
            if (authBtnText) authBtnText.innerText = 'Sair';
            if (profileBtn) profileBtn.classList.remove('hidden');
            
            db.collection('users').doc(user.uid).get().then((doc) => {
                if (doc.exists && doc.data().role === 'admin') {
                    isAdmin = true;
                    if (adminBtn) adminBtn.classList.remove('hidden');
                    loadAdminUsersList();
                } else {
                    isAdmin = false;
                    if (adminBtn) adminBtn.classList.add('hidden');
                }
            });
        } else {
            currentUser = null;
            isAdmin = false;
            if (authBtnText) authBtnText.innerText = 'Entrar';
            if (adminBtn) adminBtn.classList.add('hidden');
            if (profileBtn) profileBtn.classList.add('hidden');
        }
    });
}

function handleNewPost() {
    if (!currentUser) {
        alert('Você precisa estar logado para publicar!');
        return;
    }

    const input = document.getElementById('post-input');
    const content = input.value.trim();
    if (!content) return;

    db.collection('posts').add({
        author: currentUser.email.split('@')[0],
        userId: currentUser.uid,
        content: content,
        likes: 0,
        likedBy: [],
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        input.value = '';
    }).catch(err => alert('Erro ao publicar: ' + err.message));
}

function toggleLikePost(postId) {
    if (!currentUser) {
        alert('Faça login para curtir!');
        return;
    }

    const postRef = db.collection('posts').doc(postId);
    postRef.get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            const likedBy = data.likedBy || [];
            const hasLiked = likedBy.includes(currentUser.uid);

            if (hasLiked) {
                postRef.update({
                    likes: firebase.firestore.FieldValue.increment(-1),
                    likedBy: firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
                });
            } else {
                postRef.update({
                    likes: firebase.firestore.FieldValue.increment(1),
                    likedBy: firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
                });
            }
        }
    });
}

function listenFeedUpdates() {
    const postsContainer = document.getElementById('posts-container');
    if (!postsContainer) return;

    db.collection('posts').orderBy('timestamp', 'desc').limit(20)
        .onSnapshot((snapshot) => {
            postsContainer.innerHTML = '';
            if (snapshot.empty) {
                postsContainer.innerHTML = '<p class="text-muted">Nenhuma publicação encontrada.</p>';
                return;
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                const timeStr = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Agora';
                const likesCount = data.likes || 0;
                const isLiked = currentUser && data.likedBy && data.likedBy.includes(currentUser.uid);

                const postElement = `
                    <div class="post-card">
                        <div class="post-header">
                            <span class="post-author">@${data.author}</span>
                            <span class="post-date">${timeStr}</span>
                        </div>
                        <p class="post-content">${data.content}</p>
                        <div style="margin-top: 10px;">
                            <button onclick="toggleLikePost('${doc.id}')" class="btn-outline" style="padding: 4px 12px; font-size: 14px; border-color: ${isLiked ? 'var(--secondary-neon)' : 'var(--primary-neon)'}">
                                <i class="fa-solid fa-heart" style="color: ${isLiked ? 'var(--secondary-neon)' : 'inherit'}"></i> ${likesCount} Curtidas
                            </button>
                        </div>
                    </div>
                `;
                postsContainer.innerHTML += postElement;
            });
        });
}

function loadAdminUsersList() {
    const container = document.getElementById('admin-users-list');
    if (!container || !db) return;

    db.collection('users').get().then((snapshot) => {
        container.innerHTML = '';
        snapshot.forEach((doc) => {
            const u = doc.data();
            const userRow = `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border-card);">
                    <span>${u.email} (${u.role || 'player'})</span>
                    <button onclick="toggleBanUser('${doc.id}')" class="btn-secondary" style="padding:4px 10px; font-size:12px;">
                        ${u.banned ? 'Desbanir' : 'Banir'}
                    </button>
                </div>
            `;
            container.innerHTML += userRow;
        });
    });
}

function toggleBanUser(userId) {
    if (!db) return;
    const userRef = db.collection('users').doc(userId);
    userRef.get().then((doc) => {
        if (doc.exists) {
            const currentBanStatus = doc.data().banned || false;
            userRef.update({ banned: !currentBanStatus }).then(() => {
                alert('Status alterado!');
                loadAdminUsersList();
            });
        }
    });
}

function handleAdminStatUpdate(e) {
    e.preventDefault();
    const playerName = document.getElementById('admin-player-name').value;
    const pointsToAdd = parseInt(document.getElementById('admin-player-points').value);

    const existingPlayer = mockLeaderboard.find(p => p.name.toLowerCase() === playerName.toLowerCase());
    if (existingPlayer) {
        existingPlayer.points += pointsToAdd;
        mockLeaderboard.sort((a, b) => b.points - a.points);
        renderLeaderboard(mockLeaderboard);
        alert(`Pontuação de ${playerName} atualizada!`);
        document.getElementById('admin-update-stats').reset();
    } else {
        alert('Jogador não encontrado no Leaderboard.');
    }
}