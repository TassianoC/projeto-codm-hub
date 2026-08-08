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

let mockLeaderboard = [
    { rank: 1, name: "Viking_Viper", kd: "3.42", wins: 320, points: 2850 },
    { rank: 2, name: "Alpha_Squad", kd: "2.98", wins: 280, points: 2410 },
    { rank: 3, name: "Valhalla_Ghost", kd: "2.75", wins: 245, points: 2150 },
    { rank: 4, name: "Nordic_Shadow", kd: "2.50", wins: 198, points: 1980 },
    { rank: 5, name: "Nexus_eSports", kd: "2.35", wins: 190, points: 1720 }
];

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initCounters();
    renderLeaderboard(mockLeaderboard);
    setupEventListeners();
    setupModalOverlayListeners();
    if (auth) listenAuthState();
    if (db) {
        listenGlobalFeed();
        listenAgendaMatches();
    }
});

function initParticles() {
    if (typeof particlesJS !== 'undefined' && document.getElementById('particles-js')) {
        particlesJS('particles-js', {
            particles: {
                number: { value: 50, density: { enable: true, value_area: 800 } },
                color: { value: '#d4af37' },
                shape: { type: 'circle' },
                opacity: { value: 0.25, random: true },
                size: { value: 3, random: true },
                line_linked: { enable: true, distance: 150, color: '#d4af37', opacity: 0.12, width: 1 },
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
    data.forEach((item, index) => {
        const rank = index + 1;
        const rankClass = rank === 1 ? 'top-1' : rank === 2 ? 'top-2' : rank === 3 ? 'top-3' : '';
        const row = `
            <tr>
                <td class="rank-position ${rankClass}">#${rank}</td>
                <td><strong>${item.name}</strong></td>
                <td>${item.kd || '2.00'}</td>
                <td>${item.wins || 100}</td>
                <td class="highlight">${item.points} pts</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function setupModalOverlayListeners() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        }
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
            if (currentUser && auth) {
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
                if (authModal) authModal.classList.remove('hidden');
                return;
            }
            document.getElementById('match-mode-selected').value = mode;
            if (matchModal) matchModal.classList.remove('hidden');
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
            alert('Faça login com sua conta para acessar a área administrativa.');
            if (authModal) authModal.classList.remove('hidden');
            return;
        }
        if (adminPassModal) adminPassModal.classList.remove('hidden');
    }

    if (navAdminLink) navAdminLink.addEventListener('click', promptAdminAccess);
    if (adminBtn) adminBtn.addEventListener('click', promptAdminAccess);
    if (closeAdminPass) closeAdminPass.addEventListener('click', () => adminPassModal.classList.add('hidden'));

    if (adminPassForm) {
        adminPassForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputPass = document.getElementById('admin-password').value;
            if (!currentUser) return;

            const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, inputPass);
            currentUser.reauthenticateWithCredential(credential).then(() => {
                adminPassModal.classList.add('hidden');
                document.getElementById('admin-password').value = '';
                document.getElementById('admin-modal').classList.remove('hidden');
                loadAdminUsersList();
                loadAdminPostsList();
                loadAdminMatchesList();
            }).catch((err) => {
                alert('Senha incorreta ou erro na autenticação! ' + err.message);
            });
        });
    }

    // Modal Admin e Abas
    const adminModal = document.getElementById('admin-modal');
    const closeAdmin = document.querySelector('.close-modal-admin');

    if (closeAdmin) closeAdmin.addEventListener('click', () => adminModal.classList.add('hidden'));

    const tabBtns = document.querySelectorAll('#admin-modal .tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#admin-modal .tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            if (targetTab && document.getElementById(targetTab)) {
                document.getElementById(targetTab).classList.add('active');
            }
        });
    });

    const adminStatsForm = document.getElementById('admin-update-stats');
    if (adminStatsForm) adminStatsForm.addEventListener('submit', handleAdminStatUpdate);
}

/* ==========================================================================
   LÓGICA PÚBLICA DE PERFIL E PERMISSÃO DE PROPRIETÁRIO
   ========================================================================== */

function setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function renderList(elementId, items, iconClass) {
    const container = document.getElementById(elementId);
    if (!container) return;
    container.innerHTML = '';
    if (!items || items.length === 0) {
        container.innerHTML = '<li class="text-muted">Nenhum item informado.</li>';
        return;
    }
    items.forEach(item => {
        container.innerHTML += `<li><i class="fa-solid ${iconClass} highlight"></i> ${item}</li>`;
    });
}

function renderTimeline(elementId, items) {
    const container = document.getElementById(elementId);
    if (!container) return;
    container.innerHTML = '';
    if (!items || items.length === 0) {
        container.innerHTML = '<p class="text-muted">Nenhum histórico registrado.</p>';
        return;
    }
    items.forEach(item => {
        container.innerHTML += `<div class="timeline-item"><i class="fa-solid fa-chevron-right highlight"></i> <span>${item}</span></div>`;
    });
}

// Pega o ID do jogador através do parâmetro da URL ?uid=XXXX
function getProfileTargetUid() {
    const urlParams = new URLSearchParams(window.location.search);
    const targetUid = urlParams.get('uid');
    
    if (targetUid) {
        return targetUid;
    } else if (currentUser) {
        return currentUser.uid;
    }
    return null;
}

// Garante que o documento de perfil do usuário existe no Firestore. Se não existir, cria um perfil inicial.
function ensureUserProfileExists(user) {
    if (!db) return;

    const userRef = db.collection('users').doc(user.uid);

    userRef.get().then(doc => {
        if (!doc.exists) {
            const initialProfile = {
                uid: user.uid,
                email: user.email,
                nickname: user.displayName || user.email.split('@')[0],
                gameRole: 'Flex',
                avatarUrl: user.photoURL || '/img/studio (3).png',
                bio: 'Novo jogador na comunidade VIKING eSports.',
                role: 'player',
                banned: false,
                
                // Estatísticas e Ranks (Apenas ADM / Sistema podem editar)
                kdRatio: '0.00',
                totalKills: '0',
                winRate: '0%',
                mvpCount: '0',
                currentRank: 'Não Rankeado',
                rankHistory: [],
                
                // Dados editáveis pelo próprio usuário
                favoriteWeapons: [],
                favoriteMaps: [],
                clanHistory: [],
                competitiveCv: '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            userRef.set(initialProfile).then(() => {
                loadUserProfileData();
            });
        }
    });
}

// Carrega as informações do perfil público
function loadUserProfileData() {
    if (!db) return;

    const targetUid = getProfileTargetUid();

    if (!targetUid) {
        setElementText('display-nickname', 'Visitante');
        setElementText('display-bio', 'Faça login para gerenciar seu próprio perfil ou acesse o perfil de um jogador através da comunidade.');
        return;
    }

    // Controle de Permissão: Verifica se o perfil pertence ao usuário logado
    const isOwner = currentUser && (currentUser.uid === targetUid);

    const ownerElements = document.querySelectorAll('.owner-only-btn');
    ownerElements.forEach(el => {
        if (isOwner) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    // Busca dados do jogador no Firestore
    db.collection('users').doc(targetUid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            
            setElementText('display-nickname', data.nickname || 'Jogador Sem Tag');
            setElementText('display-role', data.gameRole || 'Flex');
            setElementText('display-bio', data.bio || 'Sem biografia cadastrada.');
            setElementText('display-current-rank', data.currentRank || 'Não Rankeado');
            
            const avatarImg = document.getElementById('display-avatar');
            if (avatarImg) {
                avatarImg.src = data.avatarUrl || '/img/studio (3).png';
            }

            // Status (Definidos pelo ADM/Sistema)
            setElementText('display-kd', data.kdRatio || '0.00');
            setElementText('display-total-kills', data.totalKills || '0');
            setElementText('display-winrate', data.winRate || '0%');
            setElementText('display-mvp-count', data.mvpCount || '0');

            renderList('display-favorite-weapons', data.favoriteWeapons, 'fa-crosshairs');
            renderList('display-favorite-maps', data.favoriteMaps, 'fa-map');
            renderTimeline('display-rank-history', data.rankHistory);
            renderTimeline('display-clan-history', data.clanHistory);

            setElementText('display-competitive-cv', data.competitiveCv || 'Nenhum histórico publicado.');
        } else {
            setElementText('display-nickname', 'Jogador Não Encontrado');
        }
    });

    listenUserAchievements(targetUid);
    listenUserGallery(targetUid);
    listenUserFeed(targetUid);
}

// Abrir e Preencher Modal de Edição de Perfil do Usuário
function openProfileModal() {
    if (!currentUser || !db) return;

    db.collection('users').doc(currentUser.uid).get().then(doc => {
        if (doc.exists) {
            const d = doc.data();
            if (document.getElementById('profile-nickname')) document.getElementById('profile-nickname').value = d.nickname || '';
            if (document.getElementById('profile-role')) document.getElementById('profile-role').value = d.gameRole || 'Flex';
            if (document.getElementById('profile-avatar')) document.getElementById('profile-avatar').value = d.avatarUrl || '';
            if (document.getElementById('profile-bio')) document.getElementById('profile-bio').value = d.bio || '';
            if (document.getElementById('profile-favorite-weapons')) document.getElementById('profile-favorite-weapons').value = (d.favoriteWeapons || []).join(', ');
            if (document.getElementById('profile-favorite-maps')) document.getElementById('profile-favorite-maps').value = (d.favoriteMaps || []).join(', ');
            if (document.getElementById('profile-clan-history')) document.getElementById('profile-clan-history').value = (d.clanHistory || []).join(', ');
            if (document.getElementById('profile-competitive-cv')) document.getElementById('profile-competitive-cv').value = d.competitiveCv || '';
            
            document.getElementById('profile-modal').classList.remove('hidden');
        }
    });
}

// Salvar Perfil pelo Próprio Usuário (Sem alterar estatísticas)
function handleProfileSave(e) {
    e.preventDefault();
    if (!currentUser || !db) return;

    const updatedData = {
        nickname: document.getElementById('profile-nickname').value,
        gameRole: document.getElementById('profile-role').value,
        avatarUrl: document.getElementById('profile-avatar').value,
        bio: document.getElementById('profile-bio').value,
        favoriteWeapons: document.getElementById('profile-favorite-weapons').value.split(',').map(s => s.trim()).filter(Boolean),
        favoriteMaps: document.getElementById('profile-favorite-maps').value.split(',').map(s => s.trim()).filter(Boolean),
        clanHistory: document.getElementById('profile-clan-history').value.split(',').map(s => s.trim()).filter(Boolean),
        competitiveCv: document.getElementById('profile-competitive-cv').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection('users').doc(currentUser.uid).update(updatedData).then(() => {
        alert('Seu perfil foi atualizado com sucesso!');
        document.getElementById('profile-modal').classList.add('hidden');
        loadUserProfileData();
    }).catch(err => {
        alert('Erro ao salvar perfil: ' + err.message);
    });
}

/* --- SUPORTE À GALERIA DE FOTOS E VÍDEOS --- */
function listenUserGallery(targetUid) {
    const galleryGrid = document.getElementById('user-gallery-grid');
    if (!galleryGrid) return;

    db.collection('users').doc(targetUid).collection('gallery')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
          galleryGrid.innerHTML = '';
          if (snapshot.empty) {
              galleryGrid.innerHTML = '<p class="text-muted">Nenhuma foto ou vídeo publicado nesta galeria.</p>';
              return;
          }

          snapshot.forEach(doc => {
              const media = doc.data();
              let mediaHTML = '';

              if (media.type === 'video') {
                  let embedUrl = media.url.replace("watch?v=", "embed/");
                  mediaHTML = `
                      <div class="gallery-item glass-card">
                          <iframe src="${embedUrl}" frameborder="0" allowfullscreen></iframe>
                          <p class="media-title">${media.title || 'Vídeo'}</p>
                      </div>
                  `;
              } else {
                  mediaHTML = `
                      <div class="gallery-item glass-card">
                          <img src="${media.url}" alt="${media.title}" class="gallery-img">
                          <p class="media-title">${media.title || 'Foto'}</p>
                      </div>
                  `;
              }
              galleryGrid.innerHTML += mediaHTML;
          });
      });
}

document.getElementById('btn-publish-media')?.addEventListener('click', () => {
    if (!currentUser) return alert('Você precisa estar logado.');

    const title = document.getElementById('media-title').value;
    const url = document.getElementById('media-url').value;
    const type = document.getElementById('media-type').value;

    if (!url) return alert('Por favor, informe a URL da foto ou vídeo.');

    db.collection('users').doc(currentUser.uid).collection('gallery').add({
        title: title,
        url: url,
        type: type,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert('Mídia publicada na galeria!');
        document.getElementById('media-title').value = '';
        document.getElementById('media-url').value = '';
    }).catch(err => alert('Erro ao publicar: ' + err.message));
});

/* --- CONQUISTAS DO USUÁRIO --- */
function listenUserAchievements(targetUid) {
    const grid = document.getElementById('user-achievements-grid');
    if (!grid) return;

    db.collection('users').doc(targetUid).collection('achievements')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
          grid.innerHTML = '';
          if (snapshot.empty) {
              grid.innerHTML = '<p class="text-muted">Nenhuma conquista cadastrada.</p>';
              return;
          }
          snapshot.forEach(doc => {
              const ach = doc.data();
              grid.innerHTML += `
                  <div class="trophy-card">
                      <i class="fa-solid ${ach.icon || 'fa-trophy'} highlight trophy-icon"></i>
                      <h4>${ach.title}</h4>
                      <p>${ach.desc}</p>
                  </div>
              `;
          });
      });
}

function handleAddAchievement(e) {
    e.preventDefault();
    if (!currentUser) return;

    const title = document.getElementById('ach-title').value;
    const desc = document.getElementById('ach-desc').value;
    const icon = document.getElementById('ach-icon').value || 'fa-trophy';

    db.collection('users').doc(currentUser.uid).collection('achievements').add({
        title: title,
        desc: desc,
        icon: icon,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert('Conquista adicionada!');
        document.getElementById('achievement-modal').classList.add('hidden');
        document.getElementById('achievement-form').reset();
    });
}

/* --- FEED DO PERFIL DO JOGADOR --- */
function listenUserFeed(targetUid) {
    const list = document.getElementById('user-posts-list');
    if (!list) return;

    db.collection('users').doc(targetUid).collection('posts')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
          list.innerHTML = '';
          if (snapshot.empty) {
              list.innerHTML = '<p class="text-muted">Nenhum recado publicado.</p>';
              return;
          }
          snapshot.forEach(doc => {
              const p = doc.data();
              const dateStr = p.createdAt ? new Date(p.createdAt.toDate()).toLocaleDateString() : 'Hoje';
              list.innerHTML += `
                  <div class="post-card">
                      <p class="post-content">${p.content}</p>
                      <small class="text-muted">${dateStr}</small>
                  </div>
              `;
          });
      });
}

function handleNewUserPost() {
    if (!currentUser) return alert('Você precisa estar logado.');
    const text = document.getElementById('user-post-input').value.trim();
    if (!text) return;

    db.collection('users').doc(currentUser.uid).collection('posts').add({
        content: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById('user-post-input').value = '';
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
                ensureUserProfileExists(user);
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
        const profileSection = document.getElementById('profile-section');
        const navProfileLink = document.getElementById('nav-profile-link');

        if (user) {
            currentUser = user;
            if (authBtnText) authBtnText.innerText = 'Sair';
            if (profileSection) profileSection.classList.remove('hidden');
            if (navProfileLink) navProfileLink.classList.remove('hidden');

            ensureUserProfileExists(user);

            db.collection('users').doc(user.uid).get().then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    if (data.banned) {
                        alert('SUA CONTA FOI BANIDA PELO ADMINISTRADOR POR VIOLAÇÃO DAS REGRAS.');
                        auth.signOut();
                        return;
                    }
                    isAdmin = (data.role === 'admin' || data.role === 'GOD_ADM');
                }
                loadUserProfileData();
            });
        } else {
            currentUser = null;
            isAdmin = false;
            if (authBtnText) authBtnText.innerText = 'Entrar';
            if (profileSection) profileSection.classList.add('hidden');
            if (navProfileLink) navProfileLink.classList.add('hidden');
            loadUserProfileData();
        }
    });
}

function handleNewGlobalPost() {
    if (!currentUser) { alert('Faça login para publicar!'); return; }
    const input = document.getElementById('post-input');
    if (!input) return;
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
                            <a href="perfil.html?uid=${data.userId}" style="text-decoration:none;">
                                <span class="post-author">@${data.author}</span>
                            </a>
                            <span class="post-date">${timeStr}</span>
                        </div>
                        <p class="post-content">${data.content}</p>
                        <div style="margin-top: 10px;">
                            <button onclick="toggleLikePost('${doc.id}')" class="btn-outline" style="padding: 4px 12px; font-size: 14px; border-color: ${isLiked ? 'var(--gold-primary)' : 'var(--border-card)'}">
                                <i class="fa-solid fa-heart" style="color: ${isLiked ? 'var(--gold-primary)' : 'inherit'}"></i> ${likesCount} Curtidas
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
        alert(`Inscrição confirmada para ${mode}! O seu confronto foi agendado com sucesso.`);
        document.getElementById('match-modal').classList.add('hidden');
        document.getElementById('match-form').reset();
    }).catch(err => alert('Erro na inscrição: ' + err.message));
}

function listenAgendaMatches() {
    const agendaBody = document.getElementById('agenda-body');
    if (!agendaBody || !db) return;

    db.collection('matches').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        agendaBody.innerHTML = '';
        if (snapshot.empty) {
            agendaBody.innerHTML = '<tr><td colspan="4" class="text-muted">Nenhuma scrim agendada até o momento.</td></tr>';
            return;
        }

        snapshot.forEach((doc) => {
            const m = doc.data();
            const dateStr = m.createdAt ? new Date(m.createdAt.toDate()).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recente';
            const row = `
                <tr>
                    <td><span class="highlight">${m.mode}</span></td>
                    <td><strong>${m.teamName}</strong></td>
                    <td>${m.whatsapp}</td>
                    <td>${dateStr}</td>
                </tr>
            `;
            agendaBody.innerHTML += row;
        });
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
                    <td><a href="perfil.html?uid=${userId}" style="color:var(--text-primary);">${u.nickname || 'Não configurado'}</a></td>
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
    if (!db) return;
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
    if (!db) return;
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
    if (!db) return;

    if (confirm('⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL! Deseja EXCLUIR PERMANENTEMENTE a conta deste usuário do banco de dados?')) {
        db.collection('users').doc(userId).delete().then(() => {
            alert('Conta de usuário excluída com sucesso!');
        }).catch(err => alert('Erro ao excluir: ' + err.message));
    }
}

// Atualiza Estatísticas do Jogador EXCLUSIVAMENTE pelo ADM
function updatePlayerStatsByAdmin(playerUid, statsData) {
    if (!db || !isAdmin) {
        alert("Acesso negado: Apenas administradores podem alterar estatísticas de jogadores.");
        return;
    }

    db.collection('users').doc(playerUid).update({
        kdRatio: statsData.kdRatio,
        totalKills: statsData.totalKills,
        winRate: statsData.winRate,
        mvpCount: statsData.mvpCount,
        currentRank: statsData.currentRank,
        rankHistory: statsData.rankHistory || [],
        updatedByAdminAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert('Estatísticas do jogador atualizadas pelo ADM com sucesso!');
        loadUserProfileData();
    }).catch(err => {
        alert('Erro ao atualizar estatísticas: ' + err.message);
    });
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
    if (!db) return;

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
    if (!db) return;

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
        mockLeaderboard.push({ rank: mockLeaderboard.length + 1, name: playerName, kd: "2.50", wins: 10, points: pointsToAdd });
        mockLeaderboard.sort((a, b) => b.points - a.points);
        renderLeaderboard(mockLeaderboard);
        alert(`Novo jogador ${playerName} adicionado ao Leaderboard!`);
        document.getElementById('admin-update-stats').reset();
    }
}

/* ==========================================================================
   SISTEMA DE CONTROLE SUPREMO GOD MODE
   ========================================================================== */

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

function toggleGodPanel() {
    const modal = document.getElementById('godAdminModal');
    if (modal) {
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) {
            renderUsersTable();
            renderAdminFeed();
            updateGodStats();
        }
    }
}

function updateGodStats() {
    const activeUsers = usersDatabase.filter(u => u.status === 'Active').length;
    const bannedUsers = usersDatabase.filter(u => u.status === 'Banned').length;
    
    const activeEl = document.getElementById('totalUsersCount');
    const bannedEl = document.getElementById('bannedUsersCount');
    
    if (activeEl) activeEl.innerText = activeUsers;
    if (bannedEl) bannedEl.innerText = bannedUsers;
}

function switchAdminTab(tabId, ev) {
    document.querySelectorAll('#godAdminModal .tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#godAdminModal .tab-btn').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
    
    if (ev && ev.currentTarget) {
        ev.currentTarget.classList.add('active');
    }
}

function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
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
                        ${isBanned ? 'Desbanir' : 'BANIR'}
                    </button>
                ` : '<span class="text-muted" style="font-size:11px;">INTOCÁVEL</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterUsersTable() {
    const input = document.getElementById('userSearchInput');
    if (!input) return;
    const filter = input.value.toLowerCase();
    const rows = document.querySelectorAll('#usersTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
    });
}

function createNewUserPrompt() {
    const name = prompt("Nome / Nick do novo atleta:");
    if (!name) return;
    const role = prompt("Cargo (Player / Admin / GOD_ADM):", "Player") || "Player";
    const newUser = {
        id: String(usersDatabase.length + 1).padStart(3, '0'),
        name: name,
        role: role,
        status: "Active"
    };
    usersDatabase.push(newUser);
    renderUsersTable();
    updateGodStats();
    alert(`Atleta ${name} forjado com sucesso!`);
}

function godToggleBan(userId) {
    const user = usersDatabase.find(u => u.id === userId);
    if (user) {
        user.status = user.status === 'Banned' ? 'Active' : 'Banned';
        renderUsersTable();
        updateGodStats();
        alert(`[PODER DE DEUS]: O status de ${user.name} foi alterado para ${user.status}.`);
    }
}

function toggleUserRole(userId) {
    const user = usersDatabase.find(u => u.id === userId);
    if (user) {
        user.role = user.role === 'Admin' ? 'Player' : 'Admin';
        renderUsersTable();
    }
}

function renderAdminFeed() {
    const feedContainer = document.getElementById('adminFeedList');
    if (!feedContainer) return;
    feedContainer.innerHTML = '';

    if (globalFeedPosts.length === 0) {
        feedContainer.innerHTML = '<p class="text-muted">Nenhuma publicação registrada.</p>';
        return;
    }

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

function godDeletePost(postId) {
    globalFeedPosts = globalFeedPosts.filter(p => p.id !== postId);
    renderAdminFeed();
}

function godClearAllPosts() {
    if (confirm("PODER SUPREMO: Deseja apagar TODAS as postagens da plataforma?")) {
        globalFeedPosts = [];
        renderAdminFeed();
        alert("[PODER DE DEUS]: O Feed Global foi totalmente limpo.");
    }
}

function godBroadcastNotice() {
    const input = document.getElementById('godGlobalNotice');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    alert(`📢 [TRANSMISSÃO SUPREMA PARA O SITE]\n\n"${text.toUpperCase()}"`);
    input.value = '';
}

function godResetLeaderboard() {
    if (confirm("Deseja zerar a pontuação de todos os jogadores para o novo Torneio?")) {
        mockLeaderboard.forEach(item => item.points = 0);
        renderLeaderboard(mockLeaderboard);
        alert("[PODER DE DEUS]: Leaderboard resetada com sucesso!");
    }
}

function godToggleMaintenance() {
    document.body.classList.toggle('maintenance-mode');
    const isMaint = document.body.classList.contains('maintenance-mode');
    alert(`[PODER DE DEUS]: Modo de Manutenção de Emergência ${isMaint ? 'ATIVADO' : 'DESATIVADO'}!`);
}