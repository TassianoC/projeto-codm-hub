/* ==========================================================================
   CODM eSports Hub - Lógica de Perfil, Agendamento e Fila de Confrontos
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

const mockLeaderboard = [
    { rank: 1, name: "Viper_CODM", kd: "3.42", wins: 320, points: 2850 },
    { rank: 2, name: "Alpha_Squad", kd: "2.98", wins: 280, points: 2410 },
    { rank: 3, name: "Ghost_Reaper", kd: "2.75", wins: 245, points: 2150 },
    { rank: 4, name: "Shadow_Clan", kd: "2.50", wins: 210, points: 1980 },
    { rank: 5, name: "Nexus_eSports", kd: "2.35", wins: 190, points: 1720 }
];

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initCounters();
    renderLeaderboard(mockLeaderboard);
    setupEventListeners();
    listenAuthState();
    listenFeedUpdates();
    listenScheduleQueue();
});

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

function setupEventListeners() {
    // Tema
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

    // Perfil
    const btnProfile = document.getElementById('btn-profile');
    const profileModal = document.getElementById('profile-modal');
    const closeProfileModal = document.querySelector('.close-profile-modal');
    const profileForm = document.getElementById('profile-form');

    if (btnProfile && profileModal) btnProfile.addEventListener('click', openProfileModal);
    if (closeProfileModal) closeProfileModal.addEventListener('click', () => profileModal.classList.add('hidden'));
    if (profileForm) profileForm.addEventListener('submit', handleProfileSave);

    // Botões de Partida (Abre o modal gerando os campos dos jogadores dinamicamente)
    const matchBtns = document.querySelectorAll('.btn-match');
    const matchModal = document.getElementById('match-modal');
    const closeMatchModal = document.querySelector('.close-match-modal');
    const matchForm = document.getElementById('match-form');

    matchBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!currentUser) {
                alert('Faça login para inscrever seu time ou marcar horários!');
                authModal.classList.remove('hidden');
                return;
            }

            const mode = btn.getAttribute('data-mode');
            const numPlayers = parseInt(btn.getAttribute('data-players'));

            document.getElementById('match-mode-selected').value = mode;
            generatePlayersInputs(numPlayers);
            matchModal.classList.remove('hidden');
        });
    });

    if (closeMatchModal) closeMatchModal.addEventListener('click', () => matchModal.classList.add('hidden'));
    if (matchForm) matchForm.addEventListener('submit', handleMatchSubscription);

    // Admin
    const adminBtn = document.getElementById('btn-admin');
    const adminModal = document.getElementById('admin-modal');
    const closeAdmin = document.querySelector('.close-modal-admin');

    if (adminBtn && adminModal) adminBtn.addEventListener('click', () => adminModal.classList.remove('hidden'));
    if (closeAdmin) closeAdmin.addEventListener('click', () => adminModal.classList.add('hidden'));

    const postBtn = document.getElementById('btn-post');
    if (postBtn) postBtn.addEventListener('click', handleNewPost);
}

// GERAÇÃO DINÂMICA DOS CAMPOS DE JOGADORES (1 a 5)
function generatePlayersInputs(count) {
    const container = document.getElementById('players-input-container');
    container.innerHTML = `<h4 style="margin-bottom: 10px; color: var(--primary-neon);">Integrantes da Lineup (${count} Jogador(es)):</h4>`;

    for (let i = 1; i <= count; i++) {
        const labelText = i === 1 ? "Jogador 1 (Capitão / Seu Nick)" : `Jogador ${i}`;
        const inputHtml = `
            <div class="input-group" style="margin-bottom: 10px;">
                <label style="font-size: 13px;">${labelText}</label>
                <input type="text" class="match-player-input" required placeholder="Nick e Tag do Jogador ${i}">
            </div>
        `;
        container.innerHTML += inputHtml;
    }
}

// GERENCIAMENTO DO PERFIL DE ATLETA
function openProfileModal() {
    if (!currentUser) return;
    const profileModal = document.getElementById('profile-modal');

    db.collection('users').doc(currentUser.uid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            const nickname = data.nickname || currentUser.email.split('@')[0];
            const role = data.gameRole || 'Sniper';
            const tier = data.tier || 'T1 (Profissional)';
            const bio = data.bio || 'Atleta competitivo de CODM.';
            const avatar = data.avatarUrl || 'https://via.placeholder.com/80';

            // Atualiza campos do form
            document.getElementById('profile-nickname').value = nickname;
            document.getElementById('profile-role').value = role;
            document.getElementById('profile-tier').value = tier;
            document.getElementById('profile-bio').value = bio;
            document.getElementById('profile-avatar').value = avatar;

            // Atualiza card de exibição no topo
            document.getElementById('display-nickname').innerText = nickname;
            document.getElementById('display-role').innerText = role;
            document.getElementById('display-tier').innerText = tier;
            document.getElementById('display-bio').innerText = `"${bio}"`;
            document.getElementById('display-avatar').src = avatar;
        }
        profileModal.classList.remove('hidden');
    });
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
        alert('Perfil do atleta salvo com sucesso!');
        document.getElementById('profile-modal').classList.add('hidden');
    }).catch(err => alert('Erro ao salvar perfil: ' + err.message));
}

// SUBMISSÃO DE INSCRIÇÃO/AGENDAMENTO NA FILA DE DESAFIOS
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
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert(`Desafio do time ${teamName} lançado com sucesso na fila para às ${time} (${tier})!`);
        document.getElementById('match-modal').classList.add('hidden');
        document.getElementById('match-form').reset();
    }).catch(err => alert('Erro ao lançar agendamento: ' + err.message));
}

// ESCUTAR FILA DE AGENDAMENTOS (SCRIM FINDER)
function listenScheduleQueue() {
    const queueContainer = document.getElementById('schedule-queue-container');
    if (!queueContainer) return;

    db.collection('schedules').orderBy('createdAt', 'desc').limit(12)
        .onSnapshot((snapshot) => {
            queueContainer.innerHTML = '';
            if (snapshot.empty) {
                queueContainer.innerHTML = '<p class="text-muted" style="grid-column: 1/-1;">Nenhum time lançou horário na fila ainda. Seja o primeiro a agendar!</p>';
                return;
            }

            snapshot.forEach((doc) => {
                const item = doc.data();
                const playersHtml = item.players ? item.players.map((p, idx) => `<li><small>P${idx+1}:</small> ${p}</li>`).join('') : '';

                const isChallenged = item.status !== 'Aguardando Desafiante';
                const statusBadge = isChallenged 
                    ? `<span style="background: var(--secondary-neon); color:#fff; padding: 3px 8px; border-radius: 4px; font-size: 11px;">Partida Marcada</span>`
                    : `<span style="background: var(--primary-neon); color:#000; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">Fila Aberta</span>`;

                const cardHtml = `
                    <div class="glass-card" style="position: relative; border-left: 4px solid ${item.tier === 'T1' ? '#ff0055' : item.tier === 'T2' ? '#ffb700' : '#00f0ff'};">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h3 style="margin: 0; font-size: 18px;">${item.teamName}</h3>
                            ${statusBadge}
                        </div>
                        <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">
                            <strong>Horário:</strong> <span class="highlight">${item.time}</span> | <strong>Tier:</strong> ${item.tier} | <strong>Modo:</strong> ${item.mode}
                        </p>
                        <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; margin-bottom: 12px;">
                            <p style="font-size: 12px; font-weight: bold; margin-bottom: 5px;">Escalação da Equipe:</p>
                            <ul style="list-style: none; font-size: 13px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                                ${playersHtml}
                            </ul>
                        </div>
                        ${!isChallenged ? `
                            <button onclick="acceptChallenge('${doc.id}', '${item.teamName}', '${item.time}')" class="btn-primary btn-full" style="font-size: 13px; padding: 8px;">
                                <i class="fa-solid fa-swords"></i> Desafiar neste Horário
                            </button>
                        ` : `
                            <p style="font-size: 12px; color: var(--text-muted); text-align: center;">Confronto aceito por: ${item.challengedBy || 'Adversário'}</p>
                        `}
                    </div>
                `;
                queueContainer.innerHTML += cardHtml;
            });
        });
}

function acceptChallenge(docId, teamName, time) {
    if (!currentUser) {
        alert('Você precisa estar logado com seu time para aceitar um desafio!');
        return;
    }

    const challengerTeam = prompt(`Digite o nome do seu time para confirmar o confronto contra ${teamName} às ${time}:`);
    if (challengerTeam) {
        db.collection('schedules').doc(docId).update({
            status: 'Confronto Confirmado',
            challengedBy: challengerTeam,
            challengerUid: currentUser.uid
        }).then(() => {
            alert(`Confronto marcado com sucesso contra ${teamName} para às ${time}! Entrem em contato pelo WhatsApp cadastrado.`);
        }).catch(err => alert('Erro ao aceitar desafio: ' + err.message));
    }
}

// AUTH
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
            if (adminBtn) adminBtn.classList.add('hidden');
            if (profileBtn) profileBtn.classList.add('hidden');
        }
    });
}

// FEED COM CURTIDAS
function handleNewPost() {
    if (!currentUser) {
        alert('Logue para postar no feed!');
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

    db.collection('posts').orderBy('timestamp', 'desc').limit(20)
        .onSnapshot((snapshot) => {
            postsContainer.innerHTML = '';
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