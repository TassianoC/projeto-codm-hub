// ==========================================================================
// LOBARK CODM HUB - VERSÃO ESTÁVEL & INTEGRADA COM FIREBASE
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

// Inicialização segura do Firebase
let db = null;
let lobbiesRef = null;
let rankingRef = null;

try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
    lobbiesRef = db.ref('lobbies');
    rankingRef = db.ref('ranking');
} catch (e) {
    console.error("Erro ao conectar com Firebase:", e);
}

// Estado da Aplicação
let isAdmin = false;
const ADMIN_SECRET_PASSWORD = "lobark2026"; // Senha para o Modo ADM

let lobbies = [];
let teamsRanking = [];

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initCursor();
    initThemePicker();
    
    if (lobbiesRef) {
        listenToFirebase();
    } else {
        renderLobbies();
        renderRanking();
    }
});

// Sincronização em Tempo Real
function listenToFirebase() {
    lobbiesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        lobbies = [];
        if (data) {
            Object.keys(data).forEach(key => {
                lobbies.push({ firebaseKey: key, ...data[key] });
            });
        }
        renderLobbies();
    }, (error) => {
        console.error("Erro na leitura dos Lobbies:", error);
    });

    rankingRef.on('value', (snapshot) => {
        const data = snapshot.val();
        teamsRanking = [];
        if (data) {
            Object.keys(data).forEach(key => {
                teamsRanking.push({ firebaseKey: key, ...data[key] });
            });
        }
        renderRanking();
    }, (error) => {
        console.error("Erro na leitura do Ranking:", error);
    });
}

// Troca do Modo ADM
function toggleAdminMode() {
    if (!isAdmin) {
        const pass = prompt("Digite a senha de Administrador LOBARK:");
        if (pass === ADMIN_SECRET_PASSWORD) {
            isAdmin = true;
            atualizarInterfaceAdmin();
            alert("Acesso Concedido: Modo Administrador Ativado!");
        } else if (pass !== null) {
            alert("Senha incorreta!");
        }
    } else {
        isAdmin = false;
        atualizarInterfaceAdmin();
        alert("Modo Administrador Desativado.");
    }
}

function atualizarInterfaceAdmin() {
    const label = document.getElementById('role-label');
    const btn = document.getElementById('admin-toggle-btn');

    if (label && btn) {
        if (isAdmin) {
            label.innerText = 'ADMINISTRADOR';
            label.style.color = 'var(--crimson)';
            btn.style.borderColor = 'var(--crimson)';
            document.body.classList.add('admin-mode');
        } else {
            label.innerText = 'JOGADOR';
            label.style.color = 'var(--accent)';
            btn.style.borderColor = 'var(--accent)';
            document.body.classList.remove('admin-mode');
        }
    }

    renderLobbies();
    renderRanking();
}

// Navegação entre Abas
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) activeTab.classList.add('active');
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

// Visualizar Perfil Pro
function viewPlayerProfile(playerName) {
    const cleanName = playerName.split(' ')[0];
    const profileNameEl = document.getElementById('player-profile-name');
    const cardNameEl = document.getElementById('card-player-name');

    if (profileNameEl) profileNameEl.innerHTML = `${cleanName}<span class="glow-text">_PRO</span>`;
    if (cardNameEl) cardNameEl.innerText = cleanName;

    switchTab('profile');
}

// Renderizar Lobbies
function renderLobbies() {
    const container = document.getElementById('lobbies-container');
    if (!container) return;
    
    container.innerHTML = '';

    if (lobbies.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); grid-column: 1/-1; text-align:center;">Nenhum lobby agendado no momento.</p>`;
        return;
    }

    lobbies.forEach(lobby => {
        const card = document.createElement('div');
        card.className = 'card glass-panel';

        let lineupHTML = '';
        if (lobby.lineup && lobby.lineup.length > 0) {
            lineupHTML = `
                <div class="lineup-box">
                    <h4>Escalação CODM (5v5):</h4>
                    <ul>
                        ${lobby.lineup.map(p => `<li style="cursor:pointer;" onclick="viewPlayerProfile('${p}')"><i class="fa-solid fa-user"></i> ${p}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else if (lobby.mode) {
            lineupHTML = `<div class="lineup-box"><h4>Regras X1:</h4><p style="font-size:0.85rem">${lobby.mode}</p></div>`;
        }

        let adminControlsHTML = '';
        if (isAdmin) {
            adminControlsHTML = `
                <div class="admin-actions">
                    <button class="btn-danger" onclick="cancelLobby('${lobby.firebaseKey}')"><i class="fa-solid fa-trash"></i> Cancelar Lobby (ADM)</button>
                </div>
            `;
        }

        card.innerHTML = `
            <span class="badge ${lobby.badgeClass || 'badge-t3'}">${lobby.type}</span>
            <h3 style="font-family: var(--font-heading);">${lobby.team}</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 5px;">⏰ Horário: <strong>${lobby.time}</strong></p>
            ${lineupHTML}
            <button class="btn-primary" onclick="acceptChallenge('${lobby.firebaseKey}')">
                ${lobby.challenger ? 'Desafiado por ' + lobby.challenger : 'Aceitar Desafio'}
            </button>
            ${adminControlsHTML}
        `;
        container.appendChild(card);
    });
}

// Renderizar Ranking
function renderRanking() {
    const tbody = document.getElementById('ranking-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    teamsRanking.sort((a, b) => (b.wins || 0) - (a.wins || 0));

    teamsRanking.forEach((team, index) => {
        const total = (team.wins || 0) + (team.losses || 0);
        const winrate = total > 0 ? (((team.wins || 0) / total) * 100).toFixed(1) + '%' : '0%';

        let actionsHTML = '';
        if (isAdmin) {
            actionsHTML = `
                <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; color: var(--accent);" onclick="updateScore('${team.firebaseKey}', 1, 0)">+1 Vit</button>
                <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; color: var(--crimson);" onclick="updateScore('${team.firebaseKey}', 0, 1)">+1 Der</button>
                <button class="btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="removeTeam('${team.firebaseKey}')">Remover</button>
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
            <td>${actionsHTML}</td>
        `;
        tbody.appendChild(row);
    });
}

// Manipulação do Modal e Formulários
function openModal(type) { 
    const el = document.getElementById(`modal-${type}`);
    if (el) el.classList.add('active'); 
}

function closeModal(type) { 
    const el = document.getElementById(`modal-${type}`);
    if (el) el.classList.remove('active'); 
}

function handleCreateScrim(e) {
    e.preventDefault();
    const type = document.getElementById('scrim-type').value;
    const time = document.getElementById('scrim-time').value;
    const team = document.getElementById('scrim-team-name').value;

    const lineup = [
        document.getElementById('p1').value,
        document.getElementById('p2').value,
        document.getElementById('p3').value,
        document.getElementById('p4').value,
        document.getElementById('p5').value,
    ];

    let badgeClass = 'badge-t3';
    if (type.includes('T1')) badgeClass = 'badge-t1';
    if (type.includes('T2')) badgeClass = 'badge-t2';

    if (lobbiesRef) {
        lobbiesRef.push({
            type, time, team, lineup, challenger: null, badgeClass
        });
    }

    closeModal('scrim');
}

function handleCreateX1(e) {
    e.preventDefault();
    const player = document.getElementById('x1-player').value;
    const time = document.getElementById('x1-time').value;
    const mode = document.getElementById('x1-mode').value;

    if (lobbiesRef) {
        lobbiesRef.push({
            type: 'X1', time, team: `${player} (X1)`, mode, lineup: [], challenger: null, badgeClass: 'badge-x1'
        });
    }

    closeModal('x1');
}

// Ações do ADM / Usuários
function acceptChallenge(firebaseKey) {
    const myTeam = prompt("Digite o nome da sua equipe/clã para aceitar o confronto:");
    if (myTeam && lobbiesRef) {
        lobbiesRef.child(firebaseKey).update({ challenger: myTeam });
        alert(`Desafio confirmado! Sua equipe foi registrada no lobby.`);
    }
}

function cancelLobby(firebaseKey) {
    if (!isAdmin) return;
    if (confirm("Tem certeza que deseja CANCELAR este lobby da nuvem?")) {
        if (lobbiesRef) {
            lobbiesRef.child(firebaseKey).remove();
        }
    }
}

function updateScore(firebaseKey, winAdd, lossAdd) {
    if (!isAdmin) return;
    const team = teamsRanking.find(t => t.firebaseKey === firebaseKey);
    if (team && rankingRef) {
        rankingRef.child(firebaseKey).update({
            wins: (team.wins || 0) + winAdd,
            losses: (team.losses || 0) + lossAdd
        });
    }
}

function removeTeam(firebaseKey) {
    if (!isAdmin) return;
    if (confirm("Remover esta equipe do ranking permanente?")) {
        if (rankingRef) {
            rankingRef.child(firebaseKey).remove();
        }
    }
}

// Efeitos Visuais
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

function initCursor() {
    const cursor = document.getElementById('cursor');
    const follower = document.getElementById('cursor-follower');
    if (!cursor || !follower) return;
    document.addEventListener('mousemove', e => {
        cursor.style.left = `${e.clientX}px`; cursor.style.top = `${e.clientY}px`;
        follower.style.left = `${e.clientX}px`; follower.style.top = `${e.clientY}px`;
    });
}

function initThemePicker() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.body.className = `theme-${btn.getAttribute('data-theme')}`;
        });
    });
}