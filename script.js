/* ==========================================================================
   VIKING eSports Hub - Lógica Principal e Administração Suprema
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
    { rank: 1, name: "Viking_Viper", kd: "3.42", wins: 320, points: 2850 },
    { rank: 2, name: "Alpha_Squad", kd: "2.98", wins: 280, points: 2410 },
    { rank: 3, name: "Valhalla_Ghost", kd: "2.75", wins: 245, points: 2150 },
    { rank: 4, name: "Nordic_Shadow", kd: "2.50", wins: 210, points: 1980 },
    { rank: 5, name: "Nexus_eSports", kd: "2.35", wins: 190, points: 1720 }
];

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initCounters();
    renderLeaderboard(mockLeaderboard);
    setupEventListeners();
    if (auth) listenAuthState();
    if (db) listenGlobalFeed();
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

function setupEventListeners() {
    // Alternar Tema
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const icon = themeBtn.querySelector('i');
            icon.className = document.body.classList.contains('light-theme') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        });
    }

    // Modal de Login
    const loginBtn = document.getElementById('btn-login');
    const authModal = document.getElementById('auth-modal');
    const closeAuth = document.querySelector('#auth-modal .close-modal-btn');
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
            document.getElementById('modal-title').innerText = isSignUpMode ? 'Cadastrar no Viking Hub' : 'Acessar Viking Hub';
            document.getElementById('auth-submit-btn').innerText = isSignUpMode ? 'Cadastrar' : 'Entrar';
            toggleAuthMode.innerText = isSignUpMode ? 'Já tem conta? Entre aqui' : 'Cadastre-se';
        });
    }

    const authForm = document.getElementById('auth-form');
    if (authForm) authForm.addEventListener('submit', handleAuthSubmit);

    // Modal Perfil
    const editProfileBtn = document.getElementById('btn-edit-profile-modal');
    const profileModal = document.getElementById('profile-modal');
    const closeProfile = document.querySelector('.close-profile-modal');
    const profileForm = document.getElementById('profile-form');

    if (editProfileBtn) editProfileBtn.addEventListener('click', openProfileModal);
    if (closeProfile) closeProfile.addEventListener('click', () => profileModal.classList.add('hidden'));
    if (profileForm) profileForm.addEventListener('submit', handleProfileSave);

    // Modal Conquistas
    const addAchBtn = document.getElementById('btn-add-achievement');
    const achModal = document.getElementById('achievement-modal');
    const closeAch = document.querySelector('.close-achievement-modal');
    const achForm = document.getElementById('achievement-form');

    if (addAchBtn) addAchBtn.addEventListener('click', () => achModal.classList.remove('hidden'));
    if (closeAch) closeAch.addEventListener('click', () => achModal.classList.add('hidden'));
    if (achForm) achForm.addEventListener('submit', handleAddAchievement);

    // Publicações
    const userPostBtn = document.getElementById('btn-user-post');
    if (userPostBtn) userPostBtn.addEventListener('click', handleNewUserPost);

    const globalPostBtn = document.getElementById('btn-post');
    if (globalPostBtn) globalPostBtn.addEventListener('click', handleNewGlobalPost);

    // Inscrição em Partida
    const matchBtns = document.querySelectorAll('.btn-match');
    const matchModal = document.getElementById('match-modal');
    const closeMatch = document.querySelector('.close-match-modal');
    const matchForm = document.getElementById('match-form');

    matchBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.getAttribute('data-mode');
            if (!currentUser) {
                alert('Faça login para se inscrever!');
                authModal.classList.remove('hidden');
                return;
            }
            document.getElementById('match-mode-selected').value = mode;
            matchModal.classList.remove('hidden');
        });
    });

    if (closeMatch) closeMatch.addEventListener('click', () => matchModal.classList.add('hidden'));
    if (matchForm) matchForm.addEventListener('submit', handleMatchSubscription);

    // Modal de Verificação da Senha de Admin
    const adminPassModal = document.getElementById('admin-pass-modal');
    const closeAdminPass = document.querySelector('.close-admin-pass-modal');
    const adminPassForm = document.getElementById('admin-pass-form');
    const navAdminLink = document.getElementById('nav-admin-link');
    const adminBtn = document.getElementById('btn-admin');

    function promptAdminAccess(e) {
        if (e) e.preventDefault();
        if (!currentUser) {
            alert('Você precisa estar logado na sua conta para acessar.');
            authModal.classList.remove('hidden');
            return;
        }
        if (!isAdmin) {
            alert('Acesso negado. Esta conta não possui permissões administrativas.');
            return;
        }
        adminPassModal.classList.remove('hidden');
    }

    if (navAdminLink) navAdminLink.addEventListener('click', promptAdminAccess);
    if (adminBtn) adminBtn.addEventListener('click', promptAdminAccess);
    if (closeAdminPass) closeAdminPass.addEventListener('click', () => adminPassModal.classList.add('hidden'));

    if (adminPassForm) {
        adminPassForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputPass = document.getElementById('admin-password').value;
            if (!currentUser) return;

            // Autentica re-inserindo a senha no Firebase Auth para validar a conta do Admin
            const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, inputPass);
            currentUser.reauthenticateWithCredential(credential).then(() => {
                adminPassModal.classList.add('hidden');
                document.getElementById('admin-password').value = '';
                document.getElementById('admin-modal').classList.remove('hidden');
                loadAdminUsersList();
                loadAdminPostsList();
                loadAdminMatchesList();
            }).catch((err) => {
                alert('Senha incorreta! Acesso negado. ' + err.message);
            });
        });
    }

    // Modal Admin e Abas
    const adminModal = document.getElementById('admin-modal');
    const closeAdmin = document.querySelector('.close-modal-admin');

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

    const adminStatsForm = document.getElementById('admin-update-stats');
    if (adminStatsForm) adminStatsForm.addEventListener('submit', handleAdminStatUpdate);
}

/* ==========================================================================
   Perfil do Jogador / Guerreiro
   ========================================================================== */
function loadUserProfileData() {
    if (!currentUser || !db) return;

    db.collection('users').doc(currentUser.uid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('display-nickname').innerText = data.nickname || currentUser.email.split('@')[0];
            document.getElementById('display-role').innerText = data.gameRole || 'Sniper';
            document.getElementById('display-bio').innerText = data.bio || 'Sem biografia informada.';
            if (data.avatarUrl) {
                document.getElementById('user-avatar-preview').src = data.avatarUrl;
            }
        }
    });

    listenUserAchievements();
    listenUserFeed();
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

    db.collection('users').doc(currentUser.uid).set({
        nickname: document.getElementById('profile-nickname').value,
        gameRole: document.getElementById('profile-role').value,
        bio: document.getElementById('profile-bio').value,
        avatarUrl: document.getElementById('profile-avatar').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(() => {
        alert('Perfil atualizado com sucesso!');
        document.getElementById('profile-modal').classList.add('hidden');
        loadUserProfileData();
    }).catch(err => alert('Erro ao salvar perfil: ' + err.message));
}

function handleAddAchievement(e) {
    e.preventDefault();
    if (!currentUser || !db) return;

    db.collection('users').doc(currentUser.uid).collection('achievements').add({
        title: document.getElementById('ach-title').value,
        desc: document.getElementById('ach-desc').value,
        icon: document.getElementById('ach-icon').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert('Conquista adicionada!');
        document.getElementById('achievement-modal').classList.add('hidden');
        document.getElementById('achievement-form').reset();
    }).catch(err => alert('Erro: ' + err.message));
}

function listenUserAchievements() {
    const container = document.getElementById('user-achievements-grid');
    if (!container || !currentUser || !db) return;

    db.collection('users').doc(currentUser.uid).collection('achievements').orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            container.innerHTML = '';
            if (snapshot.empty) {
                container.innerHTML = '<p class="text-muted" style="grid-column: 1/-1;">Nenhuma conquista cadastrada ainda.</p>';
                return;
            }
            snapshot.forEach(doc => {
                const data = doc.data();
                container.innerHTML += `
                    <div class="user-trophy-card">
                        <i class="fa-solid ${data.icon || 'fa-award'}"></i>
                        <h4>${data.title}</h4>
                        <p>${data.desc}</p>
                    </div>
                `;
            });
        });
}

function handleNewUserPost() {
    const input = document.getElementById('user-post-input');
    const content = input.value.trim();
    if (!content || !currentUser || !db) return;

    db.collection('posts').add({
        author: currentUser.email.split('@')[0],
        userId: currentUser.uid,
        content: content,
        likes: 0,
        likedBy: [],
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => { input.value = ''; });
}

function listenUserFeed() {
    const container = document.getElementById('user-posts-list');
    if (!container || !currentUser || !db) return;

    db.collection('posts')
        .where('userId', '==', currentUser.uid)
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            container.innerHTML = '';
            if (snapshot.empty) {
                container.innerHTML = '<p class="text-muted">Você ainda não possui publicações.</p>';
                return;
            }
            snapshot.forEach(doc => {
                const data = doc.data();
                const timeStr = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Agora';
                container.innerHTML += `
                    <div class="post-card">
                        <div class="post-header">
                            <span class="post-author">@${data.author}</span>
                            <span class="post-date">${timeStr}</span>
                        </div>
                        <p class="post-content">${data.content}</p>
                        <div style="margin-top: 8px;">
                            <small class="highlight"><i class="fa-solid fa-heart"></i> ${data.likes || 0} Curtidas</small>
                        </div>
                    </div>
                `;
            });
        });
}

/* ==========================================================================
   Autenticação & Feed Global
   ========================================================================== */
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
                    banned: false,
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
        const navAdminLink = document.getElementById('nav-admin-link');
        const profileSection = document.getElementById('profile-section');
        const navProfileLink = document.getElementById('nav-profile-link');

        if (user) {
            currentUser = user;
            if (authBtnText) authBtnText.innerText = 'Sair';
            if (profileSection) profileSection.classList.remove('hidden');
            if (navProfileLink) navProfileLink.classList.remove('hidden');

            db.collection('users').doc(user.uid).get().then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    if (data.banned) {
                        alert('SUA CONTA FOI BANIDA PELO ADMINISTRADOR POR VIOLAÇÃO DAS REGRAS.');
                        auth.signOut();
                        return;
                    }

                    if (data.role === 'admin') {
                        isAdmin = true;
                        if (adminBtn) adminBtn.classList.remove('hidden');
                        if (navAdminLink) navAdminLink.classList.remove('hidden');
                    } else {
                        isAdmin = false;
                        if (adminBtn) adminBtn.classList.add('hidden');
                        if (navAdminLink) navAdminLink.classList.add('hidden');
                    }
                }
                loadUserProfileData();
            });
        } else {
            currentUser = null;
            isAdmin = false;
            if (authBtnText) authBtnText.innerText = 'Entrar';
            if (adminBtn) adminBtn.classList.add('hidden');
            if (navAdminLink) navAdminLink.classList.add('hidden');
            if (profileSection) profileSection.classList.add('hidden');
            if (navProfileLink) navProfileLink.classList.add('hidden');
        }
    });
}

function handleNewGlobalPost() {
    if (!currentUser) { alert('Faça login para publicar!'); return; }
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
    }).then(() => { input.value = ''; });
}

function listenGlobalFeed() {
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

                postsContainer.innerHTML += `
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
            });
        });
}

function toggleLikePost(postId) {
    if (!currentUser) { alert('Faça login para curtir!'); return; }
    const postRef = db.collection('posts').doc(postId);
    postRef.get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            const likedBy = data.likedBy || [];
            if (likedBy.includes(currentUser.uid)) {
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

function handleMatchSubscription(e) {
    e.preventDefault();
    if (!currentUser || !db) return;

    const mode = document.getElementById('match-mode-selected').value;
    db.collection('matches').add({
        userId: currentUser.uid,
        userEmail: currentUser.email,
        mode: mode,
        teamName: document.getElementById('match-team-name').value,
        whatsapp: document.getElementById('match-whatsapp').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert(`Inscrição confirmada para ${mode}!`);
        document.getElementById('match-modal').classList.add('hidden');
        document.getElementById('match-form').reset();
    });
}

/* ==========================================================================
   PAINEL DE ADMINISTRAÇÃO SUPREMO
   ========================================================================== */

function loadAdminUsersList() {
    const container = document.getElementById('admin-users-list');
    if (!container || !db) return;

    db.collection('users').onSnapshot((snapshot) => {
        container.innerHTML = '';
        snapshot.forEach((doc) => {
            const u = doc.data();
            const userId = doc.id;
            const isBanned = u.banned || false;
            const userRole = u.role || 'player';

            const row = `
                <tr>
                    <td><strong>${u.email}</strong></td>
                    <td>${u.nickname || 'Não configurado'}</td>
                    <td>
                        <span class="status-badge ${isBanned ? 'status-banned' : 'status-active'}">
                            ${isBanned ? 'BANIDO' : 'ATIVO'}
                        </span>
                    </td>
                    <td><span class="role-tag ${userRole === 'admin' ? 'role-admin' : 'role-player'}">${userRole}</span></td>
                    <td>
                        <div class="admin-actions-flex">
                            <button onclick="adminToggleBanUser('${userId}', ${isBanned})" class="btn-secondary btn-sm">
                                <i class="fa-solid fa-ban"></i> ${isBanned ? 'Desbanir' : 'Banir'}
                            </button>
                            <button onclick="adminToggleRole('${userId}', '${userRole}')" class="btn-outline btn-sm">
                                <i class="fa-solid fa-shield"></i> ${userRole === 'admin' ? 'Virar Player' : 'Virar Admin'}
                            </button>
                            <button onclick="adminDeleteUser('${userId}')" class="btn-danger btn-sm" title="Excluir Definitivamente">
                                <i class="fa-solid fa-trash"></i> Excluir
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            container.innerHTML += row;
        });
    });
}

function adminToggleBanUser(userId, currentBanStatus) {
    if (!db || !isAdmin) return;
    const newStatus = !currentBanStatus;
    const actionText = newStatus ? 'BANIR' : 'DESBANIR';

    if (confirm(`Tem certeza que deseja ${actionText} este usuário?`)) {
        db.collection('users').doc(userId).update({
            banned: newStatus
        }).then(() => {
            alert(`Usuário ${newStatus ? 'banido' : 'desbanido'} com sucesso!`);
        }).catch(err => alert('Erro: ' + err.message));
    }
}

function adminToggleRole(userId, currentRole) {
    if (!db || !isAdmin) return;
    const newRole = currentRole === 'admin' ? 'player' : 'admin';

    if (confirm(`Alterar permissão do usuário para: ${newRole.toUpperCase()}?`)) {
        db.collection('users').doc(userId).update({
            role: newRole
        }).then(() => {
            alert('Cargo atualizado!');
        }).catch(err => alert('Erro: ' + err.message));
    }
}

function adminDeleteUser(userId) {
    if (!db || !isAdmin) return;

    if (confirm('⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL! Deseja EXCLUIR PERMANENTEMENTE a conta deste usuário do banco de dados?')) {
        db.collection('users').doc(userId).delete().then(() => {
            alert('Conta de usuário excluída com sucesso!');
        }).catch(err => alert('Erro ao excluir: ' + err.message));
    }
}

function loadAdminPostsList() {
    const container = document.getElementById('admin-posts-list');
    if (!container || !db) return;

    db.collection('posts').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p class="text-muted">Nenhum post registrado no feed.</p>';
            return;
        }

        snapshot.forEach((doc) => {
            const post = doc.data();
            const item = `
                <div class="admin-feed-item">
                    <div>
                        <strong>@${post.author}</strong>
                        <p style="font-size:15px; color:var(--text-secondary); margin-top:4px;">${post.content}</p>
                    </div>
                    <button onclick="adminDeletePost('${doc.id}')" class="btn-danger btn-sm">
                        <i class="fa-solid fa-trash"></i> Apagar
                    </button>
                </div>
            `;
            container.innerHTML += item;
        });
    });
}

function adminDeletePost(postId) {
    if (!db || !isAdmin) return;

    if (confirm('Remover esta publicação do feed?')) {
        db.collection('posts').doc(postId).delete().then(() => {
            alert('Publicação removida!');
        }).catch(err => alert('Erro: ' + err.message));
    }
}

function loadAdminMatchesList() {
    const container = document.getElementById('admin-matches-list');
    if (!container || !db) return;

    db.collection('matches').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<tr><td colspan="4" class="text-muted">Nenhuma inscrição até o momento.</td></tr>';
            return;
        }

        snapshot.forEach((doc) => {
            const m = doc.data();
            const row = `
                <tr>
                    <td><span class="highlight">${m.mode}</span></td>
                    <td><strong>${m.teamName}</strong> (${m.userEmail})</td>
                    <td>${m.whatsapp}</td>
                    <td>
                        <button onclick="adminDeleteMatch('${doc.id}')" class="btn-danger btn-sm">
                            <i class="fa-solid fa-trash"></i> Deletar
                        </button>
                    </td>
                </tr>
            `;
            container.innerHTML += row;
        });
    });
}

function adminDeleteMatch(matchId) {
    if (!db || !isAdmin) return;

    if (confirm('Cancelar/Deletar esta inscrição do torneio?')) {
        db.collection('matches').doc(matchId).delete().then(() => {
            alert('Inscrição removida!');
        }).catch(err => alert('Erro: ' + err.message));
    }
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
        alert(`Placar de ${playerName} atualizado!`);
        document.getElementById('admin-update-stats').reset();
    } else {
        alert('Jogador não encontrado no Leaderboard.');
    }
}
/* ==========================================================================
   SISTEMA DE CONTROLE SUPREMO GOD MODE
   ========================================================================== */

// Base de dados simulada
let usersDatabase = [
    { id: "001", name: "Tassiano (Viking)", role: "GOD_ADM", status: "Active" },
    { id: "002", name: "Thor_eSports", role: "Player", status: "Active" },
    { id: "003", name: "Loki_Cheater", role: "Player", status: "Banned" },
    { id: "004", name: "Odin_Master", role: "Admin", status: "Active" }
];

let globalFeedPosts = [
    { id: 101, author: "Thor_eSports", content: "Partida incrível na final hoje!", date: "Hoje às 18:30" },
    { id: 102, author: "Loki_Cheater", content: "GG WP a todos os participantes.", date: "Hoje às 17:10" }
];

// Alternar visibilidade do Modal God Mode
function toggleGodPanel() {
    const modal = document.getElementById('godAdminModal');
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
        renderUsersTable();
        renderAdminFeed();
    }
}

// Alternar Abas Internas
function switchAdminTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Renderizar Tabela de Usuários
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    usersDatabase.forEach(user => {
        const isBanned = user.status === 'Banned';
        const isGod = user.role === 'GOD_ADM';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${user.id}</td>
            <td><strong>${user.name}</strong></td>
            <td><span class="role-tag ${isGod ? 'role-admin' : 'role-player'}">${user.role}</span></td>
            <td><span class="status-badge ${isBanned ? 'status-banned' : 'status-active'}">${user.status}</span></td>
            <td class="admin-actions-flex">
                ${!isGod ? `
                    <button class="btn-secondary btn-sm" onclick="toggleUserRole('${user.id}')">
                        ${user.role === 'Admin' ? 'Promover para Player' : 'Tornar ADM'}
                    </button>
                    <button class="btn-danger btn-sm" onclick="godToggleBan('${user.id}')">
                        ${isBanned ? 'Desbanir' : ' BANIR'}
                    </button>
                ` : '<span class="text-muted" style="font-size:11px;">INTOCÁVEL</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Banir / Desbanir Atleta
function godToggleBan(userId) {
    const user = usersDatabase.find(u => u.id === userId);
    if (user) {
        user.status = user.status === 'Banned' ? 'Active' : 'Banned';
        renderUsersTable();
        alert(`[PODER DE DEUS]: O status de ${user.name} foi alterado para ${user.status}.`);
    }
}

// Alterar Cargo de Usuário
function toggleUserRole(userId) {
    const user = usersDatabase.find(u => u.id === userId);
    if (user) {
        user.role = user.role === 'Admin' ? 'Player' : 'Admin';
        renderUsersTable();
    }
}

// Renderizar Feed de Moderação
function renderAdminFeed() {
    const feedContainer = document.getElementById('adminFeedList');
    feedContainer.innerHTML = '';

    globalFeedPosts.forEach(post => {
        const item = document.createElement('div');
        item.className = 'admin-feed-item';
        item.innerHTML = `
            <div>
                <strong>@${post.author}</strong> - <span class="text-muted">${post.date}</span>
                <p class="post-content">${post.content}</p>
            </div>
            <button class="btn-danger btn-sm" onclick="godDeletePost(${post.id})"><i class="fas fa-trash"></i> Apagar</button>
        `;
        feedContainer.appendChild(item);
    });
}

// Apagar Postagem Única
function godDeletePost(postId) {
    globalFeedPosts = globalFeedPosts.filter(p => p.id !== postId);
    renderAdminFeed();
}

// Purgar Todo o Feed
function godClearAllPosts() {
    if (confirm("PODER SUPREMO: Deseja apagar TODAS as postagens da plataforma?")) {
        globalFeedPosts = [];
        renderAdminFeed();
        alert("[PODER DE DEUS]: O Feed Global foi totalmente limpo.");
    }
}

// Transmitir Anúncio Global
function godBroadcastNotice() {
    const text = document.getElementById('godGlobalNotice').value;
    if (!text) return;
    alert(`[TRANSMISSÃO SUPREMA PARA O SITE]\n\n"${text.toUpperCase()}"`);
    document.getElementById('godGlobalNotice').value = '';
}

// Resetar Leaderboard
function godResetLeaderboard() {
    if (confirm("Deseja zerar a pontuação de todos os jogadores para o novo Torneio?")) {
        alert("[PODER DE DEUS]: Leaderboard resetada com sucesso!");
    }
}

// Alternar Modo Manutenção
function godToggleMaintenance() {
    document.body.classList.toggle('maintenance-mode');
    alert("[PODER DE DEUS]: Estado do Servidor alterado!");
}
/* ==========================================================================
   CONTROLE DE ACESSO EXCLUSIVO - GOD MODE
   ========================================================================== */

// E-mail supremo do criador com acesso total
const SUPREME_GOD_EMAIL = "fallk.codm@gmail.com";

// Exemplo: Simulação do usuário atualmente autenticado no sistema
// (Na sua aplicação real, recupere este valor do seu sistema de Auth, LocalStorage ou Session)
let currentUser = {
    email: "fallk.codm@gmail.com", // Altere para testar com outro e-mail
    name: "Tassiano"
};

/**
 * Verifica se o usuário atual é o Administrador Supremo
 */
function isSupremeGod() {
    return currentUser && currentUser.email.toLowerCase() === SUPREME_GOD_EMAIL.toLowerCase();
}

/**
 * Inicializa e protege os controles do God Mode ao carregar a página
 */
document.addEventListener("DOMContentLoaded", () => {
    const godBtn = document.getElementById("btnGodTrigger");
    const godModal = document.getElementById("godAdminModal");

    if (!isSupremeGod()) {
        // Se NÃO for a sua conta, remove completamente os elementos do código da página
        if (godBtn) godBtn.remove();
        if (godModal) godModal.remove();
        console.log("Acesso ao God Mode: Negado.");
    } else {
        // Se for a sua conta, garante que o botão fique visível
        if (godBtn) godBtn.classList.remove("hidden");
    }
});

/**
 * Função de abertura com trava de segurança reforçada
 */
function toggleGodPanel() {
    // Dupla checagem de segurança
    if (!isSupremeGod()) {
        alert("[ACESSO NEGADO]: Você não possui permissões de Divindade.");
        return;
    }

    const modal = document.getElementById('godAdminModal');
    if (modal) {
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) {
            renderUsersTable();
            renderAdminFeed();
        }
    }
}