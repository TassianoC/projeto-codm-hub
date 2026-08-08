/* ==========================================================================
   VIKING eSports Hub - Lógica Principal e Administração Suprema
   ========================================================================== */

const MASTER_ADMIN_EMAIL = "fallk.codm@gmail.com"; 

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
    { rank: 1, name: "VK_Valkyrie", kd: "3.42", wins: 142, points: 2850 },
    { rank: 2, name: "Ragnar_L", kd: "2.95", wins: 118, points: 2410 },
    { rank: 3, name: "Thor_CODM", kd: "2.81", wins: 95, points: 2100 },
    { rank: 4, name: "Odin_Sniper", kd: "2.64", wins: 82, points: 1890 },
    { rank: 5, name: "Loki_Entry", kd: "2.45", wins: 76, points: 1650 }
];

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initEventListeners();
    if (auth) listenAuthState();
    if (db) {
        listenGlobalFeed();
        listenAgendaMatches();
        listenLeaderboard();
    }
});

function initParticles() {
    if (typeof particlesJS !== 'undefined' && document.getElementById('particles-js')) {
        particlesJS('particles-js', {
            particles: {
                number: { value: 40, density: { enable: true, value_area: 800 } },
                color: { value: "#d4af37" },
                shape: { type: "circle" },
                opacity: { value: 0.3, random: true },
                size: { value: 3, random: true },
                line_linked: { enable: true, distance: 150, color: "#d4af37", opacity: 0.15, width: 1 },
                move: { enable: true, speed: 1.5, direction: "none", random: false, straight: false, out_mode: "out", bounce: false }
            },
            interactivity: {
                detect_on: "canvas",
                events: { onhover: { enable: true, mode: "grab" }, onclick: { enable: false } },
                modes: { grab: { distance: 140, line_linked: { opacity: 0.4 } } }
            },
            retina_detect: true
        });
    }
}

function initEventListeners() {
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const icon = themeBtn.querySelector('i');
            if (icon) {
                icon.className = document.body.classList.contains('light-theme') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
            }
        });
    }

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
    if (closeAuth && authModal) closeAuth.addEventListener('click', () => authModal.classList.add('hidden'));

    if (toggleAuthMode) {
        toggleAuthMode.addEventListener('click', (e) => {
            e.preventDefault();
            isSignUpMode = !isSignUpMode;
            const title = document.getElementById('modal-title');
            const submitBtn = document.getElementById('auth-submit-btn');
            if (title) title.innerText = isSignUpMode ? 'Cadastrar no Viking Hub' : 'Acessar Viking Hub';
            if (submitBtn) submitBtn.innerText = isSignUpMode ? 'Cadastrar' : 'Entrar';
            toggleAuthMode.innerText = isSignUpMode ? 'Já tem conta? Entre aqui' : 'Cadastre-se';
        });
    }

    const authForm = document.getElementById('auth-form');
    if (authForm) authForm.addEventListener('submit', handleAuthSubmit);

    const editProfileBtn = document.getElementById('btn-edit-profile-modal');
    const profileModal = document.getElementById('profile-modal');
    const closeProfile = document.querySelector('.close-profile-modal');
    const profileForm = document.getElementById('profile-form');

    if (editProfileBtn) editProfileBtn.addEventListener('click', openProfileModal);
    if (closeProfile && profileModal) closeProfile.addEventListener('click', () => profileModal.classList.add('hidden'));
    if (profileForm) profileForm.addEventListener('submit', handleProfileSave);

    const addAchBtn = document.getElementById('btn-add-achievement');
    const achModal = document.getElementById('achievement-modal');
    const closeAch = document.querySelector('.close-achievement-modal');
    const achForm = document.getElementById('achievement-form');

    if (addAchBtn && achModal) addAchBtn.addEventListener('click', () => achModal.classList.remove('hidden'));
    if (closeAch && achModal) closeAch.addEventListener('click', () => achModal.classList.add('hidden'));
    if (achForm) achForm.addEventListener('submit', handleAddAchievement);

    const userPostBtn = document.getElementById('btn-user-post');
    if (userPostBtn) userPostBtn.addEventListener('click', handleNewUserPost);

    const globalPostBtn = document.getElementById('btn-post');
    if (globalPostBtn) globalPostBtn.addEventListener('click', handleNewGlobalPost);

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
            const matchModeInput = document.getElementById('match-mode-selected');
            if (matchModeInput) matchModeInput.value = mode;
            if (matchModal) matchModal.classList.remove('hidden');
        });
    });

    if (closeMatch && matchModal) closeMatch.addEventListener('click', () => matchModal.classList.add('hidden'));
    if (matchForm) matchForm.addEventListener('submit', handleMatchSubscription);

    const navAdminLink = document.getElementById('nav-admin-link');
    const adminBtn = document.getElementById('btn-admin');

    function directAdminAccess(e) {
        if (e) e.preventDefault();
        if (!currentUser) {
            alert('Faça login com sua conta para acessar.');
            if (authModal) authModal.classList.remove('hidden');
            return;
        }

        if (!isAdmin) {
            alert('Acesso negado: Sua conta não tem permissão de Administrador.');
            return;
        }

        const adminModal = document.getElementById('admin-modal');
        if (adminModal) {
            adminModal.classList.remove('hidden');
            loadAdminUsersList();
            loadAdminPostsList();
            loadAdminMatchesList();
        } else {
            alert('Painel administrativo indisponível nesta página.');
        }
    }

    if (navAdminLink) navAdminLink.addEventListener('click', directAdminAccess);
    if (adminBtn) adminBtn.addEventListener('click', directAdminAccess);

    const adminModal = document.getElementById('admin-modal');
    const closeAdmin = document.querySelector('.close-modal-admin');

    if (closeAdmin && adminModal) closeAdmin.addEventListener('click', () => adminModal.classList.add('hidden'));

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

            const isUserMaster = user.email && user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

            db.collection('users').doc(user.uid).get().then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    if (data.banned) {
                        alert('SUA CONTA FOI BANIDA PELO ADMINISTRADOR POR VIOLAÇÃO DAS REGRAS.');
                        auth.signOut();
                        return;
                    }
                    isAdmin = isUserMaster || (data.role === 'admin' || data.role === 'GOD_ADM');
                } else {
                    isAdmin = isUserMaster;
                }

                toggleAdminButtonsUI(isAdmin);
                loadUserProfileData();
            }).catch(() => {
                isAdmin = isUserMaster;
                toggleAdminButtonsUI(isAdmin);
                loadUserProfileData();
            });
        } else {
            currentUser = null;
            isAdmin = false;
            if (authBtnText) authBtnText.innerText = 'Entrar';
            if (profileSection) profileSection.classList.add('hidden');
            if (navProfileLink) navProfileLink.classList.add('hidden');

            toggleAdminButtonsUI(false);
            loadUserProfileData();
        }
    });
}

function toggleAdminButtonsUI(show) {
    const elementsToToggle = [
        document.getElementById('nav-admin-link'),
        document.getElementById('btn-admin')
    ];

    elementsToToggle.forEach(el => {
        if (el) {
            if (show) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    });
}

function handleAuthSubmit(e) {
    e.preventDefault();
    if (!auth) return;

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    if (!emailInput || !passwordInput) return;

    const email = emailInput.value;
    const password = passwordInput.value;

    if (isSignUpMode) {
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                ensureUserProfileExists(user);
            })
            .then(() => {
                alert('Conta criada com sucesso!');
                const modal = document.getElementById('auth-modal');
                if (modal) modal.classList.add('hidden');
            })
            .catch((error) => alert('Erro no cadastro: ' + error.message));
    } else {
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                const modal = document.getElementById('auth-modal');
                if (modal) modal.classList.add('hidden');
            })
            .catch((error) => alert('Erro no login: ' + error.message));
    }
}

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
                kdRatio: '0.00',
                totalKills: '0',
                winRate: '0%',
                mvpCount: '0',
                currentRank: 'Não Rankeado',
                rankHistory: [],
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

function loadUserProfileData() {
    if (!db) return;

    const targetUid = getProfileTargetUid();

    if (!targetUid) {
        setElementText('display-nickname', 'Visitante');
        setElementText('display-bio', 'Faça login para acessar o sistema.');
        return;
    }

    const isOwner = currentUser && (currentUser.uid === targetUid);

    const ownerElements = document.querySelectorAll('.owner-only-btn');
    ownerElements.forEach(el => {
        if (isOwner) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

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
            
            const modal = document.getElementById('profile-modal');
            if (modal) modal.classList.remove('hidden');
        }
    });
}

function handleProfileSave(e) {
    e.preventDefault();
    if (!currentUser || !db) return;

    const getVal = id => document.getElementById(id) ? document.getElementById(id).value : '';

    const updatedData = {
        nickname: getVal('profile-nickname'),
        gameRole: getVal('profile-role'),
        avatarUrl: getVal('profile-avatar'),
        bio: getVal('profile-bio'),
        favoriteWeapons: getVal('profile-favorite-weapons').split(',').map(s => s.trim()).filter(Boolean),
        favoriteMaps: getVal('profile-favorite-maps').split(',').map(s => s.trim()).filter(Boolean),
        clanHistory: getVal('profile-clan-history').split(',').map(s => s.trim()).filter(Boolean),
        competitiveCv: getVal('profile-competitive-cv'),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection('users').doc(currentUser.uid).update(updatedData).then(() => {
        alert('Seu perfil foi atualizado com sucesso!');
        const modal = document.getElementById('profile-modal');
        if (modal) modal.classList.add('hidden');
        loadUserProfileData();
    }).catch(err => {
        alert('Erro ao salvar perfil: ' + err.message);
    });
}

function listenUserGallery(targetUid) {
    const galleryGrid = document.getElementById('user-gallery-grid');
    if (!galleryGrid || !db) return;

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
                  let embedUrl = media.url ? media.url.replace("watch?v=", "embed/") : '';
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

function listenUserAchievements(targetUid) {
    const grid = document.getElementById('user-achievements-grid');
    if (!grid || !db) return;

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
                  <div class="user-trophy-card">
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
    if (!currentUser || !db) return;

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
        const modal = document.getElementById('achievement-modal');
        if (modal) modal.classList.add('hidden');
        const form = document.getElementById('achievement-form');
        if (form) form.reset();
    });
}

function listenUserFeed(targetUid) {
    const list = document.getElementById('user-posts-list');
    if (!list || !db) return;

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
    if (!currentUser || !db) return alert('Você precisa estar logado.');
    const input = document.getElementById('user-post-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    db.collection('users').doc(currentUser.uid).collection('posts').add({
        content: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        input.value = '';
    });
}

function handleNewGlobalPost() {
    if (!currentUser || !db) { alert('Faça login para publicar!'); return; }
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
    if (!postsContainer || !db) return;

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
    if (!currentUser || !db) { alert('Faça login para curtir!'); return; }
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
    const teamName = document.getElementById('match-team-name') ? document.getElementById('match-team-name').value : '';
    const whatsapp = document.getElementById('match-whatsapp') ? document.getElementById('match-whatsapp').value : '';

    db.collection('matches').add({
        userId: currentUser.uid,
        userEmail: currentUser.email,
        mode: mode,
        teamName: teamName,
        whatsapp: whatsapp,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert(`Inscrição confirmada para ${mode}! O seu confronto foi agendado com sucesso.`);
        const modal = document.getElementById('match-modal');
        if (modal) modal.classList.add('hidden');
        const form = document.getElementById('match-form');
        if (form) form.reset();
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

function listenLeaderboard() {
    const body = document.getElementById('leaderboard-body');
    if (!body) return;

    renderLeaderboard(mockLeaderboard);
}

function renderLeaderboard(data) {
    const body = document.getElementById('leaderboard-body');
    if (!body) return;
    body.innerHTML = '';

    data.forEach((item, index) => {
        let rankClass = '';
        if (index === 0) rankClass = 'top-1';
        else if (index === 1) rankClass = 'top-2';
        else if (index === 2) rankClass = 'top-3';

        body.innerHTML += `
            <tr>
                <td class="rank-position ${rankClass}">#${index + 1}</td>
                <td><strong>${item.name}</strong></td>
                <td>${item.kd}</td>
                <td>${item.wins}</td>
                <td><span class="highlight">${item.points} pts</span></td>
            </tr>
        `;
    });
}

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
                    <td><span class="role-tag ${userRole === 'admin' || userRole === 'GOD_ADM' ? 'role-admin' : 'role-player'}">${userRole}</span></td>
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

function switchProfileTab(tabId) {
    const contents = document.querySelectorAll('.insta-tab-content');
    contents.forEach(content => content.classList.remove('active'));

    const buttons = document.querySelectorAll('.insta-tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}