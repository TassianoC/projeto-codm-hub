(() => {
  'use strict';

  const storageKey = 'codm-hub-career-v4';
  
  const defaultProfile = {
    nickname: 'FALLK_OP',
    clan: 'LO BARK',
    role: 'Entry Fragger',
    style: 'Aggressive',
    weapon: 'AK117',
    favoriteMap: 'Nuketown',
    bio: 'Entre no meu lobby se quiser jogar para vencer.',
    availability: false,
    rank: 'ELITE III',
    globalScore: 8742,
    avatarUrl: '',
    playerId: '#BR-0447',
    career: [
      { date: 'AGO 2026', title: 'Elite III alcançado', description: '+442 Player Score na temporada.', tone: 'gold' },
      { date: 'JUL 2026', title: 'Campeão · X1 Night Cup', description: 'Venceu 5 séries sem perder.', tone: 'pink' },
      { date: 'JUN 2026', title: 'Entrada no LO BARK', description: 'Assinado como Entry Fragger.', tone: 'blue' }
    ],
    feedMedia: [
      { id: '1', type: 'image', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80', caption: 'Vitória insana no X1 Night Cup! 🔥', likes: 142, comments: 18, date: 'Há 2 dias' },
      { id: '2', type: 'image', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80', caption: 'Loadout atualizado para as ranqueadas.', likes: 98, comments: 7, date: 'Há 5 dias' }
    ]
  };

  const defaults = {
    currentUser: null,
    score: 8742,
    challenge: 19,
    available: false,
    profile: { ...defaultProfile },
    posts: [
      { author: 'VK_VALKYRIE', initials: 'VK', role: 'Valkyrie Esports · 18 min', text: 'Treino aberto para line-ups 5v5 hoje, 21h BRT. Procuro IGL e suporte com disponibilidade fixa.', likes: 38, comments: 12, accent: 'blue', mediaUrl: '', avatarUrl: '' },
      { author: 'TUCAFPS', initials: 'TU', role: 'Free Agent · 42 min', text: 'Finalmente alcancei Elite II. O foco no objetivo mudou completamente minhas partidas de Hardpoint. 🔥', likes: 71, comments: 9, accent: 'pink', mediaUrl: '', avatarUrl: '' },
      { author: 'LO BARK', initials: 'LB', role: 'Clã · 1 h', text: 'FALLK_OP garantiu mais uma série no X1 Night Cup. Próxima parada: Top 100.', likes: 124, comments: 19, accent: 'gold', mediaUrl: '', avatarUrl: '' }
    ],
    activities: [
      { icon: '♛', title: 'Vitória no X1 Night Cup', subtitle: 'FALLK_OP 2 × 0 ZN_Mirage · +100 pontos', time: 'hoje, 22:14' },
      { icon: '◎', title: 'Desafio atualizado', subtitle: 'AK117: 19 de 30 eliminações concluídas', time: 'ontem, 19:32' },
      { icon: '✦', title: 'Análise do Coach concluída', subtitle: 'Seu posicionamento evoluiu 7 pontos', time: 'ontem, 17:08' }
    ]
  };

  const load = () => {
    try { 
      const data = JSON.parse(localStorage.getItem(storageKey));
      return { 
        ...defaults, 
        ...data, 
        profile: { 
          ...defaults.profile, 
          ...(data?.profile || {}),
          feedMedia: data?.profile?.feedMedia || defaults.profile.feedMedia 
        } 
      }; 
    } catch { 
      return structuredClone(defaults); 
    }
  };

  let state = load();
  const persist = () => localStorage.setItem(storageKey, JSON.stringify(state));

  const $ = (selector, node = document) => node.querySelector(selector);
  const $$ = (selector, node = document) => [...node.querySelectorAll(selector)];
  const formatNumber = value => new Intl.NumberFormat('pt-BR').format(value);

  let firebase = null;
  let currentUser = null;
  let authMode = 'login';
  let coachScreenshots = [null, null, null, null];

  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    if ($('#toastMessage')) $('#toastMessage').textContent = message;
    el.classList.add('show');
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => el.classList.remove('show'), 3500);
  }

  // --- NAVEGAÇÃO E MODAIS ---
  function navigate(page) {
    if (page === 'perfil' && !currentUser) {
      toast('Faça login para ver e gerenciar seu perfil!');
      showModal('#authModal');
      return;
    }

    const target = document.getElementById(page);
    if (!target) return;
    
    $$('.page').forEach(section => section.classList.toggle('active', section.id === page));
    $$('[data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === page));
    
    if ($('#menuButton')) $('#menuButton').setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', `#${page}`);
  }

  function showModal(id) {
    if ($('#modalBackdrop')) $('#modalBackdrop').classList.add('show');
    const m = $(id);
    if (m) {
      m.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModals() {
    if ($('#modalBackdrop')) $('#modalBackdrop').classList.remove('show');
    $$('.modal').forEach(modal => modal.classList.remove('show'));
    document.body.style.overflow = '';
  }

  // --- FEED ESTILO INSTAGRAM NO PERFIL ---
  function renderProfileFeed() {
    const grid = $('#instaFeedGrid');
    if (!grid) return;

    const list = state.profile.feedMedia || [];
    if (list.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--muted);">Nenhuma foto ou vídeo publicado no perfil ainda.</div>';
      return;
    }

    grid.innerHTML = list.map(item => `
      <div class="insta-item" data-insta-id="${item.id}">
        ${item.type === 'video' ? `<span class="insta-badge-video">▶ Vídeo</span><video src="${item.url}"></video>` : `<img src="${item.url}" alt="Mídia do Perfil">`}
        <div class="insta-overlay">
          <span>♡ ${item.likes || 0}</span>
          <span>💬 ${item.comments || 0}</span>
        </div>
      </div>
    `).join('');

    $$('.insta-item', grid).forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.instaId;
        const media = list.find(m => m.id === id);
        if (media) openInstaViewer(media);
      });
    });
  }

  function openInstaViewer(media) {
    const content = $('#instaViewerContent');
    if (!content) return;

    const mediaElement = media.type === 'video' 
      ? `<video src="${media.url}" controls autoplay style="max-width:100%; max-height:60vh;"></video>` 
      : `<img src="${media.url}" style="max-width:100%; max-height:60vh; object-fit:contain;">`;

    content.innerHTML = `
      <div class="insta-viewer-body">
        <div class="insta-viewer-media">${mediaElement}</div>
        <div class="insta-viewer-info">
          <div class="insta-viewer-header">
            <span class="avatar small">${(state.profile.nickname || 'FO').slice(0, 2).toUpperCase()}</span>
            <b>@${escapeHtml(state.profile.nickname)}</b>
          </div>
          <div class="insta-viewer-caption">
            <p>${escapeHtml(media.caption || 'Sem legenda.')}</p>
            <small style="color:var(--muted);">${media.date}</small>
          </div>
          <button class="button ghost small" id="deleteInstaMediaBtn" style="color:var(--pink); border-color:var(--pink);">Excluir Mídia</button>
        </div>
      </div>
    `;

    if ($('#deleteInstaMediaBtn')) {
      $('#deleteInstaMediaBtn').addEventListener('click', () => {
        state.profile.feedMedia = state.profile.feedMedia.filter(m => m.id !== media.id);
        persist();
        renderProfileFeed();
        closeModals();
        toast('Mídia removida do seu perfil.');
      });
    }

    showModal('#instaViewerModal');
  }

  // --- COACH IA COM ANÁLISE DE 4 PRINTS ---
  function setupCoachScreenshotUpload() {
    $$('.screenshot-slot').forEach(slot => {
      const slotIndex = Number(slot.dataset.slot) - 1;
      const fileInput = slot.querySelector('.slot-file-input');
      const preview = slot.querySelector('.slot-preview');

      slot.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          coachScreenshots[slotIndex] = event.target.result;
          preview.style.backgroundImage = `url('${event.target.result}')`;
          preview.classList.remove('hidden');
          slot.classList.add('has-image');
          toast(`Print ${slotIndex + 1} carregado para análise!`);
        };
        reader.readAsDataURL(file);
      });
    });
  }

  function createCoachReportFromScreenshots(data) {
    const uploadedCount = coachScreenshots.filter(Boolean).length;
    
    if (uploadedCount < 4) {
      toast('Atenção: Para o veredito exato da IA, envie todos os 4 prints!');
    }

    // Algoritmo simulado de visão computacional da IA analisando os 4 prints
    const aim = Math.floor(82 + Math.random() * 15);
    const decision = Math.floor(75 + Math.random() * 20);
    const aggression = Math.floor(80 + Math.random() * 18);
    const positioning = Math.floor(78 + Math.random() * 16);
    const grade = Math.round((aim + decision + aggression + positioning) / 4);

    if ($('#coachReport')) {
      $('#coachReport').innerHTML = `
        <div class="report-title">
          <div>
            <span class="eyebrow">DIAGNÓSTICO IA · 4 PRINTS ANALISADOS</span>
            <h2>Veredito Tático Ranqueado</h2>
          </div>
          <span class="coach-grade">${grade}</span>
        </div>

        <div class="coach-kpis">
          <div><b>${aim}</b><span>MIRA</span></div>
          <div><b>${decision}</b><span>DECISÃO</span></div>
          <div><b>${aggression}</b><span>AGRESSIVIDADE</span></div>
          <div><b>${positioning}</b><span>POSICIONAMENTO</span></div>
        </div>

        <div class="coach-insight">
          <b>✦ ANÁLISE DETALHADA DOS PRINTS</b>
          <p><strong>1. Placar Final:</strong> Sua taxa de entrada em zona garantiu vantagem de ritmo inicial no mapa ${escapeHtml(data.map)}.</p>
          <p><strong>2. K/D/A:</strong> Trocas eficientes no 1v1 com 72% de aproveitamento das alinhagens de tiro.</p>
          <p><strong>3. Dano & Destaque:</strong> Alto dano gerado, porém com brecha em rotações longas.</p>
          <p><strong>4. Armas:</strong> Controle de recuo consistente na arma principal.</p>
        </div>

        <div class="coach-insight">
          <b>RECOMENDAÇÃO DO COACH</b>
          <p>Ajuste sua rotação em ${escapeHtml(data.map)} para antecipar em 5 segundos a próxima zona de conflito com seu squad.</p>
        </div>
      `;
    }

    state.activities.unshift({ icon: '✦', title: 'Análise de Prints Concluída', subtitle: `Nota ${grade}/100 em ${data.mode}`, time: 'agora' });
    state.activities = state.activities.slice(0, 5);
    persist();
    renderActivities();
  }

  // --- RENDERIZAÇÕES GERAIS E DADOS ---
  function updateAuthUI() {
    const isLoggedIn = !!currentUser;
    $$('.auth-required-nav').forEach(el => el.classList.toggle('hidden', !isLoggedIn));

    if (isLoggedIn) {
      if ($('#authButton')) $('#authButton').classList.add('hidden');
      if ($('#profileMini')) $('#profileMini').classList.remove('hidden');
      if ($('#logoutButton')) $('#logoutButton').classList.remove('hidden');
      if ($('#headerNickname')) $('#headerNickname').textContent = state.profile.nickname;
      updateAllProfileAvatars();
    } else {
      if ($('#authButton')) $('#authButton').classList.remove('hidden');
      if ($('#profileMini')) $('#profileMini').classList.add('hidden');
      if ($('#logoutButton')) $('#logoutButton').classList.add('hidden');
    }
  }

  function updateAllProfileAvatars() {
    const url = state.profile.avatarUrl;
    const initials = (state.profile.nickname || 'FO').slice(0, 2).toUpperCase();
    $$('.profile-mini .avatar, .profile-main .avatar, #headerAvatar, #cardAvatar, #profileAvatar, #feedUserAvatar').forEach(el => {
      if (url) {
        el.style.backgroundImage = `url('${url}')`;
        el.style.backgroundSize = 'cover';
        el.textContent = '';
      } else {
        el.style.backgroundImage = '';
        el.textContent = initials;
      }
    });
  }

  function renderProfileData() {
    const p = state.profile;
    if ($('#profileName')) $('#profileName').textContent = p.nickname;
    if ($('#profileSubtitle')) $('#profileSubtitle').textContent = `${p.role} · ${p.weapon} Specialist · ${p.clan}`;
    if ($('#profileBio')) $('#profileBio').textContent = `“${p.bio}”`;
    if ($('#profileClan')) $('#profileClan').textContent = p.clan;
    if ($('#profileStyle')) $('#profileStyle').textContent = p.style.toUpperCase();
    if ($('#profileWeapon')) $('#profileWeapon').textContent = p.weapon.toUpperCase();
    if ($('#profileRank')) $('#profileRank').textContent = p.rank;
    if ($('#profileId')) $('#profileId').textContent = p.playerId;
    if ($('#cardNickname')) $('#cardNickname').textContent = p.nickname;
    if ($('#cardScore')) $('#cardScore').textContent = formatNumber(state.score);
    if ($('#homeScore')) $('#homeScore').textContent = formatNumber(state.score);
    if ($('#profileScore')) $('#profileScore').textContent = formatNumber(state.score);

    updateAllProfileAvatars();
    renderCareerTimeline();
    renderProfileFeed();
  }

  function renderCareerTimeline() {
    const timeline = $('#careerTimeline');
    if (!timeline) return;
    timeline.innerHTML = (state.profile.career || defaultProfile.career).map(item => `
      <div class="career-event">
        <span class="event-dot ${item.tone || 'gold'}"></span>
        <time>${item.date}</time>
        <div><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.description)}</p></div>
      </div>`).join('');
  }

  function renderActivities() {
    const output = $('#homeTimeline');
    if (!output) return;
    output.innerHTML = state.activities.slice(0, 3).map(item => `
      <div class="timeline-item">
        <span class="timeline-icon">${item.icon}</span>
        <div><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.subtitle)}</p></div>
        <time>${escapeHtml(item.time)}</time>
      </div>`).join('');
  }

  function renderPosts() {
    const postList = $('#postList');
    if (!postList) return;
    postList.innerHTML = state.posts.map(post => `
      <article class="post card">
        <div class="post-head">
          <span class="avatar">${post.initials}</span>
          <div><b>${escapeHtml(post.author)}</b><small>${escapeHtml(post.role)}</small></div>
        </div>
        <p class="post-body">${escapeHtml(post.text)}</p>
        <div class="post-footer">
          <button data-like>♡ <span>${post.likes}</span> curtidas</button>
          <button>◌ ${post.comments} comentários</button>
        </div>
      </article>
    `).join('');

    $$('[data-like]', postList).forEach(btn => {
      btn.addEventListener('click', () => {
        const span = btn.querySelector('span');
        span.textContent = Number(span.textContent) + 1;
        btn.style.color = 'var(--pink)';
      });
    });
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  // --- INICIALIZAÇÃO E EVENTOS ---
  function initialise() {
    renderProfileData();
    renderActivities();
    renderPosts();
    setupCoachScreenshotUpload();

    // Navegação e Abas do Perfil
    $$('.profile-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        $$('.profile-tab').forEach(b => b.classList.remove('active'));
        $$('.profile-tab-content').forEach(c => c.classList.remove('active'));
        tabBtn.classList.add('active');
        const target = $('#' + tabBtn.dataset.tab);
        if (target) target.classList.add('active');
      });
    });

    // Links de Navegação
    $$('[data-page]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(btn.dataset.page);
      });
    });

    // Modais Botões
    if ($('#authButton')) $('#authButton').addEventListener('click', () => showModal('#authModal'));
    if ($('#editProfile')) $('#editProfile').addEventListener('click', () => showModal('#editModal'));
    if ($('#modalBackdrop')) $('#modalBackdrop').addEventListener('click', closeModals);
    $$('[data-close-modal]').forEach(btn => btn.addEventListener('click', closeModals));

    // Upload de Mídia no Instagram Feed
    if ($('#uploadInstaMediaBtn')) {
      $('#uploadInstaMediaBtn').addEventListener('click', () => showModal('#instaUploadModal'));
    }

    if ($('#instaUploadForm')) {
      $('#instaUploadForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const file = $('#instaMediaInput').files[0];
        const caption = $('#instaCaptionInput').value;

        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const type = file.type.startsWith('video') ? 'video' : 'image';
          state.profile.feedMedia.unshift({
            id: String(Date.now()),
            type: type,
            url: event.target.result,
            caption: caption,
            likes: 0,
            comments: 0,
            date: 'Agora'
          });
          persist();
          renderProfileFeed();
          closeModals();
          toast('Publicado com sucesso no feed do seu perfil!');
        };
        reader.readAsDataURL(file);
      });
    }

    // Formulário do Coach
    if ($('#coachForm')) {
      $('#coachForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const mode = $('#coachMode').value;
        const map = $('#coachMap').value;
        createCoachReportFromScreenshots({ mode, map });
      });
    }

    // Login Form Simulado
    if ($('#authForm')) {
      $('#authForm').addEventListener('submit', (e) => {
        e.preventDefault();
        currentUser = { email: $('#authForm').elements['email'].value };
        state.profile.nickname = currentUser.email.split('@')[0];
        persist();
        updateAuthUI();
        renderProfileData();
        closeModals();
        toast('Conectado com sucesso!');
      });
    }

    // Contador de Caracteres no Feed
    if ($('#postInput')) {
      $('#postInput').addEventListener('input', event => { 
        if ($('#charCount')) $('#charCount').textContent = `${event.target.value.length}/280`;
      });
    }

    // Publicar Post Comunidade
    if ($('#publishPostBtn')) {
      $('#publishPostBtn').addEventListener('click', () => {
        const text = $('#postInput').value.trim();
        if (!text) return;
        state.posts.unshift({
          author: state.profile.nickname,
          initials: (state.profile.nickname || 'FO').slice(0, 2).toUpperCase(),
          role: 'Jogador CODM',
          text: text,
          likes: 0,
          comments: 0
        });
        $('#postInput').value = '';
        if ($('#charCount')) $('#charCount').textContent = '0/280';
        persist();
        renderPosts();
        toast('Post publicado na comunidade!');
      });
    }
  }

  document.addEventListener('DOMContentLoaded', initialise);
})();