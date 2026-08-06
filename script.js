/* ==========================================================================
   CODM eSports Hub - Script Completo com Admin & Perfil Instagram
   ========================================================================== */

// Configuração Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBnysGMTtMQo0RbmEMjFPhBjZVLzovbgaA",
  authDomain: "projeto-codm-hub.firebaseapp.com",
  databaseURL: "https://projeto-codm-hub-default-rtdb.firebaseio.com",
  projectId: "projeto-codm-hub",
  storageBucket: "projeto-codm-hub.firebasestorage.app",
  messagingSenderId: "1038952355133",
  appId: "1:1038952355133:web:18f011328d2e111316a154"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Estado Global
let currentUser = null;
let isSignUpMode = false;
let isAdmin = false;

// Dados Mock do Leaderboard
const mockLeaderboard = [
    { rank: 1, name: "Viper_CODM", kd: "3.42", wins: 320, points: 2850 },
    { rank: 2, name: "Alpha_Squad", kd: "2.98", wins: 280, points: 2410 },
    { rank: 3, name: "Ghost_Reaper", kd: "2.75", wins: 245, points: 2150 },
    { rank: 4, name: "Shadow_Clan", kd: "2.50", wins: 1980, points: 1980 },
    { rank: 5, name: "Nexus_eSports", kd: "2.35", wins: 190, points: 1720 }
];

// Inicialização da Aplicação
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initCounters();
    renderLeaderboard(mockLeaderboard);
    setupEventListeners();
    listenAuthState();
    listenFeedUpdates();
    listenScheduleQueue();
});

/* ==========================================================================
   EFEITOS VISUAIS E INTERFACE
   ========================================================================== */

function initParticles() {
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            particles: {
                number: { value: 60, density: { enable: true, value_area: 800 } },
                color: { value: '#00f0ff' },
                shape: { type: 'circle' },
                opacity: { value: 0.3, random: true },
                size: { value: 3, random: true },
                line_linked: { enable: true, distance: 150, color: '#00f0ff', opacity: 0.15, width: 1 },
                move: { enable: true, speed: 2, direction: 'none', random: false, straight: false, out_mode: 'out', bounce: false }
            },
            interactivity: {
                detect_on: 'canvas',
                events: { onhover: { enable: true, mode: 'grab' }, onclick: { enable: true, mode: 'push' } },
                modes: { grab: { distance: 140, line_linked: { opacity: 0.4 } }, push: { particles_nb: 3 } }
            },
            retina_detect: true
        });
    }
}

function initCounters() {
    const counters = document.querySelectorAll('.counter');
    const speed = 200;

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

/* ==========================================================================
   GERENCIADORES DE EVENTOS
   ========================================================================== */

function setupEventListeners() {
    // Alternância de Tema
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const icon = themeBtn.querySelector('i');
            icon.className = document.body.classList.contains('light-theme') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        });
    }

    // Modal de Autenticação
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

    if (closeAuth && authModal) {
        closeAuth.addEventListener('click', () => authModal.classList.add('hidden'));
    }

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

    // Perfil
    const btnProfile = document.getElementById('btn-profile');
    const profileModal = document.getElementById('profile-modal');
    const closeProfileModal = document.querySelector('.close-profile-modal');
    const profileForm = document.getElementById('profile-form');

    if (btnProfile) {
        btnProfile.addEventListener('click', () => {
            if (!currentUser) {
                alert('Acesso negado. Faça login para acessar seu perfil!');
                if (authModal) authModal.classList.remove('hidden');
                return;
            }
            openProfileModal();
        });
    }

    if (closeProfileModal && profileModal) {
        closeProfileModal.addEventListener('click', () => profileModal.classList.add('hidden'));
    }

    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSave);
    }

    // Inscrição de Desafios / Squads
    const matchBtns = document.querySelectorAll('.btn-match');
    const matchModal = document.getElementById('match-modal');
    const closeMatchModal = document.querySelector('.close-match-modal');
    const matchForm = document.getElementById('match-form');

    matchBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!currentUser) {
                alert('Faça login para inscrever seu time ou lançar um desafio!');
                if (authModal) authModal.classList.remove('hidden');
                return;
            }

            const mode = btn.getAttribute('data-mode');
            const numPlayers = parseInt(btn.getAttribute('data-players'));

            document.getElementById('match-mode-selected').value = mode;
            generatePlayersInputs(numPlayers);
            matchModal.classList.remove('hidden');
        });
    });

    if (closeMatchModal && matchModal) {
        closeMatchModal.addEventListener('click', () => matchModal.classList.add('hidden'));
    }

    if (matchForm) {
        matchForm.addEventListener('submit', handleMatchSubscription);
    }

    // Painel Admin
    const adminBtn = document.getElementById('btn-admin');
    const adminModal = document.getElementById('admin-modal');
    const closeAdmin = document.querySelector('.close-modal-admin');

    if (adminBtn && adminModal) {
        adminBtn.addEventListener('click', () => {
            adminModal.classList.remove('hidden');
            loadAdminPanelData();
        });
    }
    if (closeAdmin && adminModal) {
        closeAdmin.addEventListener('click', () => adminModal.classList.add('hidden'));
    }

    // Feed
    const postBtn = document.getElementById('btn-post');
    if (postBtn) postBtn.addEventListener('click', handleNewPost);

    window.addEventListener('click', (e) => {
        if (e.target === authModal) authModal.classList.add('hidden');
        if (e.target === profileModal) profileModal.classList.add('hidden');
        if (e.target === matchModal) matchModal.classList.add('hidden');
        if (e.target === adminModal) adminModal.classList.add('hidden');
    });
}

/* ==========================================================================
   PERFIL ESTILO INSTAGRAM
   ========================================================================== */

function openProfileModal() {
    const profileModal = document.getElementById('profile-modal');
    if (!currentUser || !profileModal) return;

    profileModal.classList.remove('hidden');

    db.collection('users').doc(currentUser.uid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            const nickname = data.nickname || currentUser.email.split('@')[0];
            const role = data.gameRole || 'Sniper';
            const tier = data.tier || 'T1 (Profissional)';
            const bio = data.bio || 'Atleta competitivo de CODM.';
            const avatar = data.avatarUrl || 'https://via.placeholder.com/100';

            document.getElementById('profile-nickname').value = nickname;
            document.getElementById('profile-role').value = role;
            document.getElementById('profile-tier').value = tier;
            document.getElementById('profile-bio').value = bio;
            document.getElementById('profile-avatar').value = avatar;

            document.getElementById('display-nickname').innerText = `@${nickname}`;
            document.getElementById('display-role').innerText = role;
            document.getElementById('display-tier').innerText = tier;
            document.getElementById('display-bio').innerText = bio;
            document.getElementById('display-avatar').src = avatar;
        } else {
            const defaultNick = currentUser.email.split('@')[0];
            document.getElementById('profile-nickname').value = defaultNick;
            document.getElementById('display-nickname').innerText = `@${defaultNick}`;
            document.getElementById('display-role').innerText = "Sniper";
            document.getElementById('display-tier').innerText = "T3 (Amador)";
            document.getElementById('display-bio').innerText = "Edite seu perfil para personalizar sua biografia!";
        }
    }).catch(err => console.error("Erro ao carregar perfil:", err));
}

function handleProfileSave(e) {
    e.preventDefault();
    if (!currentUser) return;

    const nickname = document.getElementById('profile-nickname').value;
    const gameRole = document.getElementById('profile-role').value;
    const tier = document.getElementById('profile-tier').value;
    const bio = document.getElementById('profile-bio').value;
    const avatarUrl = document.getElementById('profile-avatar').value;

    db.collection('users').doc(currentUser.uid).set({
        nickname: nickname,
        gameRole: gameRole,
        tier: tier,
        bio: bio,
        avatarUrl: avatarUrl,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(() => {
        alert('Seu perfil foi atualizado com sucesso!');
        document.getElementById('display-nickname').innerText = `@${nickname}`;
        document.getElementById('display-role').innerText = gameRole;
        document.getElementById('display-tier').innerText = tier;
        document.getElementById('display-bio').innerText = bio;
        if (avatarUrl) document.getElementById('display-avatar').src = avatarUrl;

        document.getElementById('profile-modal').classList.add('hidden');
    }).catch(err => alert('Erro ao salvar perfil: ' + err.message));
}

/* ==========================================================================
   PERSISTÊNCIA DA FILA DE DESAFIOS (SCRIM FINDER)
   ========================================================================== */

function generatePlayersInputs(count) {
    const container = document.getElementById('players-input-container');
    if (!container) return;

    container.innerHTML = `<h4 style="margin-bottom: 10px; color: var(--primary-neon);">Escalação (${count} Jogador(es)):</h4>`;

    for (let i = 1; i <= count; i++) {
        const labelText = i === 1 ? "Capitão (Seu Nick)" : `Jogador ${i}`;
        container.innerHTML += `
            <div class="input-group" style="margin-bottom: 8px;">
                <label style="font-size: 12px;">${labelText}</label>
                <input type="text" class="match-player-input" required placeholder="Nick e Tag do Jogador ${i}">
            </div>
        `;
    }
}

function handleMatchSubscription(e) {
    e.preventDefault();
    const mode = document.getElementById('match-mode-selected').value;
    const tier = document.getElementById('match-tier').value;
    const time = document.getElementById('match-time').value;
    const teamName = document.getElementById('match-team-name').value;
    const whatsapp = document.getElementById('match-whatsapp').value;

    const playerInputs = document.querySelectorAll('.match-player-input');
    const playersList = [];
    playerInputs.forEach(input => {
        if (input.value.trim()) playersList.push(input.value.trim());
    });

    db.collection('schedules').add({
        captainId: currentUser.uid,
        captainEmail: currentUser.email,
        teamName: teamName,
        mode: mode,
        tier: tier,
        time: time,
        players: playersList,
        whatsapp: whatsapp,
        status: 'Aguardando Desafiante',
        createdAt: new Date()
    }).then(() => {
        alert(`Desafio do time "${teamName}" publicado com sucesso!`);
        document.getElementById('match-modal').classList.add('hidden');
        document.getElementById('match-form').reset();
    }).catch(err => alert('Erro ao registrar agendamento: ' + err.message));
}

function listenScheduleQueue() {
    const queueContainer = document.getElementById('schedule-queue-container');
    if (!queueContainer) return;

    // Monitoramento em tempo real do banco de dados (Persistente no F5)
    db.collection('schedules').onSnapshot((snapshot) => {
        queueContainer.innerHTML = '';
        if (snapshot.empty) {
            queueContainer.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1;">Nenhum desafio aberto no momento. Agende o seu!</p>';
            return;
        }

        let docs = [];
        snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));

        // Ordenação por tempo mais recente
        docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        docs.forEach((item) => {
            const playersHtml = item.players ? item.players.map((p, idx) => `<li><small style="color: var(--primary-neon);">P${idx+1}:</small> ${p}</li>`).join('') : '';
            const isChallenged = item.status !== 'Aguardando Desafiante';
            const statusBadge = isChallenged 
                ? `<span style="background: #ff0055; color:#fff; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Confronto Aceito</span>`
                : `<span style="background: #00f0ff; color:#000; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">Disponível</span>`;

            const cardHtml = `
                <div class="glass-card" style="position: relative; border-left: 4px solid ${item.tier === 'T1' ? '#ff0055' : item.tier === 'T2' ? '#ffb700' : '#00f0ff'}; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <h3 style="margin: 0; font-size: 16px;">${item.teamName}</h3>
                        ${statusBadge}
                    </div>
                    <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">
                        <strong>Horário:</strong> <span class="highlight">${item.time}</span> | <strong>Tier:</strong> ${item.tier} | <strong>Modo:</strong> ${item.mode}
                    </p>
                    <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; margin-bottom: 10px;">
                        <ul style="list-style: none; font-size: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 0;">
                            ${playersHtml}
                        </ul>
                    </div>
                    ${!isChallenged ? `
                        <button onclick="acceptChallenge('${item.id}', '${item.teamName}', '${item.time}')" class="btn-primary btn-full" style="font-size: 12px; padding: 6px;">
                            Desafiar Equipe
                        </button>
                    ` : `
                        <p style="font-size: 11px; color: var(--text-secondary); text-align: center; margin: 0;">Oponente: <strong>${item.challengedBy || 'Confirmado'}</strong></p>
                    `}
                </div>
            `;
            queueContainer.innerHTML += cardHtml;
        });
    }, err => console.error("Erro na fila:", err));
}

function acceptChallenge(docId, teamName, time) {
    if (!currentUser) {
        alert('Faça login para desafiar esta equipe!');
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.classList.remove('hidden');
        return;
    }

    const challengerTeam = prompt(`Digite o nome da sua equipe para aceitar o confronto contra ${teamName} (${time}):`);
    if (challengerTeam && challengerTeam.trim() !== '') {
        db.collection('schedules').doc(docId).update({
            status: 'Confronto Confirmado',
            challengedBy: challengerTeam.trim(),
            challengerUid: currentUser.uid
        }).then(() => {
            alert(`Confronto agendado contra ${teamName}!`);
        }).catch(err => alert('Erro ao aceitar o desafio: ' + err.message));
    }
}

/* ==========================================================================
   PAINEL DE CONTROLE DO ADMINISTRADOR (ADMIN ACTIONS)
   ========================================================================== */

function loadAdminPanelData() {
    const adminContainer = document.getElementById('admin-schedules-list');
    if (!adminContainer) return;

    adminContainer.innerHTML = '<p style="color: var(--text-secondary);">Carregando dados da plataforma...</p>';

    db.collection('schedules').get().then((snapshot) => {
        adminContainer.innerHTML = '';
        if (snapshot.empty) {
            adminContainer.innerHTML = '<p>Nenhum agendamento encontrado.</p>';
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const itemHtml = `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.4); padding: 10px; border-radius: 6px; margin-bottom: 8px; border: 1px solid #333;">
                    <div>
                        <strong style="color: var(--primary-neon);">${data.teamName}</strong> (${data.mode} - ${data.tier})
                        <br><small style="color: var(--text-secondary);">Horário: ${data.time} | WhatsApp: ${data.whatsapp || 'N/A'}</small>
                    </div>
                    <div>
                        <button onclick="adminDeleteSchedule('${doc.id}')" class="btn-outline" style="border-color: #ff0055; color: #ff0055; padding: 4px 8px; font-size: 12px;">
                            <i class="fa-solid fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            `;
            adminContainer.innerHTML += itemHtml;
        });
    });
}

function adminDeleteSchedule(docId) {
    if (confirm('Tem certeza de que deseja remover este agendamento como Administrador?')) {
        db.collection('schedules').doc(docId).delete().then(() => {
            alert('Agendamento removido com sucesso!');
            loadAdminPanelData();
        }).catch(err => alert('Erro ao excluir: ' + err.message));
    }
}

/* ==========================================================================
   AUTENTICAÇÃO E SESSÃO DO USUÁRIO
   ========================================================================== */

function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (isSignUpMode) {
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                return db.collection('users').doc(user.uid).set({
                    email: user.email,
                    role: 'player',
                    nickname: email.split('@')[0],
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
                } else {
                    isAdmin = false;
                    if (adminBtn) adminBtn.classList.add('hidden');
                }
            });
        } else {
            currentUser = null;
            isAdmin = false;
            if (authBtnText) authBtnText.innerText = 'Entrar';
            if (profileBtn) profileBtn.classList.add('hidden');
            if (adminBtn) adminBtn.classList.add('hidden');
        }
    });
}

/* ==========================================================================
   FEED DA COMUNIDADE
   ========================================================================== */

function handleNewPost() {
    if (!currentUser) {
        alert('Faça login para publicar!');
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.classList.remove('hidden');
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
        timestamp: new Date()
    }).then(() => input.value = '');
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

    db.collection('posts').onSnapshot((snapshot) => {
        postsContainer.innerHTML = '';
        let posts = [];
        snapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));

        posts.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        posts.forEach((data) => {
            const likesCount = data.likes || 0;
            const isLiked = currentUser && data.likedBy && data.likedBy.includes(currentUser.uid);

            const postElement = `
                <div class="post-card" style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #333;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <span style="color: var(--primary-neon); font-weight: bold;">@${data.author}</span>
                    </div>
                    <p style="margin-bottom: 8px; font-size: 14px;">${data.content}</p>
                    <button onclick="toggleLikePost('${data.id}')" class="btn-outline" style="padding: 2px 10px; font-size: 12px; border-color: ${isLiked ? '#ff0055' : '#00f0ff'}">
                        <i class="fa-solid fa-heart" style="color: ${isLiked ? '#ff0055' : 'inherit'}"></i> ${likesCount} Curtidas
                    </button>
                </div>
            `;
            postsContainer.innerHTML += postElement;
        });
    });
}