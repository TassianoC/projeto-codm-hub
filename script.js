// ==========================================================================
// LOBARK CODM HUB - SCRIPT CORRIGIDO & ALINHADO
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

// Variáveis Globais do Firebase
let db = null;
let lobbiesRef = null;
let rankingRef = null;

// Estados Globais
let isAdmin = false;
const ADMIN_SECRET_PASSWORD = "lobark2026";

let lobbies = [];
let teamsRanking = [];

// Inicialização com Verificação Segura
document.addEventListener('DOMContentLoaded', () => {
    initParticles();

    try {
        if (typeof firebase !== 'undefined') {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.database();
            lobbiesRef = db.ref('lobbies');
            rankingRef = db.ref('ranking');
            
            console.log("Firebase conectado com sucesso!");
            listenToFirebase();
        } else {
            console.error("SDK do Firebase não foi carregado corretamente no HTML.");
            renderLobbies();
            renderRanking();
        }
    } catch (e) {
        console.error("Erro na inicialização do Firebase:", e);
        renderLobbies();
        renderRanking();
    }
});

// ESCUTAR O FIREBASE EM TEMPO REAL
function listenToFirebase() {
    if (!lobbiesRef || !rankingRef) return;

    lobbiesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        lobbies = [];
        if (data) {
            Object.keys(data).forEach(key => {
                lobbies.push({ firebaseKey: key, ...data[key] });
            });
        }
        renderLobbies();
    }, (err) => {
        console.error("Erro ao ler Lobbies do Firebase:", err);
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
    }, (err) => {
        console.error("Erro ao ler Ranking do Firebase:", err);
    });
}

// MODO ADM
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
        } else {
            label.innerText = 'JOGADOR';
            label.style.color = 'var(--accent)';
            btn.style.borderColor = 'var(--text-muted)';
        }
    }

    renderLobbies();
    renderRanking();
}

// NAVEGAÇÃO DE ABAS
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) activeTab.classList.add('active');

    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}

// RENDERIZAR LOBBIES
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
                    <h4>Escalação (5v5):</h4>
                    <ul>
                        ${lobby.lineup.map(p => `<li><i class="fa-solid fa-user"></i> ${p}</li>`).join('')}
                    </ul>
                </div>
            `;
        } else if (lobby.mode) {
            lineupHTML = `<div class="lineup-box"><h4>Regras X1:</h4><p style="font-size:0.85rem">${lobby.mode}</p></div>`;
        }

        let adminControlsHTML = '';
        if (isAdmin) {
            adminControlsHTML = `
                <div style="margin-top: 10px;">
                    <button class="btn-danger btn-block" onclick="cancelLobby('${lobby.firebaseKey}')"><i class="fa-solid fa-trash"></i> Excluir Lobby (ADM)</button>
                </div>
            `;
        }

        card.innerHTML = `
            <span class="badge ${lobby.badgeClass || 'badge-t3'}">${lobby.type}</span>
            <h3 style="font-family: var(--font-heading);">${lobby.team}</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 5px;">⏰ Horário: <strong>${lobby.time}</strong></p>
            ${lineupHTML}
            <button class="btn-primary btn-block" onclick="acceptChallenge('${lobby.firebaseKey}')">
                ${lobby.challenger ? 'Desafiado por ' + lobby.challenger : 'Aceitar Desafio'}
            </button>
            ${adminControlsHTML}
        `;
        container.appendChild(card);
    });
}

// RENDERIZAR RANKING
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
                <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="updateScore('${team.firebaseKey}', 1, 0)">+1 Vit</button>
                <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; color: var(--crimson);" onclick="updateScore('${team.firebaseKey}', 0, 1)">+1 Der</button>
                <button class="btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="removeTeam('${team.firebaseKey}')">Excluir</button>
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

// CADASTRAR SCRIM (5v5)
function handleCreateScrim(e) {
    if (e && e.preventDefault) e.preventDefault();

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
        }).then(() => {
            alert("Lobby criado e sincronizado na nuvem!");
            closeModal('scrim');
            const form = document.getElementById('form-scrim');
            if (form) form.reset();
        }).catch(err => {
            alert("Erro ao salvar no Firebase: " + err.message + "\nVerifique se as Regras do Realtime Database estão publicas (.read: true, .write: true).");
        });
    } else {
        alert("Erro: Conexão com o Firebase não foi estabelecida.");
    }
}

// CADASTRAR DESAFIO X1
function handleCreateX1(e) {
    if (e && e.preventDefault) e.preventDefault();

    const player = document.getElementById('x1-player').value;
    const time = document.getElementById('x1-time').value;
    const mode = document.getElementById('x1-mode').value;

    if (lobbiesRef) {
        lobbiesRef.push({
            type: 'X1', time, team: `${player} (X1)`, mode, lineup: [], challenger: null, badgeClass: 'badge-x1'
        }).then(() => {
            alert("Desafio X1 publicado na nuvem!");
            closeModal('x1');
            const form = document.getElementById('form-x1');
            if (form) form.reset();
        }).catch(err => {
            alert("Erro ao salvar no Firebase: " + err.message);
        });
    } else {
        alert("Erro: Conexão com o Firebase não foi estabelecida.");
    }
}

// AÇÕES DO ADM E USUÁRIOS
function acceptChallenge(firebaseKey) {
    const myTeam = prompt("Digite o nome do seu time para aceitar o confronto:");
    if (myTeam && lobbiesRef) {
        lobbiesRef.child(firebaseKey).update({ challenger: myTeam })
            .catch(err => alert("Erro ao aceitar desafio: " + err.message));
    }
}

function cancelLobby(firebaseKey) {
    if (!isAdmin) {
        alert("Ação permitida apenas para Administradores.");
        return;
    }
    if (confirm("Tem certeza de que deseja EXCLUIR este lobby permanentemente?")) {
        if (lobbiesRef) {
            lobbiesRef.child(firebaseKey).remove()
                .then(() => alert("Lobby removido com sucesso!"))
                .catch(err => alert("Erro ao excluir do Firebase: " + err.message));
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
        }).catch(err => alert("Erro ao atualizar placar: " + err.message));
    }
}

function removeTeam(firebaseKey) {
    if (!isAdmin) return;
    if (confirm("Remover este clã do ranking?")) {
        if (rankingRef) {
            rankingRef.child(firebaseKey).remove()
                .then(() => alert("Clã removido do ranking!"))
                .catch(err => alert("Erro ao remover: " + err.message));
        }
    }
}

// MODAIS
function openModal(type) {
    const modal = document.getElementById(`modal-${type}`);
    if (modal) modal.classList.add('active');
}

function closeModal(type) {
    const modal = document.getElementById(`modal-${type}`);
    if (modal) modal.classList.remove('active');
}

// EFITO DE PARTÍCULAS
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