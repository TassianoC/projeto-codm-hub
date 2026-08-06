// Configuração do Firebase
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
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
const ADMIN_EMAILS = ["seuemail@admin.com"];

// 1. ANIMAÇÃO DE PARTÍCULAS EM CANVAS
const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d');
let particlesArray = [];

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
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
        this.color = Math.random() > 0.5 ? '#ff4655' : '#00f0ff';
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
    particlesArray = [];
    for (let i = 0; i < 70; i++) {
        particlesArray.push(new Particle());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particlesArray.forEach(p => {
        p.update();
        p.draw();
    });
    requestAnimationFrame(animateParticles);
}
initParticles();
animateParticles();

// 2. NAVEGAÇÃO DE ABAS
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
}

// 3. AUTENTICAÇÃO E PERMISSIONS
function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
}

function logout() {
    auth.signOut();
}

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('login-btn').classList.add('hidden');
        document.getElementById('user-profile').classList.remove('hidden');
        document.getElementById('user-name').innerText = user.displayName;
        document.getElementById('p-avatar').src = user.photoURL || 'https://via.placeholder.com/100';

        if (ADMIN_EMAILS.includes(user.email)) {
            isAdmin = true;
            document.getElementById('admin-nav-btn').classList.remove('hidden');
        }

        loadProfileData();
        loadFeed();
        loadScrims();
        loadX1();
        loadRanking();
    } else {
        currentUser = null;
        isAdmin = false;
        document.getElementById('login-btn').classList.remove('hidden');
        document.getElementById('user-profile').classList.add('hidden');
        document.getElementById('admin-nav-btn').classList.add('hidden');
    }
});

// 4. PERFIL DO JOGADOR
function saveProfile(e) {
    e.preventDefault();
    if (!currentUser) return alert("Faça login primeiro!");

    const ign = document.getElementById('p-ign').value;
    const role = document.getElementById('p-role').value;
    const tier = document.getElementById('p-tier').value;
    const loadout = document.getElementById('p-loadout').value;

    db.collection('users').doc(currentUser.uid).set({
        ign, role, tier, loadout,
        email: currentUser.email,
        kd: "2.45",
        winRate: "68%",
        mvp: "142",
        points: 1250
    }, { merge: true }).then(() => {
        alert("Perfil salvo!");
        loadProfileData();
    });
}

function loadProfileData() {
    if (!currentUser) return;
    db.collection('users').doc(currentUser.uid).get().then(doc => {
        if (doc.exists) {
            const d = doc.data();
            document.getElementById('p-ign').value = d.ign || '';
            document.getElementById('p-role').value = d.role || 'IGL';
            document.getElementById('p-tier').value = d.tier || 'T1';
            document.getElementById('p-loadout').value = d.loadout || '';

            document.getElementById('p-display-ign').innerText = d.ign || currentUser.displayName;
            document.getElementById('p-display-tier').innerText = d.tier || 'T3';
            document.getElementById('p-stat-kd').innerText = d.kd || '0.0';
            document.getElementById('p-stat-win').innerText = d.winRate || '0%';
            document.getElementById('p-stat-mvp').innerText = d.mvp || '0';
        }
    });
}

// 5. FEED ESTILO INSTAGRAM
function postToFeed(e) {
    e.preventDefault();
    if (!currentUser) return alert("Faça login para publicar!");

    const mediaUrl = document.getElementById('feed-media-url').value;
    const caption = document.getElementById('feed-caption').value;

    db.collection('feed').add({
        author: currentUser.displayName,
        authorUid: currentUser.uid,
        mediaUrl,
        caption,
        likes: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => loadFeed());
}

function loadFeed() {
    db.collection('feed').orderBy('createdAt', 'desc').onSnapshot(snap => {
        const container = document.getElementById('feed-posts-list');
        const adminContainer = document.getElementById('admin-feed-list');
        container.innerHTML = '';
        if (adminContainer) adminContainer.innerHTML = '';

        snap.forEach(doc => {
            const p = doc.data();
            const postCard = document.createElement('div');
            postCard.className = 'feed-post';
            postCard.innerHTML = `
                <img src="${p.mediaUrl}" alt="Mídia">
                <div class="feed-post-content">
                    <h4>${p.author}</h4>
                    <p>${p.caption}</p>
                    <div class="feed-post-actions">
                        <button class="btn-like" onclick="likePost('${doc.id}', ${p.likes || 0})">❤️ ${p.likes || 0} Curtidas</button>
                    </div>
                </div>
            `;
            container.appendChild(postCard);

            if (isAdmin && adminContainer) {
                adminContainer.innerHTML += `
                    <div>
                        <span>Post de ${p.author}</span>
                        <button onclick="deletePost('${doc.id}')">Excluir Post</button>
                    </div>
                `;
            }
        });
    });
}

function likePost(id, currentLikes) {
    db.collection('feed').doc(id).update({ likes: currentLikes + 1 });
}

function deletePost(id) {
    db.collection('feed').doc(id).delete();
}

// 6. SCRIMS & X1
function createScrim(e) {
    e.preventDefault();
    db.collection('scrims').add({
        title: document.getElementById('scrim-title').value,
        tier: document.getElementById('scrim-tier').value,
        mode: document.getElementById('scrim-mode').value,
        time: document.getElementById('scrim-time').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => loadScrims());
}

function loadScrims() {
    db.collection('scrims').orderBy('createdAt', 'desc').onSnapshot(snap => {
        const container = document.getElementById('scrims-list');
        const adminContainer = document.getElementById('admin-scrim-list');
        container.innerHTML = '';
        if (adminContainer) adminContainer.innerHTML = '';

        snap.forEach(doc => {
            const s = doc.data();
            container.innerHTML += `
                <div class="card">
                    <h3>${s.title} (${s.tier})</h3>
                    <p>Modo: ${s.mode} | Horário: ${s.time}</p>
                </div>
            `;
            if (isAdmin && adminContainer) {
                adminContainer.innerHTML += `
                    <div>
                        <span>Sala ${s.title} (${s.tier})</span>
                        <button onclick="deleteScrim('${doc.id}')">Cancelar Sala</button>
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
    db.collection('x1').add({
        map: document.getElementById('x1-map').value,
        rules: document.getElementById('x1-rules').value,
        challenger: currentUser.displayName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => loadX1());
}

function loadX1() {
    db.collection('x1').orderBy('createdAt', 'desc').onSnapshot(snap => {
        const container = document.getElementById('x1-list');
        container.innerHTML = '';
        snap.forEach(doc => {
            const x = doc.data();
            container.innerHTML += `
                <div class="card">
                    <h3>Desafiante: ${x.challenger}</h3>
                    <p>Mapa: ${x.map} | Regras: ${x.rules}</p>
                </div>
            `;
        });
    });
}

// 7. RANKING
function loadRanking() {
    db.collection('users').orderBy('points', 'desc').get().then(snap => {
        const body = document.getElementById('ranking-body');
        body.innerHTML = '';
        let rank = 1;
        snap.forEach(doc => {
            const u = doc.data();
            body.innerHTML += `
                <tr>
                    <td>#${rank++}</td>
                    <td>${u.ign || 'Desconhecido'}</td>
                    <td>${u.tier || 'T3'}</td>
                    <td>${u.role || 'N/A'}</td>
                    <td>${u.points || 0} pts</td>
                </tr>
            `;
        });
    });
}