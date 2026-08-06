// BANCO DE DADOS EM MEMÓRIA (ESTADO GLOBAL DA APLICAÇÃO)
let currentUser = null; // Armazena o usuário autenticado no momento

// Base inicial de Pro Players e Usuários
let playersData = [
    { 
        id: 1, 
        nick: "ViperLOBARK", 
        role: "Sniper", 
        kd: 3.45, 
        wins: 142,
        winrate: "78%",
        likes: 215, 
        bio: "Sniper principal do time LOBARK. Focado em campeonatos de alto nível.", 
        avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200",
        isAdmin: false
    },
    { 
        id: 2, 
        nick: "AdminLobark", 
        role: "IGL", 
        kd: 2.90, 
        wins: 180,
        winrate: "82%",
        likes: 198, 
        bio: "Líder de equipe e administrador do HUB oficial LOBARK.", 
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200",
        isAdmin: true
    },
    { 
        id: 3, 
        nick: "ShadowGhost", 
        role: "Entry", 
        kd: 2.88, 
        wins: 110,
        winrate: "65%",
        likes: 240, 
        bio: "Entry fragger agressivo. Sempre buscando o primeiro abate.", 
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200",
        isAdmin: false
    },
    { 
        id: 4, 
        nick: "Astraes", 
        role: "Support", 
        kd: 1.95, 
        wins: 95,
        winrate: "59%",
        likes: 120, 
        bio: "Suporte tático, especialista em utilitárias e retake.", 
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
        isAdmin: false
    }
];

// Histórico de partidas fictício para visualização no perfil
const mockMatchHistory = [
    { map: "Ascent", result: "Vitória", score: "13 - 8", kdRatio: "2.1", date: "Hoje" },
    { map: "Haven", result: "Vitória", score: "13 - 11", kdRatio: "1.8", date: "Ontem" },
    { map: "Bind", result: "Derrota", score: "9 - 13", kdRatio: "0.9", date: "3 dias atrás" }
];

// INICIALIZADOR DA APLICAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    initParticlesCanvas();
    populateLoginAccountSelect();
    renderAllViews();
});

// NAVEGAÇÃO ENTRE ABAS
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const targetSection = document.getElementById(`tab-${tabName}`);
    if (targetSection) targetSection.classList.add('active');
    
    const activeBtn = document.getElementById(`btn-tab-${tabName}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Atualizações específicas por aba
    if (tabName === 'ranking') renderRankingView();
    if (tabName === 'admin') renderAdminView();
}

// SISTEMA DE GERENCIAMENTO DE MODAIS
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// SISTEMA DE AUTENTICAÇÃO
function populateLoginAccountSelect() {
    const select = document.getElementById('login-account-select');
    if (!select) return;
    select.innerHTML = playersData.map(p => `
        <option value="${p.id}">${p.nick} (${p.isAdmin ? 'Administrador' : 'Jogador Regular'})</option>
    `).join('');
}

function executeLogin() {
    const selectedId = parseInt(document.getElementById('login-account-select').value);
    currentUser = playersData.find(p => p.id === selectedId);

    if (currentUser) {
        document.getElementById('auth-guest-view').style.display = 'none';
        document.getElementById('auth-user-view').style.display = 'flex';
        
        document.getElementById('user-display-name').innerText = currentUser.nick;
        const roleBadge = document.getElementById('user-role-badge');
        roleBadge.innerText = currentUser.isAdmin ? 'ADM' : 'PLAYER';
        roleBadge.className = `badge-role ${currentUser.isAdmin ? 'admin' : 'user'}`;

        document.getElementById('btn-tab-profile').classList.remove('hidden');

        // Exibir ou ocultar o botão ADM
        if (currentUser.isAdmin) {
            document.getElementById('btn-tab-admin').classList.remove('hidden');
        } else {
            document.getElementById('btn-tab-admin').classList.add('hidden');
        }

        updateProfileView();
        closeModal('modal-login');
        renderAllViews();
    }
}

function logout() {
    currentUser = null;
    document.getElementById('auth-guest-view').style.display = 'block';
    document.getElementById('auth-user-view').style.display = 'none';
    
    document.getElementById('btn-tab-profile').classList.add('hidden');
    document.getElementById('btn-tab-admin').classList.add('hidden');

    switchTab('home');
    renderAllViews();
}

// LÓGICA DE VOTABILIDADE / CURTIDAS
function likePlayer(id) {
    const player = playersData.find(p => p.id === id);
    if (player) {
        player.likes++;
        if (currentUser && currentUser.id === player.id) {
            currentUser.likes++;
            updateProfileView();
        }
        renderAllViews();
    }
}

// RENDERIZAÇÃO DAS VISÕES PRINCIPAIS
function renderAllViews() {
    const sorted = [...playersData].sort((a, b) => b.likes - a.likes);

    // 1. Pódio na Aba Início (Top 3)
    const podiumGrid = document.getElementById('home-podium-grid');
    if (podiumGrid) {
        podiumGrid.innerHTML = sorted.slice(0, 3).map((p, index) => `
            <div class="card glass-panel podium-card rank-${index + 1}">
                <div class="podium-badge">${index === 0 ? '🥇 1º' : index === 1 ? '🥈 2º' : '🥉 3º'}</div>
                <div class="player-card-avatar" style="margin-top: 15px;">
                    <img src="${p.avatar}" alt="${p.nick}">
                </div>
                <h3 style="font-family: var(--font-heading); margin-top: 10px;">${p.nick}</h3>
                <span class="badge-t3" style="margin-top: 5px;">${p.role}</span>
                <p style="margin-top: 10px; color: var(--text-secondary);">Curtidas: <strong style="color: #fff;">${p.likes}</strong></p>
                <button class="btn-primary" style="margin-top: 15px; width: 100%; justify-content: center;" onclick="likePlayer(${p.id})">
                    <i class="fa-solid fa-heart"></i> Votar
                </button>
            </div>
        `).join('');
    }

    // 2. Grid de Todos os Jogadores
    const allGrid = document.getElementById('all-players-grid');
    if (allGrid) {
        allGrid.innerHTML = playersData.map(p => `
            <div class="card glass-panel player-card">
                <span class="player-likes-tag"><i class="fa-solid fa-heart icon-crimson"></i> ${p.likes}</span>
                <div class="player-card-avatar">
                    <img src="${p.avatar}" alt="${p.nick}">
                </div>
                <h3 style="font-family: var(--font-heading);">${p.nick}</h3>
                <span class="badge-t3" style="margin: 8px 0;">${p.role}</span>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">K/D Global: ${p.kd}</p>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-secondary" style="flex: 1; justify-content: center;" onclick="likePlayer(${p.id})">
                        <i class="fa-solid fa-heart"></i> Votar
                    </button>
                    <button class="btn-outline" onclick="openViewPlayerModal(${p.id})">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // 3. Indicadores Globais
    document.getElementById('stat-total-players').innerText = playersData.length;
    document.getElementById('stat-total-likes').innerText = playersData.reduce((acc, curr) => acc + curr.likes, 0);
    if (sorted.length > 0) {
        document.getElementById('stat-top-player').innerText = sorted[0].nick;
    }

    renderRankingView();
    if (currentUser && currentUser.isAdmin) renderAdminView();
}

// ABA RANKING DETALHADA
function renderRankingView() {
    const tbody = document.getElementById('ranking-table-body');
    if (!tbody) return;

    const searchTerm = document.getElementById('ranking-search').value.toLowerCase();
    const roleFilter = document.getElementById('ranking-filter-role').value;

    let filtered = [...playersData].sort((a, b) => b.likes - a.likes);

    if (searchTerm) {
        filtered = filtered.filter(p => p.nick.toLowerCase().includes(searchTerm));
    }
    if (roleFilter !== 'all') {
        filtered = filtered.filter(p => p.role === roleFilter);
    }

    tbody.innerHTML = filtered.map((p, index) => `
        <tr>
            <td><strong>#${index + 1}</strong></td>
            <td style="display: flex; align-items: center; gap: 10px;">
                <img src="${p.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                <span>${p.nick}</span>
            </td>
            <td><span class="badge-t3">${p.role}</span></td>
            <td>${p.kd}</td>
            <td>${p.wins} vitorias</td>
            <td><strong style="color: var(--crimson);">${p.likes}</strong></td>
            <td>
                <button class="btn-outline" style="padding: 4px 8px;" onclick="likePlayer(${p.id})">
                    <i class="fa-solid fa-heart icon-crimson"></i> +1 Voto
                </button>
            </td>
        </tr>
    `).join('');
}

// ABA DE PERFIL DO USUÁRIO CONECTADO
function updateProfileView() {
    if (!currentUser) return;

    document.getElementById('my-profile-nick').innerText = currentUser.nick;
    document.getElementById('my-profile-likes').innerText = currentUser.likes;
    document.getElementById('my-profile-role').innerText = currentUser.role;
    document.getElementById('my-profile-kd').innerText = currentUser.kd;
    document.getElementById('my-profile-winrate').innerText = currentUser.winrate || "75%";
    document.getElementById('my-profile-bio').innerText = currentUser.bio || "Sem biografia cadastrada.";
    document.getElementById('my-avatar-img').src = currentUser.avatar;

    // Renderizar Histórico
    const historyContainer = document.getElementById('my-match-history');
    if (historyContainer) {
        historyContainer.innerHTML = mockMatchHistory.map(m => `
            <div class="history-item ${m.result === 'Vitória' ? 'win' : 'defeat'}">
                <div>
                    <strong>${m.map}</strong> - <span style="font-size: 0.85rem; color: var(--text-secondary);">${m.date}</span>
                </div>
                <div>Placar: <strong>${m.score}</strong></div>
                <div>K/D: <strong>${m.kdRatio}</strong></div>
            </div>
        `).join('');
    }

    // Preencher formulário de edição
    document.getElementById('edit-nick').value = currentUser.nick;
    document.getElementById('edit-role').value = currentUser.role;
    document.getElementById('edit-avatar').value = currentUser.avatar;
    document.getElementById('edit-bio').value = currentUser.bio || "";
}

function saveProfileChanges(e) {
    e.preventDefault();
    if (!currentUser) return;

    currentUser.nick = document.getElementById('edit-nick').value;
    currentUser.role = document.getElementById('edit-role').value;
    currentUser.avatar = document.getElementById('edit-avatar').value;
    currentUser.bio = document.getElementById('edit-bio').value;

    updateProfileView();
    renderAllViews();
    closeModal('modal-edit-profile');
}

// VER FICHA DE QUALQUER JOGADOR (MODAL)
function openViewPlayerModal(id) {
    const p = playersData.find(item => item.id === id);
    if (!p) return;

    const body = document.getElementById('view-player-body');
    body.innerHTML = `
        <div style="text-align: center;">
            <img src="${p.avatar}" style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent); margin-bottom: 10px;">
            <h2 style="font-family: var(--font-heading);">${p.nick}</h2>
            <span class="badge-t3">${p.role}</span>
            <p style="margin-top: 15px; color: var(--text-secondary);">${p.bio || "Sem biografia."}</p>
        </div>
        <div style="display: flex; justify-content: space-around; margin-top: 20px; border-top: 1px solid var(--card-border); padding-top: 15px;">
            <div><strong>${p.likes}</strong><br><span style="font-size:0.8rem; color:var(--text-secondary);">Curtidas</span></div>
            <div><strong>${p.kd}</strong><br><span style="font-size:0.8rem; color:var(--text-secondary);">K/D</span></div>
            <div><strong>${p.wins}</strong><br><span style="font-size:0.8rem; color:var(--text-secondary);">Vitórias</span></div>
        </div>
    `;
    openModal('modal-view-player');
}

// ABA PAINEL ADM (EXCLUSIVO)
function renderAdminView() {
    const tbody = document.getElementById('admin-table-body');
    if (!tbody) return;

    tbody.innerHTML = playersData.map(p => `
        <tr>
            <td>#${p.id}</td>
            <td><img src="${p.avatar}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;"></td>
            <td><strong>${p.nick}</strong></td>
            <td>${p.role}</td>
            <td>${p.kd}</td>
            <td>${p.likes}</td>
            <td><span class="badge-role ${p.isAdmin ? 'admin' : 'user'}">${p.isAdmin ? 'ADM' : 'PLAYER'}</span></td>
            <td>
                <button class="btn-outline" style="padding: 4px 8px;" onclick="adminToggleRole(${p.id})">
                    <i class="fa-solid fa-shield"></i>
                </button>
                <button class="btn-danger" style="padding: 4px 8px;" onclick="adminDeletePlayer(${p.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function adminAddPlayer(e) {
    e.preventDefault();
    const newPlayer = {
        id: Date.now(),
        nick: document.getElementById('add-nick').value,
        role: document.getElementById('add-role').value,
        kd: parseFloat(document.getElementById('add-kd').value),
        wins: 0,
        winrate: "0%",
        likes: 0,
        bio: "Novo pro player cadastrado pelo ADM.",
        avatar: document.getElementById('add-avatar').value,
        isAdmin: false
    };

    playersData.push(newPlayer);
    populateLoginAccountSelect();
    renderAllViews();
    closeModal('modal-add-player');
    document.getElementById('form-add-player').reset();
}

function adminToggleRole(id) {
    const player = playersData.find(p => p.id === id);
    if (player) {
        player.isAdmin = !player.isAdmin;
        populateLoginAccountSelect();
        renderAllViews();
    }
}

function adminDeletePlayer(id) {
    if (confirm("Tem certeza que deseja remover este pro player da plataforma LOBARK?")) {
        playersData = playersData.filter(p => p.id !== id);
        populateLoginAccountSelect();
        renderAllViews();
    }
}

// BACKGROUND PARTICLES CANVAS
function initParticlesCanvas() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particles = Array.from({ length: 45 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1
    }));

    function animate() {
        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < particles.length; i++) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > width) p.vx *= -1;
            if (p.y < 0 || p.y > height) p.vy *= -1;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#00f3ff';
            ctx.globalAlpha = 0.4;
            ctx.fill();

            for (let j = i + 1; j < particles.length; j++) {
                let p2 = particles[j];
                let dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = '#00f3ff';
                    ctx.globalAlpha = (1 - dist / 120) * 0.15;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
}