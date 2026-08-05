// ==========================================================================
// LOBARK CODM MANAGER & PRO PROFILE - JAVASCRIPT COM NÍVEIS DE ACESSO
// ==========================================================================

// Estado Global de Permissão (false = Jogador, true = Administrador LOBARK)
let isAdmin = false;

let lobbies = [
    {
        id: 1,
        type: 'Scrim T1',
        time: '20:00',
        team: 'LOBARK eSports',
        lineup: [
            'FALLK_OP (IGL)',
            'Ghost_99 (Main Sniper)',
            'Viper_CODM (Entry)',
            'Rex_SA (Support/Anchor)',
            'Shadow_X (Flex)'
        ],
        challenger: null,
        badgeClass: 'badge-t1'
    },
    {
        id: 2,
        type: 'Scrim T2',
        time: '21:30',
        team: 'Alpha Wolves',
        lineup: [
            'Alpha_Leader (IGL)',
            'Sniper_God (Sniper)',
            'Rush_B (Entry)',
            'Shield_P1 (Support)',
            'Flex_Master (Flex)'
        ],
        challenger: null,
        badgeClass: 'badge-t2'
    },
    {
        id: 3,
        type: 'X1',
        time: '22:00',
        team: 'FALLK_OP (X1)',
        mode: 'Killhouse // DL Q33 AWP Only // 20 Kills',
        lineup: [],
        challenger: null,
        badgeClass: 'badge-x1'
    }
];

let teamsRanking = [
    { name: 'LOBARK eSports', tier: 'T1', wins: 34, losses: 6 },
    { name: 'Alpha Wolves', tier: 'T2', wins: 24, losses: 11 },
    { name: 'Red Vipers CODM', tier: 'T1', wins: 20, losses: 14 },
    { name: 'BlackOps SA', tier: 'T3', wins: 15, losses: 5 }
];

document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initCursor();
    renderLobbies();
    renderRanking();
    initThemePicker();
});

// Alternar entre modo Usuário e Administrador
function toggleAdminMode() {
    isAdmin = !isAdmin;
    const label = document.getElementById('role-label');
    const btn = document.getElementById('admin-toggle-btn');

    if (isAdmin) {
        label.innerText = 'ADMINISTRADOR';
        label.style.color = 'var(--crimson)';
        btn.style.borderColor = 'var(--crimson)';
        document.body.classList.add('admin-mode');
        alert("Modo ADM Ativado: Você agora tem controle total para cancelar partidas e gerenciar o ranking.");
    } else {
        label.innerText = 'JOGADOR';
        label.style.color = 'var(--accent)';
        btn.style.borderColor = 'var(--accent)';
        document.body.classList.remove('admin-mode');
    }

    renderLobbies();
    renderRanking();
}

// Troca de Abas
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Visualizar perfil do Jogador
function viewPlayerProfile(playerName) {
    const cleanName = playerName.split(' ')[0];
    document.getElementById('player-profile-name').innerHTML = `${cleanName}<span class="glow-text">_PRO</span>`;
    document.getElementById('card-player-name').innerText = cleanName;
    
    switchTab('profile');
}

// Renderizar Lobbies com opções diferenciadas de ADM
function renderLobbies() {
    const container = document.getElementById('lobbies-container');
    container.innerHTML = '';

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

        // Botões visíveis apenas para Administrador
        let adminControlsHTML = '';
        if (isAdmin) {
            adminControlsHTML = `
                <div class="admin-actions">
                    <button class="btn-danger" onclick="cancelLobby(${lobby.id})"><i class="fa-solid fa-trash"></i> Cancelar Lobby (ADM)</button>
                </div>
            `;
        }

        card.innerHTML = `
            <span class="badge ${lobby.badgeClass}">${lobby.type}</span>
            <h3 style="font-family: var(--font-heading);">${lobby.team}</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 5px;">⏰ Horário: <strong>${lobby.time}</strong></p>
            ${lineupHTML}
            <button class="btn-primary" onclick="acceptChallenge(${lobby.id})">
                ${lobby.challenger ? 'Desafiado por ' + lobby.challenger : 'Aceitar Desafio 5v5'}
            </button>
            ${adminControlsHTML}
        `;

        container.appendChild(card);
    });
}

// Renderizar Ranking com Ações de ADM
function renderRanking() {
    const tbody = document.getElementById('ranking-body');
    tbody.innerHTML = '';

    teamsRanking.sort((a, b) => b.wins - a.wins);

    teamsRanking.forEach((team, index) => {
        const total = team.wins + team.losses;
        const winrate = total > 0 ? ((team.wins / total) * 100).toFixed(1) + '%' : '0%';

        // Ações de alteração de pontos visíveis prioritariamente para ADM
        let actionsHTML = '';
        if (isAdmin) {
            actionsHTML = `
                <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; color: var(--accent);" onclick="updateScore('${team.name}', 1, 0)">+1 Vit</button>
                <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; color: var(--crimson);" onclick="updateScore('${team.name}', 0, 1)">+1 Der</button>
                <button class="btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="removeTeam('${team.name}')">Remover</button>
            `;
        } else {
            actionsHTML = `<span style="font-size:0.8rem; color:var(--text-muted);">Somente Leitura</span>`;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>#${index + 1}</strong></td>
            <td><strong>${team.name}</strong></td>
            <td><span class="badge badge-${team.tier.toLowerCase()}">${team.tier}</span></td>
            <td style="color: var(--accent); font-weight: bold;">${team.wins}</td>
            <td style="color: var(--crimson);">${team.losses}</td>
            <td>${winrate}</td>
            <td>${actionsHTML}</td>
        `;
        tbody.appendChild(row);
    });
}

// --- Ações de Jogadores ---
function acceptChallenge(id) {
    const lobby = lobbies.find(l => l.id === id);
    if (lobby) {
        const myTeam = prompt("Digite o nome da sua equipe/clã para aceitar:");
        if (myTeam) {
            lobby.challenger = myTeam;
            alert(`Confronto Marcado! ${myTeam} vs ${lobby.team} às ${lobby.time}.`);
            renderLobbies();
        }
    }
}

// --- Ações Exclusivas do Administrador (Você) ---
function cancelLobby(id) {
    if (!isAdmin) return;
    if (confirm("Tem certeza que deseja CANCELAR e excluir esta Scrim/X1?")) {
        lobbies = lobbies.filter(l => l.id !== id);
        renderLobbies();
    }
}

function updateScore(teamName, winAdd, lossAdd) {
    if (!isAdmin) return;
    const team = teamsRanking.find(t => t.name === teamName);
    if (team) {
        team.wins += winAdd;
        team.losses += lossAdd;
        renderRanking();
    }
}

function removeTeam(teamName) {
    if (!isAdmin) return;
    if (confirm(`Remover a equipe ${teamName} do Ranking Geral?`)) {
        teamsRanking = teamsRanking.filter(t => t.name !== teamName);
        renderRanking();
    }
}

// Modais
function openModal(type) { document.getElementById(`modal-${type}`).classList.add('active'); }
function closeModal(type) { document.getElementById(`modal-${type}`).classList.remove('active'); }

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

    lobbies.push({ id: Date.now(), type, time, team, lineup, challenger: null, badgeClass });
    closeModal('scrim');
    renderLobbies();
}

function handleCreateX1(e) {
    e.preventDefault();
    const player = document.getElementById('x1-player').value;
    const time = document.getElementById('x1-time').value;
    const mode = document.getElementById('x1-mode').value;

    lobbies.push({ id: Date.now(), type: 'X1', time, team: `${player} (X1)`, mode, lineup: [], challenger: null, badgeClass: 'badge-x1' });
    closeModal('x1');
    renderLobbies();
}

// Background & Efeitos
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const particles = Array.from({ length: 50 }, () => ({
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