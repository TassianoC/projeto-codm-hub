// ==========================================================================
// LOBARK CODM ANALYTICS - INSPIRADO NO ESPORTS CHARTS
// ==========================================================================

const firebaseConfig = {
    apiKey: "AIzaSyBnysGMTtMQo0RbmEMjFPhBjZVLzovbgaA",
    authDomain: "projeto-codm-hub.firebaseapp.com",
    databaseURL: "https://projeto-codm-hub-default-rtdb.firebaseio.com",
    projectId: "projeto-codm-hub",
    storageBucket: "projeto-codm-hub.firebasestorage.app",
    messagingSenderId: "1038952355133",
    appId: "1:1038952355133:web:18f011328d2e111316a154"
};

// Instâncias do Firebase
let db = null;
let auth = null;
let lobbiesRef = null;
let rankingRef = null;
let usersRef = null;
let teamsRef = null;

// Estados Globais
let currentUser = null;
let currentUserProfile = null;
let currentViewingUserUid = null;
let isAdmin = false;
let currentModeFilter = 'MP'; // MP ou BR
const ADMIN_SECRET_PASSWORD = "lobark2026";

let lobbies = [];
let teamsRanking = [];
let registeredTeams = [];
let allProfiles = {};

document.addEventListener('DOMContentLoaded', () => {
    initParticles();

    try {
        if (typeof firebase !== 'undefined') {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.database();
            auth = firebase.auth();
            
            lobbiesRef = db.ref('lobbies');
            rankingRef = db.ref('ranking');
            usersRef = db.ref('users');
            teamsRef = db.ref('teams');

            listenToAuth();
            listenToFirebase();
        }
    } catch (e) {
        console.error("Erro no Firebase:", e);
    }
});

// AUTENTICAÇÃO E PRESENÇA EM TEMPO REAL
function listenToAuth() {
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        const guestView = document.getElementById('auth-guest-view');
        const userView = document.getElementById('auth-user-view');
        const userDisplayName = document.getElementById('user-display-name');

        if (user) {
            guestView.style.display = 'none';
            userView.style.display = 'flex';
            
            const userStatusRef = db.ref(`users/${user.uid}/isOnline`);
            userStatusRef.set(true);
            userStatusRef.onDisconnect().set(false);

            usersRef.child(user.uid).on('value', (snapshot) => {
                currentUserProfile = snapshot.val();
                if (currentUserProfile && currentUserProfile.nick) {
                    userDisplayName.innerText = currentUserProfile.nick;
                } else {
                    userDisplayName.innerText = user.email.split('@')[0];
                }
            });
        } else {
            guestView.style.display = 'block';
            userView.style.display = 'none';
            currentUserProfile = null;
        }
    });
}

// SINCRONIZAÇÃO EM TEMPO REAL
function listenToFirebase() {
    lobbiesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        lobbies = [];
        if (data) Object.keys(data).forEach(k => lobbies.push({ firebaseKey: k, ...data[k] }));
        renderLobbies();
    });

    rankingRef.on('value', (snapshot) => {
        const data = snapshot.val();
        teamsRanking = [];
        if (data) Object.keys(data).forEach(k => teamsRanking.push({ firebaseKey: k, ...data[k] }));
        renderRanking();
    });

    teamsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        registeredTeams = [];
        if (data) Object.keys(data).forEach(k => registeredTeams.push({ firebaseKey: k, ...data[k] }));
        renderTeams();
    });

    usersRef.on('value', (snapshot) => {
        allProfiles = snapshot.val() || {};
        renderOnlinePlayers();
    });
}

// FILTRAR RANKING POR MODO (MP / BR)
function filterRankingMode(mode) {
    currentModeFilter = mode;
    document.getElementById('btn-mode-mp').classList.toggle('active', mode === 'MP');
    document.getElementById('btn-mode-br').classList.toggle('active', mode === 'BR');
    renderRanking();
}

// RENDERIZAR RANKINGS ESTILO ESPORTS CHARTS
function renderRanking() {
    const tbody = document.getElementById('ranking-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filteredTeams = teamsRanking.filter(t => !t.mode || t.mode === currentModeFilter || t.mode === 'AMBOS');
    filteredTeams.sort((a, b) => (b.wins || 0) - (a.wins || 0));

    filteredTeams.forEach((team, index) => {
        const total = (team.wins || 0) + (team.losses || 0);
        const winrate = total > 0 ? (((team.wins || 0) / total) * 100).toFixed(1) + '%' : '0%';
        const peakViewers = team.peakViewers ? team.peakViewers.toLocaleString('pt-BR') : 'N/I';

        let actionsHTML = '';
        if (isAdmin) {
            actionsHTML = `
                <button class="btn-secondary" style="padding:4px 8px;" onclick="updateScore('${team.firebaseKey}', 1, 0)">+1 Vit</button>
                <button class="btn-secondary" style="padding:4px 8px; color:var(--crimson);" onclick="updateScore('${team.firebaseKey}', 0, 1)">+1 Der</button>
                <button class="btn-danger" style="padding:4px 8px;" onclick="removeTeam('${team.firebaseKey}')">Excluir</button>
            `;
        } else {
            actionsHTML = `<span style="font-size:0.8rem; color:var(--text-muted);">Somente Leitura</span>`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>#${index + 1}</strong></td>
            <td><strong>${team.name}</strong></td>
            <td><span class="badge badge-${team.tier ? team.tier.toLowerCase() : 't3'}">${team.tier || 'T3'}</span></td>
            <td style="color: var(--accent); font-weight: bold;">${team.wins || 0}</td>
            <td style="color: var(--crimson);">${team.losses || 0}</td>
            <td>${winrate}</td>
            <td><i class="fa-solid fa-eye" style="color:var(--accent);"></i> ${peakViewers}</td>
            <td>${actionsHTML}</td>
        `;
        tbody.appendChild(row);
    });

    if (filteredTeams.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-muted);">Nenhum clã registrado para o modo ${currentModeFilter}.</td></tr>`;
    }
}

// PERFIL DETALHADO ESTILO ESPORTS CHARTS
function viewPlayerProfileByNick(nick) {
    let foundUid = null;
    let foundProfile = null;

    Object.keys(allProfiles).forEach(uid => {
        if (allProfiles[uid].nick && allProfiles[uid].nick.toLowerCase() === nick.toLowerCase()) {
            foundUid = uid;
            foundProfile = allProfiles[uid];
        }
    });

    currentViewingUserUid = foundUid;

    if (foundProfile) {
        document.getElementById('view-profile-nick').innerText = foundProfile.nick;
        document.getElementById('view-profile-kd').innerText = foundProfile.kd || '0.00';
        document.getElementById('view-profile-role-badge').innerText = foundProfile.role || 'Flex';
        
        // Métricas Esports Charts
        document.getElementById('view-profile-peak-viewers').innerText = foundProfile.peakViewers ? parseInt(foundProfile.peakViewers).toLocaleString('pt-BR') : '0';
        document.getElementById('view-profile-hours-watched').innerText = foundProfile.hoursWatched ? foundProfile.hoursWatched + 'h' : '0h';
        document.getElementById('view-profile-earnings').innerText = foundProfile.earnings ? 'R$ ' + parseInt(foundProfile.earnings).toLocaleString('pt-BR') : 'R$ 0';
        
        // Gears & Configurações
        document.getElementById('view-profile-device').innerText = foundProfile.device || 'Não cadastrado';
        document.getElementById('view-profile-hud').innerText = foundProfile.hud || 'Não informado';
        document.getElementById('view-profile-sens').innerText = foundProfile.sens || 'Não informada';
        
        if (foundProfile.stream) {
            document.getElementById('view-profile-stream').innerHTML = `<a href="${foundProfile.stream}" target="_blank" style="color:var(--accent);">${foundProfile.stream}</a>`;
            document.getElementById('view-profile-live-tag').style.display = 'inline-block';
        } else {
            document.getElementById('view-profile-stream').innerText = 'Nenhum canal ativo';
            document.getElementById('view-profile-live-tag').style.display = 'none';
        }

        const statusDot = document.getElementById('view-profile-status-dot');
        statusDot.className = foundProfile.isOnline ? 'status-indicator online' : 'status-indicator offline';
    } else {
        document.getElementById('view-profile-nick').innerText = nick;
        document.getElementById('view-profile-kd').innerText = 'N/A';
        document.getElementById('view-profile-peak-viewers').innerText = '0';
        document.getElementById('view-profile-hours-watched').innerText = '0h';
        document.getElementById('view-profile-earnings').innerText = 'R$ 0';
        document.getElementById('view-profile-device').innerText = 'Não cadastrado';
        document.getElementById('view-profile-hud').innerText = 'Não informado';
        document.getElementById('view-profile-sens').innerText = 'Não informada';
        document.getElementById('view-profile-stream').innerText = 'Nenhum';
        document.getElementById('view-profile-live-tag').style.display = 'none';
        document.getElementById('view-profile-status-dot').className = 'status-indicator offline';
    }

    const adminControls = document.getElementById('admin-player-controls');
    if (adminControls) adminControls.style.display = (isAdmin && foundUid) ? 'block' : 'none';

    switchTab('profile');
}

// SALVAR PERFIL PRO
function handleSaveProfile(e) {
    e.preventDefault();
    if (!currentUser) return alert("Faça login para continuar.");

    const nick = document.getElementById('edit-nick').value.trim();
    const kd = document.getElementById('edit-kd').value.trim();
    const winrate = document.getElementById('edit-winrate').value.trim();
    const role = document.getElementById('edit-role').value;
    const device = document.getElementById('edit-device').value.trim();
    const hud = document.getElementById('edit-hud').value;
    const peakViewers = document.getElementById('edit-peak-viewers').value;
    const earnings = document.getElementById('edit-earnings').value;
    const stream = document.getElementById('edit-stream').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();

    usersRef.child(currentUser.uid).update({
        nick, kd, winrate, role, device, hud, peakViewers, earnings, stream, bio, isOnline: true
    }).then(() => {
        alert("Perfil profissional atualizado!");
        closeModal('edit-profile');
        viewPlayerProfileByNick(nick);
    });
}

// DEMAIS FUNÇÕES DE SUPORTE
function renderOnlinePlayers() {
    const container = document.getElementById('online-players-grid');
    const badge = document.getElementById('online-count-badge');
    if (!container) return;
    container.innerHTML = '';
    let onlineCount = 0;

    Object.keys(allProfiles).forEach(uid => {
        const profile = allProfiles[uid];
        if (profile.isOnline) {
            onlineCount++;
            const card = document.createElement('div');
            card.className = 'card glass-panel';
            card.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
                    <span class="status-indicator online"></span>
                    <h3 style="font-family: var(--font-heading);">${profile.nick || 'Jogador CODM'}</h3>
                </div>
                <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:12px;">
                    Função: <strong>${profile.role || 'Flex'}</strong> | Dispositivo: <strong>${profile.device || 'N/I'}</strong>
                </p>
                <button class="btn-secondary btn-block" onclick="viewPlayerProfileByNick('${profile.nick}')">Ver Estatísticas</button>
            `;
            container.appendChild(card);
        }
    });

    if (badge) badge.innerText = onlineCount;
    if (onlineCount === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); grid-column: 1/-1; text-align:center; padding: 40px 0;">Nenhum jogador online no momento.</p>`;
    }
}

function renderTeams() {
    const container = document.getElementById('teams-grid');
    if (!container) return;
    container.innerHTML = '';

    if (registeredTeams.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); grid-column: 1/-1; text-align:center; padding: 40px 0;">Nenhuma organização cadastrada.</p>`;
        return;
    }

    registeredTeams.forEach(team => {
        const card = document.createElement('div');
        card.className = 'card glass-panel';
        let adminControls = isAdmin ? `<button class="btn-danger btn-block" style="margin-top:10px;" onclick="adminDeleteTeam('${team.firebaseKey}')"><i class="fa-solid fa-trash"></i> Excluir Equipe</button>` : '';

        card.innerHTML = `
            <span class="badge badge-${team.tier ? team.tier.toLowerCase() : 't3'}">${team.tier || 'T3'}</span>
            <span class="badge badge-tech" style="margin-left:5px;">${team.mode || 'MP'}</span>
            <h3 style="font-family: var(--font-heading); margin-top:8px;">${team.name}</h3>
            <p style="color: var(--text-secondary); font-size:0.85rem; margin:8px 0;">${team.desc || 'Sem descrição.'}</p>
            <button class="btn-primary btn-block" onclick="openTeamDetails('${team.firebaseKey}')">Relatório & Lineup</button>
            ${adminControls}
        `;
        container.appendChild(card);
    });
}

function openTeamDetails(teamKey) {
    const team = registeredTeams.find(t => t.firebaseKey === teamKey);
    if (!team) return;

    document.getElementById('modal-team-title').innerHTML = `<i class="fa-solid fa-shield"></i> ${team.name} [${team.tier || 'T3'}]`;
    const rosterList = team.roster ? team.roster.split(',').map(nick => nick.trim()) : [];

    let rosterHTML = rosterList.map(nick => `
        <li style="padding:6px; cursor:pointer; color:var(--accent);" onclick="closeModal('team-details'); viewPlayerProfileByNick('${nick}')">
            <i class="fa-solid fa-user-ninja"></i> ${nick}
        </li>
    `).join('');

    const body = document.getElementById('modal-team-body');
    body.innerHTML = `
        <div style="margin-bottom:15px;">
            <h4 style="color:var(--text-secondary);">Modalidade Principal:</h4>
            <p style="color:var(--accent); font-weight:bold;">${team.mode || 'Multiplayer 5v5'}</p>
        </div>
        <div style="margin-bottom:15px;">
            <h4 style="color:var(--text-secondary);">Histórico / Títulos:</h4>
            <p>${team.achievements || 'Nenhum título registrado.'}</p>
        </div>
        <div class="lineup-box">
            <h4>Lineup Oficial (Clique para ver Perfil Pro):</h4>
            <ul>${rosterHTML || '<li>Nenhum jogador escalado</li>'}</ul>
        </div>
    `;

    openModal('team-details');
}

function handleCreateTeam(e) {
    e.preventDefault();
    const name = document.getElementById('team-name').value;
    const mode = document.getElementById('team-mode').value;
    const tier = document.getElementById('team-tier').value;
    const desc = document.getElementById('team-desc').value;
    const achievements = document.getElementById('team-achievements').value;
    const roster = document.getElementById('team-roster').value;

    if (teamsRef) {
        teamsRef.push({ name, mode, tier, desc, achievements, roster, peakViewers: Math.floor(Math.random() * 500) + 100 }).then(() => {
            alert("Organização cadastrada!");
            closeModal('create-team');
        });
    }
}

function renderLobbies() {
    const container = document.getElementById('lobbies-container');
    if (!container) return;
    container.innerHTML = '';

    if (lobbies.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); grid-column: 1/-1; text-align:center; padding: 40px 0;">Nenhum lobby ativo no momento.</p>`;
        return;
    }

    lobbies.forEach(lobby => {
        const card = document.createElement('div');
        card.className = 'card glass-panel';

        let lineupHTML = '';
        if (lobby.lineup && lobby.lineup.length > 0) {
            lineupHTML = `
                <div class="lineup-box">
                    <h4>Escalação (Clique para ver Perfil):</h4>
                    <ul>${lobby.lineup.map(p => `<li style="cursor:pointer; color:var(--accent);" onclick="viewPlayerProfileByNick('${p}')"><i class="fa-solid fa-user"></i> ${p}</li>`).join('')}</ul>
                </div>
            `;
        }

        let adminControls = isAdmin ? `<button class="btn-danger btn-block" style="margin-top:10px;" onclick="cancelLobby('${lobby.firebaseKey}')"><i class="fa-solid fa-trash"></i> Cancelar Lobby</button>` : '';

        card.innerHTML = `
            <span class="badge ${lobby.badgeClass || 'badge-t3'}">${lobby.type}</span>
            <h3 style="font-family: var(--font-heading); margin-top:5px;">${lobby.team}</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">⏰ Horário: <strong>${lobby.time}</strong></p>
            ${lineupHTML}
            <button class="btn-primary btn-block" onclick="acceptChallenge('${lobby.firebaseKey}')">${lobby.challenger ? 'Desafiado por ' + lobby.challenger : 'Aceitar Desafio'}</button>
            ${adminControls}
        `;
        container.appendChild(card);
    });
}

function handleCreateScrim(e) {
    e.preventDefault();
    const type = document.getElementById('scrim-type').value;
    const time = document.getElementById('scrim-time').value;
    const team = document.getElementById('scrim-team-name').value;
    const lineup = [
        document.getElementById('p1').value.trim(),
        document.getElementById('p2').value.trim(),
        document.getElementById('p3').value.trim(),
        document.getElementById('p4').value.trim(),
        document.getElementById('p5').value.trim()
    ];

    lobbiesRef.push({ type, time, team, lineup, challenger: null, badgeClass: type.includes('T1') ? 'badge-t1' : 'badge-t3' }).then(() => {
        closeModal('scrim');
        document.getElementById('form-scrim').reset();
    });
}

function handleCreateX1(e) {
    e.preventDefault();
    const player = document.getElementById('x1-player').value.trim();
    const time = document.getElementById('x1-time').value;
    const mode = document.getElementById('x1-mode').value;

    lobbiesRef.push({ type: 'X1', time, team: `${player} (X1)`, mode, lineup: [player], challenger: null, badgeClass: 'badge-x1' }).then(() => {
        closeModal('x1');
        document.getElementById('form-x1').reset();
    });
}

function handleGoogleLogin() { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(() => closeModal('auth')); }
function handleEmailAuth(e) {
    e.preventDefault();
    auth.signInWithEmailAndPassword(document.getElementById('auth-email').value, document.getElementById('auth-password').value).then(() => closeModal('auth')).catch(err => alert(err.message));
}
function handleRegister() {
    auth.createUserWithEmailAndPassword(document.getElementById('auth-email').value, document.getElementById('auth-password').value).then(() => { closeModal('auth'); openModal('edit-profile'); });
}
function handleLogout() { auth.signOut(); }

function toggleAdminMode() {
    if (!isAdmin) {
        if (prompt("Digite a senha de ADM:") === ADMIN_SECRET_PASSWORD) {
            isAdmin = true;
            atualizarInterfaceAdmin();
            alert("Modo Administrador Ativado!");
        }
    } else {
        isAdmin = false;
        atualizarInterfaceAdmin();
    }
}

function atualizarInterfaceAdmin() {
    document.getElementById('role-label').innerText = isAdmin ? 'ADMINISTRADOR' : 'JOGADOR';
    renderLobbies();
    renderRanking();
    renderTeams();
}

function adminBanPlayer() {
    if (!isAdmin || !currentViewingUserUid) return;
    if (confirm("PODER SUPREMO DE ADM: Deseja BANIR este jogador permanentemente?")) {
        usersRef.child(currentViewingUserUid).remove().then(() => { alert("Jogador banido!"); switchTab('online'); });
    }
}

function adminDeleteTeam(teamKey) {
    if (!isAdmin) return;
    if (confirm("PODER SUPREMO DE ADM: Deseja EXCLUIR este clã?")) {
        teamsRef.child(teamKey).remove().then(() => alert("Clã excluído!"));
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) activeTab.classList.add('active');
}

function acceptChallenge(key) {
    const myTeam = prompt("Nome da sua equipe:");
    if (myTeam) lobbiesRef.child(key).update({ challenger: myTeam });
}

function cancelLobby(key) { if (isAdmin && confirm("Excluir lobby?")) lobbiesRef.child(key).remove(); }
function updateScore(key, w, l) {
    if (!isAdmin) return;
    const team = teamsRanking.find(t => t.firebaseKey === key);
    if (team) rankingRef.child(key).update({ wins: (team.wins || 0) + w, losses: (team.losses || 0) + l });
}
function removeTeam(key) { if (isAdmin && confirm("Remover clã?")) rankingRef.child(key).remove(); }

function openModal(t) { const m = document.getElementById(`modal-${t}`); if (m) m.classList.add('active'); }
function closeModal(t) { const m = document.getElementById(`modal-${t}`); if (m) m.classList.remove('active'); }

function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const particles = Array.from({ length: 30 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5
    }));

    function draw() {
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;

            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = '#00f3ff';
            ctx.globalAlpha = 0.3;
            ctx.fill();
        });
        requestAnimationFrame(draw);
    }
    draw();
}