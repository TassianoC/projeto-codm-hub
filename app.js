// Configuração do Firebase (Insira suas chaves do Firebase Console)
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
let currentMatchId = null;
const ADMIN_EMAILS = ["seuemail@admin.com"]; // Adicione seu e-mail aqui

// NAVEGAÇÃO ENTRE ABAS
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
}

function switchRecruitSubTab(subTab) {
    document.getElementById('lft-section').classList.toggle('hidden', subTab !== 'lft');
    document.getElementById('lfm-section').classList.toggle('hidden', subTab !== 'lfm');
}

// AUTENTICAÇÃO
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
        document.getElementById('user-badge').classList.remove('hidden');
        document.getElementById('user-display-name').innerText = user.displayName;

        if (ADMIN_EMAILS.includes(user.email)) {
            document.getElementById('admin-nav-btn').classList.remove('hidden');
        }

        loadProfileData();
        listenNotifications();
        loadAllData();
    } else {
        currentUser = null;
        document.getElementById('login-btn').classList.remove('hidden');
        document.getElementById('user-badge').classList.add('hidden');
        document.getElementById('admin-nav-btn').classList.add('hidden');
    }
});

// CARREGAR DADOS INICIAIS
function loadAllData() {
    loadTeams();
    loadLFT();
    loadLFM();
    loadScrims();
    loadX1();
    loadRanking();
}

// PERFIL
function saveProfile(e) {
    e.preventDefault();
    if (!currentUser) return alert("Autentique-se primeiro.");

    const profile = {
        ign: document.getElementById('p-ign').value,
        uid: document.getElementById('p-uid').value,
        role: document.getElementById('p-role').value,
        tier: document.getElementById('p-tier').value,
        discord: document.getElementById('p-discord').value,
        loadout: document.getElementById('p-loadout').value,
        bio: document.getElementById('p-bio').value,
        email: currentUser.email,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection('users').doc(currentUser.uid).set(profile, { merge: true }).then(() => {
        alert("Perfil atualizado!");
        loadProfileData();
    });
}

function loadProfileData() {
    db.collection('users').doc(currentUser.uid).get().then(doc => {
        if (doc.exists) {
            const d = doc.data();
            document.getElementById('p-ign').value = d.ign || '';
            document.getElementById('p-uid').value = d.uid || '';
            document.getElementById('p-role').value = d.role || 'IGL';
            document.getElementById('p-tier').value = d.tier || 'T1';
            document.getElementById('p-discord').value = d.discord || '';
            document.getElementById('p-loadout').value = d.loadout || '';
            document.getElementById('p-bio').value = d.bio || '';

            document.getElementById('profile-card-preview').innerHTML = `
                <h4>${d.ign || 'Sem Nick'} (${d.tier || 'T3'})</h4>
                <p><strong>Role:</strong> ${d.role || 'N/A'}</p>
                <p><strong>Discord:</strong> ${d.discord || 'N/A'}</p>
                <p><strong>CODM UID:</strong> ${d.uid || 'N/A'}</p>
                <p><strong>Loadout:</strong> ${d.loadout || 'N/A'}</p>
                <p><em>"${d.bio || ''}"</em></p>
            `;
        }
    });
}

// LINEUPS
function createTeam(e) {
    e.preventDefault();
    const name = document.getElementById('team-name').value;
    const tag = document.getElementById('team-tag').value;
    const tier = document.getElementById('team-tier').value;

    db.collection('teams').add({
        name, tag, tier, owner: currentUser.uid, members: [currentUser.uid]
    }).then(() => loadTeams());
}

function loadTeams() {
    db.collection('teams').onSnapshot(snap => {
        const list = document.getElementById('teams-list');
        list.innerHTML = '';
        snap.forEach(doc => {
            const t = doc.data();
            list.innerHTML += `<div class="card"><h4>[${t.tag}] ${t.name}</h4><p>Tier: ${t.tier}</p></div>`;
        });
    });
}

// RECRUTAMENTO (LFT & LFM)
function postLFT(e) {
    e.preventDefault();
    db.collection('lft').add({
        user: currentUser.displayName,
        role: document.getElementById('lft-role').value,
        availability: document.getElementById('lft-availability').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => loadLFT());
}

function loadLFT() {
    db.collection('lft').orderBy('createdAt', 'desc').onSnapshot(snap => {
        const list = document.getElementById('lft-list');
        list.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `<div class="card"><h4>${d.user} (LFT)</h4><p>Role: ${d.role}</p><p>Disp: ${d.availability}</p></div>`;
        });
    });
}

function postLFM(e) {
    e.preventDefault();
    db.collection('lfm').add({
        team: document.getElementById('lfm-team').value,
        roleNeeded: document.getElementById('lfm-role-needed').value,
        reqs: document.getElementById('lfm-reqs').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => loadLFM());
}

function loadLFM() {
    db.collection('lfm').orderBy('createdAt', 'desc').onSnapshot(snap => {
        const list = document.getElementById('lfm-list');
        list.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `<div class="card"><h4>Lineup: ${d.team} (LFM)</h4><p>Procura: ${d.roleNeeded}</p><p>Reqs: ${d.reqs}</p></div>`;
        });
    });
}

// SCRIMS & X1
function createScrim(e) {
    e.preventDefault();
    db.collection('matches').add({
        title: document.getElementById('scrim-title').value,
        tier: document.getElementById('scrim-tier').value,
        mode: document.getElementById('scrim-mode').value,
        time: document.getElementById('scrim-time').value,
        type: 'SCRIM',
        status: 'ABERTO',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => loadScrims());
}

function loadScrims() {
    db.collection('matches').where('type', '==', 'SCRIM').onSnapshot(snap => {
        const list = document.getElementById('scrims-list');
        list.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `
                <div class="card">
                    <h4>${d.title} (${d.tier})</h4>
                    <p>${d.mode} - ${d.time}</p>
                    <button class="btn-primary" onclick="enterMatchLobby('${doc.id}')">Entrar no Lobby</button>
                </div>`;
        });
    });
}

function createX1(e) {
    e.preventDefault();
    db.collection('matches').add({
        title: `X1: ${currentUser.displayName}`,
        map: document.getElementById('x1-map').value,
        rules: document.getElementById('x1-rules').value,
        type: 'X1',
        status: 'ABERTO',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => loadX1());
}

function loadX1() {
    db.collection('matches').where('type', '==', 'X1').onSnapshot(snap => {
        const list = document.getElementById('x1-list');
        list.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            list.innerHTML += `
                <div class="card">
                    <h4>${d.title}</h4>
                    <p>Mapa: ${d.map} | Regras: ${d.rules}</p>
                    <button class="btn-primary" onclick="enterMatchLobby('${doc.id}')">Aceitar Desafio</button>
                </div>`;
        });
    });
}

// LOBBY DA PARTIDA EM TEMPO REAL & CHAT
function enterMatchLobby(matchId) {
    document.getElementById('match-id-input').value = matchId;
    showTab('match-tab');
    loadMatchLobby();
}

function loadMatchLobby() {
    currentMatchId = document.getElementById('match-id-input').value;
    if (!currentMatchId) return alert("Insira o ID da partida.");

    document.getElementById('match-active-area').classList.remove('hidden');

    db.collection('matches').doc(currentMatchId).onSnapshot(doc => {
        if (doc.exists) {
            const d = doc.data();
            document.getElementById('match-title-display').innerText = d.title;
            document.getElementById('match-status-badge').innerText = d.status;
        }
    });

    // Subscrição ao Chat da Sala
    db.collection('matches').doc(currentMatchId).collection('messages')
        .orderBy('createdAt', 'asc').onSnapshot(snap => {
            const box = document.getElementById('chat-messages');
            box.innerHTML = '';
            snap.forEach(m => {
                const msg = m.data();
                box.innerHTML += `<div><strong>${msg.sender}:</strong> ${msg.text}</div>`;
            });
            box.scrollTop = box.scrollHeight;
        });
}

function sendChatMessage(e) {
    e.preventDefault();
    if (!currentMatchId || !currentUser) return;

    const input = document.getElementById('chat-text');
    db.collection('matches').doc(currentMatchId).collection('messages').add({
        sender: currentUser.displayName,
        text: input.value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => input.value = '');
}

function submitMatchProof(e) {
    e.preventDefault();
    if (!currentMatchId) return;

    db.collection('matches').doc(currentMatchId).update({
        score: document.getElementById('match-score').value,
        proofUrl: document.getElementById('match-proof-url').value,
        status: 'AGUARDANDO VALIDACAO'
    }).then(() => alert("Resultado enviado para análise!"));
}

function openDisputeTicket() {
    if (!currentMatchId) return;
    db.collection('tickets').add({
        matchId: currentMatchId,
        openedBy: currentUser.displayName,
        status: 'ABERTO',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => alert("Ticket de disputa aberto! Um moderador analisará a sala."));
}

// RANKING
function loadRanking() {
    db.collection('users').orderBy('points', 'desc').get().then(snap => {
        const body = document.getElementById('ranking-table-body');
        body.innerHTML = '';
        let i = 1;
        snap.forEach(doc => {
            const u = doc.data();
            body.innerHTML += `
                <tr>
                    <td>#${i++}</td>
                    <td>${u.ign || 'N/A'}</td>
                    <td>${u.tier || 'T3'}</td>
                    <td>${u.role || 'N/A'}</td>
                    <td>${u.points || 0}</td>
                    <td>⭐ ${u.fairPlay || '5.0'}</td>
                </tr>
            `;
        });
    });
}

// NOTIFICAÇÕES
function listenNotifications() {
    db.collection('notifications').where('targetUser', '==', currentUser.uid)
        .onSnapshot(snap => {
            document.getElementById('notif-count').innerText = snap.size;
            const list = document.getElementById('notif-list');
            list.innerHTML = '';
            snap.forEach(doc => {
                const n = doc.data();
                list.innerHTML += `<div class="card"><p>${n.message}</p></div>`;
            });
        });
}