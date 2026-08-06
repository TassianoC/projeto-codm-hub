// Configuração do Firebase
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let isAdmin = false;
let isRegisterMode = false;
const ADMIN_EMAILS = ["seuemail@admin.com"]; // Insira seu e-mail de admin aqui

// 1. ANIMAÇÃO DE PARTÍCULAS EM CANVAS
const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = Math.random() * 0.6 - 0.3;
        this.speedY = Math.random() * 0.6 - 0.3;
        this.color = Math.random() > 0.5 ? '#f97316' : '#00f0ff';
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    for (let i = 0; i < 60; i++) {
        particles.push(new Particle());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    requestAnimationFrame(animateParticles);
}
initParticles();
animateParticles();

// 2. NAVEGAÇÃO E MODAIS
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
}

function openAuthModal() {
    document.getElementById('auth-modal').classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.add('hidden');
}

function switchAuthMode(mode) {
    isRegisterMode = (mode === 'register');
    const btn = document.getElementById('auth-submit-btn');
    btn.innerText = isRegisterMode ? 'Cadastrar Conta' : 'Entrar com E-mail';
    
    document.querySelectorAll('.auth-tabs button').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

// 3. AUTENTICAÇÃO FIREBASE (Google & Email/Senha)
function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(() => closeAuthModal()).catch(err => alert(err.message));
}

function handleEmailAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;

    if (isRegisterMode) {
        auth.createUserWithEmailAndPassword(email, pass)
            .then(() => { closeAuthModal(); alert("Conta criada com sucesso!"); })
            .catch(err => alert(err.message));
    } else {
        auth.signInWithEmailAndPassword(email, pass)
            .then(() => closeAuthModal())
            .catch(err => alert(err.message));
    }
}

function logout() {
    auth.signOut();
}

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('open-auth-btn').classList.add('hidden');
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('user-name').innerText = user.displayName || user.email.split('@')[0];

        document.getElementById('profile-guest-msg').classList.add('hidden');
        document.getElementById('profile-member-area').classList.remove('hidden');

        if (ADMIN_EMAILS.includes(user.email)) {
            isAdmin = true;
            document.getElementById('admin-nav-btn').classList.remove('hidden');
        }

        loadProfile();
        loadFeed();
        loadScrims();
        loadX1();
        loadRanking();
    } else {
        currentUser = null;
        isAdmin = false;
        document.getElementById('open-auth-btn').classList.remove('hidden');
        document.getElementById('user-info').classList.add('hidden');
        document.getElementById('admin-nav-btn').classList.add('hidden');

        document.getElementById('profile-guest-msg').classList.remove('hidden');
        document.getElementById('profile-member-area').classList.add('hidden');
    }
});

// 4. PERFIL EDITÁVEL
function saveProfile(e) {
    e.preventDefault();
    if (!currentUser) return;

    db.collection('users').doc(currentUser.uid).set({
        ign: document.getElementById('p-ign').value,
        role: document.getElementById('p-role').value,
        tier: document.getElementById('p-tier').value,
        loadout: document.getElementById('p-loadout').value,
        email: currentUser.email,
        points: 150
    }, { merge: true }).then(() => {
        alert("Perfil atualizado com sucesso!");
        loadRanking();
    });
}

function loadProfile() {
    if (!currentUser) return;
    db.collection('users').doc(currentUser.uid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('p-ign').value = data.ign || '';
            document.getElementById('p-role').value = data.role || 'IGL';
            document.getElementById('p-tier').value = data.tier || 'T1';
            document.getElementById('p-loadout').value = data.loadout || '';
        }
    });
}

// 5. FEED DE MÍDIA (FOTOS E VÍDEOS)
function postToFeed(e) {
    e.preventDefault();
    if (!currentUser) return;

    db.collection('feed').add({
        author: currentUser.displayName || currentUser.email.split('@')[0],
        authorUid: currentUser.uid,
        mediaUrl: document.getElementById('feed-media-url').value,
        caption: document.getElementById('feed-caption').value,
        likes: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById('feed-media-url').value = '';
        document.getElementById('feed-caption').value = '';
        alert("Mídia publicada no feed!");
    });
}

function loadFeed() {
    db.collection('feed').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        const list = document.getElementById('feed-list');
        const adminFeed = document.getElementById('admin-feed-list');
        list.innerHTML = '';
        if (adminFeed) adminFeed.innerHTML = '';

        snapshot.forEach(doc => {
            const d = doc.data();
            
            // Renderização no Feed de Perfil
            list.innerHTML += `
                <div class="feed-post">
                    <div class="feed-media-container">
                        <img src="${d.mediaUrl}" alt="Mídia do Jogador" onerror="this.replaceWith(document.createElement('video')).src='${d.mediaUrl}'">
                    </div>
                    <div class="feed-content">
                        <h4>${d.author}</h4>
                        <p>${d.caption}</p>
                        <div class="feed-actions">
                            <button class="btn-like" onclick="likePost('${doc.id}', ${d.likes || 0})">❤️ ${d.likes || 0} Curtidas</button>
                        </div>
                    </div>
                </div>
            `;

            // Renderização no Painel Admin
            if (isAdmin && adminFeed) {
                adminFeed.innerHTML += `
                    <div style="margin-bottom: 10px;">
                        <span>Post de ${d.author}: "${d.caption}"</span>
                        <button class="btn-danger" onclick="deleteFeedPost('${doc.id}')">Excluir Post</button>
                    </div>
                `;
            }
        });
    });
}

function likePost(id, currentLikes) {
    db.collection('feed').doc(id).update({ likes: currentLikes + 1 });
}

function deleteFeedPost(id) {
    db.collection('feed').doc(id).delete().then(() => alert("Post removido pelo administrador."));
}

// 6. SCRIMS E X1
function createScrim(e) {
    e.preventDefault();
    db.collection('scrims').add({
        title: document.getElementById('scrim-title').value,
        tier: document.getElementById('scrim-tier').value,
        mode: document.getElementById('scrim-mode').value,
        time: document.getElementById('scrim-time').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => alert("Scrim publicada!"));
}

function loadScrims() {
    db.collection('scrims').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        const list = document.getElementById('scrims-list');
        const adminList = document.getElementById('admin-scrims-list');
        list.innerHTML = '';
        if (adminList) adminList.innerHTML = '';

        snapshot.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `
                <div class="card">
                    <h3>${d.title} (${d.tier})</h3>
                    <p><strong>Modo:</strong> ${d.mode}</p>
                    <p><strong>Horário:</strong> ${d.time}</p>
                </div>
            `;

            if (isAdmin && adminList) {
                adminList.innerHTML += `
                    <div style="margin-bottom: 10px;">
                        <span>${d.title} [${d.tier}]</span>
                        <button class="btn-danger" onclick="deleteScrim('${doc.id}')">Excluir Sala</button>
                    </div>
                `;
            }
        });
    });
}

function deleteScrim(id) {
    db.collection('scrims').doc(id).delete();
}

function createX1(e) {
    e.preventDefault();
    if (!currentUser) return alert("Faça login para criar desafios.");

    db.collection('x1').add({
        map: document.getElementById('x1-map').value,
        rules: document.getElementById('x1-rules').value,
        challenger: currentUser.displayName || currentUser.email.split('@')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => alert("Desafio X1 publicado!"));
}

function loadX1() {
    db.collection('x1').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        const list = document.getElementById('x1-list');
        list.innerHTML = '';
        snapshot.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `
                <div class="card">
                    <h3>Desafiante: ${d.challenger}</h3>
                    <p><strong>Mapa:</strong> ${d.map}</p>
                    <p><strong>Regras:</strong> ${d.rules}</p>
                </div>
            `;
        });
    });
}

// 7. RANKING
function loadRanking() {
    db.collection('users').orderBy('points', 'desc').get().then(snapshot => {
        const body = document.getElementById('ranking-body');
        body.innerHTML = '';
        let pos = 1;
        snapshot.forEach(doc => {
            const u = doc.data();
            body.innerHTML += `
                <tr>
                    <td>#${pos++}</td>
                    <td>${u.ign || 'Sem Nick'}</td>
                    <td>${u.tier || 'T3'}</td>
                    <td>${u.role || 'N/A'}</td>
                    <td>${u.points || 0} pts</td>
                </tr>
            `;
        });
    });
}