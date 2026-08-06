// ESTADO GLOBAL DA APLICAÇÃO
let currentUser = null;

let playersData = [
    { id: 1, nick: "ViperLOBARK", role: "Sniper", kd: "3.45", likes: 182, avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200" },
    { id: 2, nick: "Astraes", role: "IGL", kd: "2.10", likes: 95, avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200" },
    { id: 3, nick: "ShadowGhost", role: "Entry", kd: "2.88", likes: 240, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200" },
    { id: 4, nick: "KlausFPS", role: "Support", kd: "1.95", likes: 64, avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200" }
];

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    initParticlesCanvas();
    renderAllViews();
});

// SIMULAÇÃO DE LOGIN / LOGOUT
function toggleLogin() {
    const btnProfile = document.getElementById('btn-tab-profile');
    const guestView = document.getElementById('auth-guest-view');
    const userView = document.getElementById('auth-user-view');

    if (currentUser) {
        currentUser = null;
        guestView.style.display = 'block';
        userView.style.display = 'none';
        btnProfile.classList.add('hidden');
        switchTab('home');
    } else {
        currentUser = {
            id: 99,
            nick: "MeuUserLOBARK",
            role: "Flex",
            kd: "2.75",
            likes: 110,
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200"
        };
        guestView.style.display = 'none';
        userView.style.display = 'flex';
        document.getElementById('user-display-name').innerText = currentUser.nick;
        btnProfile.classList.remove('hidden');
        updateMyProfileData();
    }
}

// ALTERNÂNCIA DE ABAS
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const targetSection = document.getElementById(`tab-${tabName}`);
    if (targetSection) targetSection.classList.add('active');
    
    const activeBtn = document.getElementById(`btn-tab-${tabName}`);
    if (activeBtn) activeBtn.classList.add('active');
}

// SISTEMA DE CURTIDAS EM TEMPO REAL
function likePlayer(id) {
    const player = playersData.find(p => p.id === id);
    if (player) {
        player.likes++;
        renderAllViews();
    }
}

// CONSTRUTOR DE HTML DOS CARDS DE JOGADOR
function createPlayerCardHtml(p) {
    return `
        <div class="card glass-panel player-card">
            <span class="player-likes-tag"><i class="fa-solid fa-heart icon-crimson"></i> ${p.likes}</span>
            <div class="player-card-avatar">
                <img src="${p.avatar}" alt="${p.nick}">
            </div>
            <h3 style="font-family: var(--font-heading); margin-bottom: 4px;">${p.nick}</h3>
            <span class="badge-t3" style="margin-bottom: 10px;">${p.role}</span>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px;">K/D Global: ${p.kd}</p>
            <button class="btn-secondary" style="width: 100%; justify-content: center;" onclick="likePlayer(${p.id})">
                <i class="fa-solid fa-heart"></i> Curtir Perfil
            </button>
        </div>
    `;
}

// ATUALIZAÇÃO REATIVA DE TODAS AS TELAS
function renderAllViews() {
    const sortedPlayers = [...playersData].sort((a, b) => b.likes - a.likes);

    // 1. Destaques na aba Início (Top 3)
    const homeGrid = document.getElementById('home-top-players-grid');
    if (homeGrid) {
        homeGrid.innerHTML = sortedPlayers.slice(0, 3).map(createPlayerCardHtml).join('');
    }

    // 2. Aba Mais Curtidos
    const topGrid = document.getElementById('top-liked-players-grid');
    if (topGrid) {
        topGrid.innerHTML = sortedPlayers.map(createPlayerCardHtml).join('');
    }

    // 3. Aba Todos os Jogadores
    const allGrid = document.getElementById('all-players-grid');
    if (allGrid) {
        allGrid.innerHTML = playersData.map(createPlayerCardHtml).join('');
    }

    // 4. Indicadores Globais das Estatísticas
    document.getElementById('stat-total-players').innerText = playersData.length;
    
    let totalLikes = 0;
    playersData.forEach(p => totalLikes += p.likes);
    document.getElementById('stat-total-likes').innerText = totalLikes;

    if (sortedPlayers.length > 0) {
        document.getElementById('stat-top-player').innerText = sortedPlayers[0].nick;
    }
}

// ATUALIZAR DADOS DO PERFIL LOGADO
function updateMyProfileData() {
    if (!currentUser) return;
    document.getElementById('my-profile-nick').innerText = currentUser.nick;
    document.getElementById('my-profile-likes').innerText = currentUser.likes;
    document.getElementById('my-profile-role').innerText = currentUser.role;
    document.getElementById('my-profile-kd').innerText = currentUser.kd;
    document.getElementById('my-avatar-img').src = currentUser.avatar;
}

// ANIMAÇÃO DE CANVAS DE PARTÍCULAS INTERATIVAS
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