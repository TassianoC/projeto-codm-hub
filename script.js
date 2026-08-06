/* ==========================================================================
   CODM eSports Hub - Lógica Principal e Integrações
   ========================================================================== */

// 1. CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// Importante: Substitua as chaves abaixo pelas credenciais do seu projeto Firebase Console
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "seu-projeto-codm.firebaseapp.com",
    projectId: "seu-projeto-codm",
    storageBucket: "seu-projeto-codm.appspot.com",
    messagingSenderId: "123456789000",
    appId: "1:123456789000:web:abcdef1234567890"
};

// Inicializa o Firebase no app
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// Estado Global da Aplicação
let currentUser = null;
let isSignUpMode = false;
let isAdmin = false;

// Listas estáticas para preenchimento de UI
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

// ==========================================================================
// 2. INICIALIZAÇÃO AO CARREGAR O DOM
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initCounters();
    renderLeaderboard(mockLeaderboard);
    renderTrophies(mockTrophies);
    setupEventListeners();
    listenAuthState();
    listenFeedUpdates();
});

// ==========================================================================
// 3. BACKGROUND DE PARTÍCULAS (PARTICLES.JS)
// ==========================================================================
function initParticles() {
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            particles: {
                number: { value: 60, density: { enable: true, value_area: 800 } },
                color: { value: '#00f0ff' },
                shape: { type: 'circle' },
                opacity: { value: 0.3, random: true },
                size: { value: 3, random: true },
                line_linked: {
                    enable: true,
                    distance: 150,
                    color: '#00f0ff',
                    opacity: 0.15,
                    width: 1
                },
                move: {
                    enable: true,
                    speed: 2,
                    direction: 'none',
                    random: false,
                    straight: false,
                    out_mode: 'out',
                    bounce: false
                }
            },
            interactivity: {
                detect_on: 'canvas',
                events: {
                    onhover: { enable: true, mode: 'grab' },
                    onclick: { enable: true, mode: 'push' }
                },
                modes: {
                    grab: { distance: 140, line_linked: { opacity: 0.4 } },
                    push: { particles_nb: 3 }
                }
            },
            retina_detect: true
        });
    }
}

// ==========================================================================
// 4. ANIMAÇÃO DOS CONTADORES ESTATÍSTICOS
// ==========================================================================
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

// ==========================================================================
// 5. RENDERIZAÇÃO DE DADOS (LEADERBOARD E TROFÉUS)
// ==========================================================================
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

// ==========================================================================
// 6. EVENT LISTENERS E GERENCIAMENTO DA INTERFACE
// ==========================================================================
function setupEventListeners() {
    // Alternador de Tema (Dark/Light)
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const icon = themeBtn.querySelector('i');
            if (document.body.classList.contains('light-theme')) {
                icon.className = 'fa-solid fa-sun';
            } else {
                icon.className = 'fa-solid fa-moon';
            }
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
                // Se já estiver logado, faz logout
                auth.signOut();
            } else {
                authModal.classList.remove('hidden');
            }
        });
    }

    if (closeAuth) {
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

    // Formulário de Autenticação
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }

    // Modal de Administração
    const adminBtn = document.getElementById('btn-admin');
    const adminModal = document.getElementById('admin-modal');
    const closeAdmin = document.querySelector('.close-modal-admin');

    if (adminBtn && adminModal) {
        adminBtn.addEventListener('click', () => adminModal.classList.remove('hidden'));
    }
    if (closeAdmin) {
        closeAdmin.addEventListener('click', () => adminModal.classList.add('hidden'));
    }

    // Abas do Painel Admin
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // Envio de Postagens no Feed
    const postBtn = document.getElementById('btn-post');
    if (postBtn) {
        postBtn.addEventListener('click', handleNewPost);
    }

    // Atualização de Estatísticas no Admin
    const adminStatsForm = document.getElementById('admin-update-stats');
    if (adminStatsForm) {
        adminStatsForm.addEventListener('submit', handleAdminStatUpdate);
    }
}

// ==========================================================================
// 7. AUTENTICAÇÃO FIREBASE (LOGIN / CADASTRO / ESTADO)
// ==========================================================================
function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (isSignUpMode) {
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                // Salva perfil no Firestore
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

        if (user) {
            currentUser = user;
            if (authBtnText) authBtnText.innerText = 'Sair';
            
            // Verifica permissões no Firestore
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
        }
    });
}

// ==========================================================================
// 8. FEED EM TEMPO REAL (FIRESTORE)
// ==========================================================================
function handleNewPost() {
    if (!currentUser) {
        alert('Você precisa estar logado para publicar no feed!');
        return;
    }

    const input = document.getElementById('post-input');
    const content = input.value.trim();

    if (!content) return;

    db.collection('posts').add({
        author: currentUser.email.split('@')[0],
        userId: currentUser.uid,
        content: content,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        input.value = '';
    }).catch(err => alert('Erro ao publicar: ' + err.message));
}

function listenFeedUpdates() {
    const postsContainer = document.getElementById('posts-container');
    if (!postsContainer) return;

    db.collection('posts').orderBy('timestamp', 'desc').limit(20)
        .onSnapshot((snapshot) => {
            postsContainer.innerHTML = '';
            if (snapshot.empty) {
                postsContainer.innerHTML = '<p class="text-muted">Nenhuma publicação encontrada. Seja o primeiro a postar!</p>';
                return;
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                const timeStr = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Agora';
                
                const postElement = `
                    <div class="post-card">
                        <div class="post-header">
                            <span class="post-author">@${data.author}</span>
                            <span class="post-date">${timeStr}</span>
                        </div>
                        <p class="post-content">${data.content}</p>
                    </div>
                `;
                postsContainer.innerHTML += postElement;
            });
        }, (error) => {
            console.log("Modo offline ou Firestore não configurado. Exibindo mensagens de exemplo.");
            postsContainer.innerHTML = `
                <div class="post-card">
                    <div class="post-header">
                        <span class="post-author">@Viper_CODM</span>
                        <span class="post-date">14:32</span>
                    </div>
                    <p class="post-content">Buscando duo pro campeonato de final de semana! Foco total em Busca & Destruir.</p>
                </div>
            `;
        });
}

// ==========================================================================
// 9. PAINEL DE ADMINISTRAÇÃO E GERENCIAMENTO
// ==========================================================================
function loadAdminUsersList() {
    const container = document.getElementById('admin-users-list');
    if (!container) return;

    db.collection('users').get().then((snapshot) => {
        container.innerHTML = '';
        snapshot.forEach((doc) => {
            const u = doc.data();
            const userRow = `
                <div style="display:flex; justify-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border-card);">
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
    const userRef = db.collection('users').doc(userId);
    userRef.get().then((doc) => {
        if (doc.exists) {
            const currentBanStatus = doc.data().banned || false;
            userRef.update({ banned: !currentBanStatus }).then(() => {
                alert('Status do usuário atualizado com sucesso!');
                loadAdminUsersList();
            });
        }
    });
}

function handleAdminStatUpdate(e) {
    e.preventDefault();
    const playerName = document.getElementById('admin-player-name').value;
    const pointsToAdd = parseInt(document.getElementById('admin-player-points').value);

    // Exemplo de atualização de ranking local ou via Firebase
    const existingPlayer = mockLeaderboard.find(p => p.name.toLowerCase() === playerName.toLowerCase());
    if (existingPlayer) {
        existingPlayer.points += pointsToAdd;
        mockLeaderboard.sort((a, b) => b.points - a.points);
        // Atualiza a tabela na UI
        renderLeaderboard(mockLeaderboard);
        alert(`Pontuação de ${playerName} atualizada para ${existingPlayer.points} pts!`);
        document.getElementById('admin-update-stats').reset();
    } else {
        alert('Jogador não encontrado no Leaderboard local.');
    }
}