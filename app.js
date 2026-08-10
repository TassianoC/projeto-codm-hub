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
    ]
  };

  const defaults = {
    currentUser: null, // Armazena usuário autenticado
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
      return { ...defaults, ...data, profile: { ...defaults.profile, ...(data?.profile || {}) } }; 
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
  let authMode = 'login'; // 'login' ou 'register'
  let pendingPostPhotoUrl = '';

  /**
   * Utilitário para exibir mensagens Toast na tela
   */
  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    $('p', el).textContent = message;
    el.classList.add('show');
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => el.classList.remove('show'), 3500);
  }

  /**
   * Abre o seletor de arquivos do aparelho (galeria ou câmera)
   * e faz o upload da foto para o Firebase Storage (com leitor local de contingência)
   */
  async function selectAndUploadPhoto(folder = 'uploads') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) {
          resolve(null);
          return;
        }

        try {
          toast('Processando imagem do aparelho...');
          if (firebase && firebase.available && firebase.storage && firebase.sdk.ref && firebase.sdk.uploadBytes) {
            const userId = currentUser ? currentUser.uid : 'guest_' + Date.now();
            const fileName = `${folder}/${userId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const storageRef = firebase.sdk.ref(firebase.storage, fileName);
            
            const snapshot = await firebase.sdk.uploadBytes(storageRef, file);
            const downloadUrl = await firebase.sdk.getDownloadURL(snapshot.ref);
            
            toast('Foto enviada com sucesso!');
            resolve(downloadUrl);
          } else {
            const reader = new FileReader();
            reader.onload = (e) => {
              toast('Foto do dispositivo carregada!');
              resolve(e.target.result);
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
          }
        } catch (err) {
          console.warn('Erro ao subir para Firebase Storage. Usando modo de compatibilidade...', err);
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        }
      };

      input.click();
    });
  }

  // --- GERENCIAMENTO DE INTERFACE E AUTENTICAÇÃO ---

  /**
   * Atualiza a visibilidade das abas e botões da interface baseando-se no estado de autenticação
   */
  function updateAuthUI() {
    const isLoggedIn = !!currentUser;
    
    // Atualiza links de perfil na navegação (só aparecem logado)
    $$('.auth-required-nav').forEach(el => {
      el.classList.toggle('hidden', !isLoggedIn);
    });

    if (isLoggedIn) {
      if ($('#authButton')) $('#authButton').classList.add('hidden');
      if ($('#profileMini')) $('#profileMini').classList.remove('hidden');
      if ($('#logoutButton')) $('#logoutButton').classList.remove('hidden');
      if ($('#adminButton')) $('#adminButton').classList.remove('hidden');

      // Atualiza nome/avatar do topo
      const nickname = state.profile.nickname || currentUser.email.split('@')[0];
      if ($('#headerNickname')) $('#headerNickname').textContent = nickname;
      updateAllProfileAvatars();
    } else {
      if ($('#authButton')) $('#authButton').classList.remove('hidden');
      if ($('#profileMini')) $('#profileMini').classList.add('hidden');
      if ($('#logoutButton')) $('#logoutButton').classList.add('hidden');
      if ($('#adminButton')) $('#adminButton').classList.add('hidden');

      // Se o usuário estiver na página de perfil mas não estiver logado, redireciona para a página inicial
      const activePage = $('.page.active');
      if (activePage && activePage.id === 'perfil') {
        navigate('inicio');
      }
    }
  }

  /**
   * Sincroniza dados do perfil vindos do Firestore / LocalStorage do usuário logado
   */
  async function loadUserProfile(user) {
    if (!user) return;
    
    // Tenta carregar do Firestore se disponível
    if (firebase && firebase.available && firebase.db && firebase.sdk.doc && firebase.sdk.getDoc) {
      try {
        const userDocRef = firebase.sdk.doc(firebase.db, 'users', user.uid);
        const docSnap = await firebase.sdk.getDoc(userDocRef);
        if (docSnap.exists()) {
          const fetchedData = docSnap.data();
          state.profile = { ...defaultProfile, ...(fetchedData.profile || {}) };
          if (fetchedData.score) state.score = fetchedData.score;
        } else {
          // Se é uma conta recém-criada no Firebase sem documento, salva o padrão e abre a tela de edição de perfil
          saveUserProfile();
          showModal('#editModal');
          if ($('#editModalTitle')) $('#editModalTitle').textContent = 'Crie seu perfil competitivo';
          toast('Bem-vindo! Complete seu perfil para começar.');
        }
      } catch (err) {
        console.warn('Erro ao obter perfil no Firestore:', err);
      }
    }
    
    renderProfileData();
    persist();
    updateAuthUI();
  }

  /**
   * Salva as alterações do perfil no Firebase Firestore e no LocalStorage
   */
  async function saveUserProfile() {
    persist();
    if (currentUser && firebase && firebase.available && firebase.db && firebase.sdk.doc && firebase.sdk.setDoc) {
      try {
        const userDocRef = firebase.sdk.doc(firebase.db, 'users', currentUser.uid);
        await firebase.sdk.setDoc(userDocRef, {
          profile: state.profile,
          score: state.score,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Erro ao salvar perfil no Firestore:', err);
      }
    }
  }

  /**
   * Renderiza os dados do perfil atual na tela
   */
  function renderProfileData() {
    const p = state.profile;
    const initials = (p.nickname || 'FO').slice(0, 2).toUpperCase();

    // Textos principais
    if ($('#profileName')) $('#profileName').textContent = p.nickname || 'JOGADOR';
    if ($('#profileHeading')) $('#profileHeading').innerHTML = `${escapeHtml(p.nickname || 'JOGADOR')}<em></em>`;
    if ($('#profileSubtitle')) $('#profileSubtitle').textContent = `${p.role || 'Flex'} · ${p.weapon || 'AK117'} Specialist · ${p.clan || 'Sem Clã'}`;
    if ($('#profileBio')) $('#profileBio').textContent = `“${p.bio || 'Sem bio definida.'}”`;
    if ($('#profileClan')) $('#profileClan').textContent = p.clan || 'SEM CLÃ';
    if ($('#profileStyle')) $('#profileStyle').textContent = (p.style || 'AGGRESSIVE').toUpperCase();
    if ($('#profileWeapon')) $('#profileWeapon').textContent = (p.weapon || 'AK117').toUpperCase();
    if ($('#profileRank')) $('#profileRank').textContent = p.rank || 'ELITE III';
    if ($('#profileId')) $('#profileId').textContent = p.playerId || '#BR-0000';
    if ($('#resumeContact')) $('#resumeContact').innerHTML = `CONTATO <b>@${p.nickname || 'JOGADOR'}</b>`;

    // Cards do Hero na página inicial
    if ($('#cardNickname')) $('#cardNickname').textContent = p.nickname;
    if ($('#cardClanRole')) $('#cardClanRole').textContent = `${p.clan} · ${(p.role || '').toUpperCase()}`;
    if ($('#cardScore')) $('#cardScore').textContent = formatNumber(state.score);
    if ($('#cardRank')) $('#cardRank').textContent = p.rank;

    // Formulário de edição do perfil (Preenche campos)
    const form = $('#profileForm');
    if (form) {
      if (form.elements['nickname']) form.elements['nickname'].value = p.nickname || '';
      if (form.elements['clan']) form.elements['clan'].value = p.clan || '';
      if (form.elements['bio']) form.elements['bio'].value = p.bio || '';
      if (form.elements['role']) form.elements['role'].value = p.role || 'Entry Fragger';
      if (form.elements['style']) form.elements['style'].value = p.style || 'Aggressive';
      if (form.elements['weapon']) form.elements['weapon'].value = p.weapon || '';
      if (form.elements['favoriteMap']) form.elements['favoriteMap'].value = p.favoriteMap || '';
      if (form.elements['availability']) form.elements['availability'].value = String(p.availability);
    }

    updateAllProfileAvatars();
    renderCareerTimeline();
  }

  function renderAvatar(avatarEl, initials, avatarUrl) {
    if (!avatarEl) return;
    if (avatarUrl) {
      avatarEl.style.backgroundImage = `url('${avatarUrl}')`;
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.style.backgroundPosition = 'center';
      avatarEl.textContent = '';
      avatarEl.classList.add('has-image');
    } else {
      avatarEl.style.backgroundImage = '';
      avatarEl.textContent = initials;
      avatarEl.classList.remove('has-image');
    }
  }

  function updateAllProfileAvatars() {
    const url = state.profile.avatarUrl;
    const initials = (state.profile.nickname || 'FO').slice(0, 2).toUpperCase();
    
    $$('.profile-mini .avatar, .profile-main .avatar, #userAvatar, #profileAvatar, #headerAvatar, #cardAvatar, #feedUserAvatar').forEach(el => {
      renderAvatar(el, initials, url);
    });
  }

  function renderCareerTimeline() {
    const timelineEl = $('#careerTimeline');
    if (!timelineEl) return;
    const list = state.profile.career || defaultProfile.career;
    
    timelineEl.innerHTML = list.map(item => `
      <div class="career-event">
        <span class="event-dot ${item.tone || 'gold'}"></span>
        <time>${escapeHtml(item.date)}</time>
        <div>
          <b>${escapeHtml(item.title)}</b>
          <p>${escapeHtml(item.description)}</p>
        </div>
      </div>
    `).join('');
  }

  // --- NAVEGAÇÃO E MODAIS ---

  function navigate(page) {
    // Se a página for restrita (perfil) e o usuário não estiver logado, abre a modal de login
    if (page === 'perfil' && !currentUser) {
      toast('Faça login ou cadastre uma conta para acessar seu perfil!');
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
      m.querySelector('input, select, button')?.focus();
    }
  }

  function closeModals() {
    if ($('#modalBackdrop')) $('#modalBackdrop').classList.remove('show');
    $$('.modal').forEach(modal => modal.classList.remove('show'));
    document.body.style.overflow = '';
  }

  function openDuel() { showModal('#duelModal'); }

  // --- COMPONENTES E UTILITÁRIOS ---

  function updateChallenge() {
    const count = Math.min(30, state.challenge);
    const percent = Math.round((count / 30) * 100);
    if ($('#challengeProgress')) $('#challengeProgress').textContent = count;
    if ($('#challengePercent')) $('#challengePercent').textContent = `${percent}%`;
    if ($('#challengeCount')) $('#challengeCount').textContent = count;
    if ($('#challengeBar')) $('#challengeBar').style.width = `${percent}%`;
    if ($('#largeChallengeBar')) $('#largeChallengeBar').style.width = `${percent}%`;
    if ($('#largeChallengeText')) $('#largeChallengeText').textContent = `${count} de 30 eliminações validadas`;
  }

  function updateScore() {
    $$('#homeScore, #profileScore').forEach(el => el.textContent = formatNumber(state.score));
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

  function postMarkup(post, spotlight = false) {
    const hasMedia = post.mediaUrl ? `<div class="post-media-preview"><img src="${post.mediaUrl}" alt="Mídia anexada pelo usuário" style="max-width:100%; border-radius:8px; margin-top:10px;"></div>` : '';
    const avatarStyle = post.avatarUrl ? `style="background-image:url('${post.avatarUrl}');background-size:cover;background-position:center;"` : '';

    if (spotlight) return `
      <article class="spotlight-card card">
        <div class="post-author"><span class="avatar small" ${avatarStyle}>${post.avatarUrl ? '' : post.initials}</span><div><b>${escapeHtml(post.author)}</b><small>${escapeHtml(post.role)}</small></div></div>
        <p>${escapeHtml(post.text)}</p>
        ${hasMedia}
        <div class="post-meta">♡ ${post.likes} curtidas · ◌ ${post.comments} comentários</div>
      </article>`;
    return `
      <article class="post card">
        <div class="post-head"><span class="avatar" ${avatarStyle}>${post.avatarUrl ? '' : post.initials}</span><div><b>${escapeHtml(post.author)}</b><small>${escapeHtml(post.role)}</small></div></div>
        <p class="post-body">${escapeHtml(post.text)}</p>
        ${hasMedia}
        <div class="post-footer"><button data-like>♡ <span>${post.likes}</span> curtidas</button><button>◌ ${post.comments} comentários</button><button data-share-post>↗ Compartilhar</button></div>
      </article>`;
  }

  function renderPosts() {
    if ($('#spotlightPosts')) $('#spotlightPosts').innerHTML = state.posts.slice(0, 3).map(post => postMarkup(post, true)).join('');
    const postList = $('#postList');
    if (!postList) return;
    postList.innerHTML = state.posts.map(post => postMarkup(post)).join('');
    
    $$('[data-like]', postList).forEach(button => {
      button.addEventListener('click', () => {
        const value = $('span', button);
        value.textContent = Number(value.textContent) + 1;
        button.style.color = 'var(--pink)';
      });
    });

    $$('[data-share-post]', postList).forEach(button => {
      button.addEventListener('click', () => toast('Link da publicação copiado para a área de transferência!'));
    });
  }

  const matchData = [
    { mode: '1v1', title: 'Sniper Duel', map: 'Shipment · BO3', player: 'NyxGhost', score: '8.216', points: 100, accent: '255,99,121' },
    { mode: '2v2', title: 'Duo Rush', map: 'Nuketown · BO3', player: 'Karll + M4G', score: '8.038', points: 160, accent: '111,164,255' },
    { mode: '5v5', title: 'Scrim competitivo', map: 'Hardpoint · Raid', player: 'Wolfpack BR', score: 'Time Elite', points: 280, accent: '230,197,106' },
    { mode: '1v1', title: 'Aim Check', map: 'Standoff · BO1', player: 'S4D_Arrow', score: '7.998', points: 80, accent: '98,214,155' },
    { mode: '2v2', title: 'Double Tap', map: 'Firing Range · BO3', player: 'Daze + Lucky', score: '8.554', points: 190, accent: '255,99,121' },
    { mode: '5v5', title: 'Liga noturna', map: 'S&D · Standoff', player: 'Nexus Esports', score: 'Time Elite', points: 300, accent: '111,164,255' }
  ];

  function renderMatches(filter = 'all') {
    const matches = filter === 'all' ? matchData : matchData.filter(match => match.mode === filter);
    if ($('#matchGrid')) {
      $('#matchGrid').innerHTML = matches.map(match => `
        <article class="match-card card" style="--accent:${match.accent}">
          <div class="match-top"><span class="mode-tag">${match.mode} · ABERTO</span><span class="xp-badge">+${match.points} PTS</span></div>
          <h3>${match.title}</h3><p>${match.map}</p>
          <div class="match-player"><span class="avatar small">${match.player.slice(0, 2).toUpperCase()}</span><div><b>${match.player}</b><small>${match.score} Player Score</small></div></div>
          <div class="match-bottom"><span>⏱ Começa em breve</span><button class="button small ghost" data-open-duel>Desafiar</button></div>
        </article>`).join('');
      $$('[data-open-duel]', $('#matchGrid')).forEach(button => button.addEventListener('click', openDuel));
    }
  }

  const rankings = [
    ['R4GNA_RX', 'RX', 'IGL', '74%', '9.486'], ['VK_VALKYRIE', 'VK', 'Flex', '72%', '9.142'], ['TUCAFPS', 'TU', 'Sniper', '70%', '8.991'],
    ['L0KI_ENTRY', 'LE', 'Entry', '69%', '8.903'], ['MIRAGE_ZN', 'MZ', 'Support', '67%', '8.878'], ['FALLK_OP', 'FO', 'Entry', '68%', '8.742'],
    ['NEXUS_RUSH', 'NR', 'Flex', '65%', '8.704'], ['S4D_ARROW', 'SA', 'Sniper', '66%', '8.668'], ['KARLLFPS', 'KF', 'Entry', '64%', '8.612'], ['LUNA_CODM', 'LU', 'IGL', '62%', '8.590']
  ];

  function renderRanking(query = '') {
    const cleanedQuery = query.trim().toLowerCase();
    const list = rankings.filter(row => row[0].toLowerCase().includes(cleanedQuery));
    if ($('#rankingRows')) {
      $('#rankingRows').innerHTML = list.map((row) => `
        <div class="rank-row"><span class="rank-number">${rankings.indexOf(row) + 1}</span>
          <span class="rank-player"><span class="avatar small">${row[1]}</span><b>${row[0]}</b></span>
          <span class="rank-role">${row[2]}</span><span class="rank-wr">${row[3]}</span><strong class="rank-score">${row[4]}</strong>
          <button class="circle-action" title="Ver perfil" data-rank-player="${row[0]}">→</button>
        </div>`).join('') || '<div class="rank-row"><span></span><span>Nenhum jogador encontrado.</span></div>';
      $$('[data-rank-player]').forEach(button => button.addEventListener('click', () => toast(`Perfil de ${button.dataset.rankPlayer} em breve.`)));
    }
  }

  function renderSkills() {
    const skills = [{ name: 'Mira', score: 91, color: 'var(--gold)' }, { name: 'Reação', score: 87, color: 'var(--pink)' }, { name: 'Decisão', score: 74, color: 'var(--blue)' }, { name: 'Objetivo', score: 68, color: 'var(--green)' }];
    if ($('#skillBars')) $('#skillBars').innerHTML = skills.map(skill => `<div class="skill-row"><span>${skill.name}</span><i><b style="width:${skill.score}%;--skill:${skill.color}"></b></i><strong>${skill.score}</strong></div>`).join('');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  function createCoachReport(data) {
    const kills = Number(data.kills);
    const deaths = Math.max(1, Number(data.deaths));
    const kd = (kills / deaths).toFixed(2);
    const win = data.win === 'yes';
    const behavior = data.behavior;
    
    const aim = Math.min(98, Math.round(66 + kd * 11 + (win ? 4 : 0)));
    const decision = Math.min(96, Math.max(42, 72 + (win ? 9 : -6) + (behavior === 'solo' ? -10 : 0) + (behavior === 'objective' ? 7 : 0)));
    const aggression = Math.min(96, Math.round(57 + kills * 1.1 + (behavior === 'solo' ? 7 : 0)));
    const positioning = Math.min(94, Math.max(40, 67 + (behavior === 'balanced' ? 11 : 0) + (behavior === 'solo' ? -14 : 0)));
    
    let insight = 'Você jogou de forma equilibrada. Preserve as trocas com seu squad e use essa consistência para acelerar o ritmo no meio da partida.';
    let title = 'Base sólida para evoluir';
    
    if (behavior === 'solo') { title = 'Evite as entradas isoladas'; insight = 'Seu dano aparece, mas você está entrando sozinho em situações de desvantagem. Espere o trade do time antes do próximo push.'; }
    if (behavior === 'objective') { title = 'Ótima leitura de objetivo'; insight = 'Você gerou valor ao priorizar o objetivo. Agora comunique o timing de rotação para que o time chegue junto.'; }
    if (behavior === 'passive') { title = 'Você pode pressionar mais'; insight = 'Seu posicionamento se manteve seguro, mas o impacto caiu. Escolha um timing por rotação para disputar espaço.'; }
    
    const grade = Math.round((aim + decision + aggression + positioning) / 4);
    
    if ($('#coachReport')) {
      $('#coachReport').innerHTML = `
        <div class="report-title"><div><span class="eyebrow">RELATÓRIO · ${escapeHtml(data.mode)} / ${escapeHtml(data.map)}</span><h2>${title}</h2></div><span class="coach-grade">${grade}</span></div>
        <div class="coach-kpis"><div><b>${aim}</b><span>MIRA</span></div><div><b>${decision}</b><span>DECISÃO</span></div><div><b>${aggression}</b><span>AGRESSIVIDADE</span></div><div><b>${positioning}</b><span>POSICIONAMENTO</span></div></div>
        <div class="coach-insight"><b>✦ PRINCIPAL INSIGHT (K/D ${kd})</b><p>${insight}</p></div>
        <div class="coach-insight"><b>PRÓXIMO TREINO</b><p>Antes da próxima partida, jogue duas rotações com foco em callouts curtos: posição, número de inimigos e direção do push.</p></div>`;
    }
    
    state.activities.unshift({ icon: '✦', title: 'Análise do Coach concluída', subtitle: `Relatório ${grade}/100 em ${data.mode}`, time: 'agora' });
    state.activities = state.activities.slice(0, 5);
    persist(); 
    renderActivities();
  }

  // --- INICIALIZAÇÃO E EVENTOS DE BOTAO DA APLICAÇÃO ---

  function initialise() {
    updateChallenge(); 
    updateScore(); 
    renderActivities(); 
    renderPosts(); 
    renderMatches(); 
    renderRanking(); 
    renderSkills(); 
    renderProfileData();

    const initialPage = location.hash.slice(1);
    if (initialPage && document.getElementById(initialPage)) {
      navigate(initialPage);
    } else {
      updateAuthUI();
    }

    // Escuta conexão do Firebase
    window.addEventListener('codmFirebaseReady', (e) => {
      firebase = e.detail;
      if (firebase && firebase.available && firebase.sdk.onAuthStateChanged) {
        firebase.sdk.onAuthStateChanged(firebase.auth, (user) => {
          currentUser = user;
          if (user) {
            loadUserProfile(user);
          } else {
            updateAuthUI();
          }
        });
      }
    });

    // Botões de Navegação Global
    $$('[data-page]').forEach(button => {
      button.addEventListener('click', event => { 
        event.preventDefault(); 
        navigate(button.dataset.page); 
      });
    });

    // Botões diretos da Hero e atalhos de Perfil
    if ($('#heroCareerBtn')) $('#heroCareerBtn').addEventListener('click', () => navigate('perfil'));
    if ($('#quickProfileBtn')) $('#quickProfileBtn').addEventListener('click', () => navigate('perfil'));
    if ($('#activityProfileBtn')) $('#activityProfileBtn').addEventListener('click', () => navigate('perfil'));

    // Botão de Notificações
    if ($('#notificationButton')) {
      $('#notificationButton').addEventListener('click', () => {
        showModal('#notificationsModal');
        if ($('#notificationBadge')) $('#notificationBadge').textContent = '0';
      });
    }

    // Botão de abrir modal de Auth
    if ($('#authButton')) $('#authButton').addEventListener('click', () => showModal('#authModal'));

    // Botão de Logout
    if ($('#logoutButton')) {
      $('#logoutButton').addEventListener('click', () => {
        if (firebase && firebase.available && firebase.auth) {
          firebase.sdk.signOut(firebase.auth).then(() => {
            currentUser = null;
            state.profile = { ...defaultProfile };
            updateAuthUI();
            toast('Você saiu da sua conta.');
          });
        } else {
          currentUser = null;
          updateAuthUI();
          toast('Sessão encerrada.');
        }
      });
    }

    // Alternador de modo da modal Auth (Login x Cadastro)
    if ($('#toggleAuthMode')) {
      $('#toggleAuthMode').addEventListener('click', () => {
        authMode = authMode === 'login' ? 'register' : 'login';
        if (authMode === 'register') {
          if ($('#authModalTitle')) $('#authModalTitle').textContent = 'Crie sua conta no HUB';
          if ($('#authModalDesc')) $('#authModalDesc').textContent = 'Cadastre-se para iniciar seu histórico competitivo no CODM HUB.';
          if ($('#emailAuthSubmit')) $('#emailAuthSubmit').textContent = 'Cadastrar nova conta';
          if ($('#toggleAuthMode')) $('#toggleAuthMode').textContent = 'Já tem uma conta? Entrar';
        } else {
          if ($('#authModalTitle')) $('#authModalTitle').textContent = 'Entre na sua carreira';
          if ($('#authModalDesc')) $('#authModalDesc').textContent = 'Acesse com sua conta para gerenciar seu perfil e interagir com a comunidade.';
          if ($('#emailAuthSubmit')) $('#emailAuthSubmit').textContent = 'Entrar na conta';
          if ($('#toggleAuthMode')) $('#toggleAuthMode').textContent = 'Ainda não tem conta? Criar nova conta';
        }
      });
    }

    // Submissão do Formulário de Auth (Login / Cadastro via E-mail)
    if ($('#authForm')) {
      $('#authForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = $('#authForm').elements['email'].value;
        const password = $('#authForm').elements['password'].value;

        toast('Processando autenticação...');
        if (firebase && firebase.available && firebase.auth) {
          try {
            if (authMode === 'register') {
              const userCred = await firebase.sdk.createUserWithEmailAndPassword(firebase.auth, email, password);
              currentUser = userCred.user;
              toast('Conta criada com sucesso!');
              closeModals();
              await loadUserProfile(currentUser);
            } else {
              const userCred = await firebase.sdk.signInWithEmailAndPassword(firebase.auth, email, password);
              currentUser = userCred.user;
              toast('Login efetuado com sucesso!');
              closeModals();
              await loadUserProfile(currentUser);
            }
          } catch (err) {
            console.error('Erro de autenticação:', err);
            toast(`Erro ao autenticar: ${err.message || 'Verifique seus dados.'}`);
          }
        } else {
          // Fallback offline / local
          currentUser = { uid: 'local_user_' + Date.now(), email };
          state.profile.nickname = email.split('@')[0];
          toast('Conectado em modo de demonstração local!');
          closeModals();
          updateAuthUI();
        }
      });
    }

    // Login com Google
    if ($('#googleLogin')) {
      $('#googleLogin').addEventListener('click', async () => {
        if (firebase && firebase.available && firebase.auth && firebase.sdk.GoogleAuthProvider) {
          try {
            const provider = new firebase.sdk.GoogleAuthProvider();
            const result = await firebase.sdk.signInWithPopup(firebase.auth, provider);
            currentUser = result.user;
            toast(`Conectado como ${currentUser.displayName || currentUser.email}`);
            closeModals();
            await loadUserProfile(currentUser);
          } catch (err) {
            console.error(err);
            toast('Falha ao autenticar com Google.');
          }
        } else {
          currentUser = { uid: 'google_user_demo', email: 'usuario_google@gmail.com' };
          toast('Conectado com Google em modo local!');
          closeModals();
          updateAuthUI();
        }
      });
    }

    // Botão do Menu Hambúrguer Mobile
    if ($('#menuButton')) {
      $('#menuButton').addEventListener('click', () => {
        const open = document.body.classList.toggle('menu-open');
        $('#menuButton').setAttribute('aria-expanded', String(open));
      });
    }

    // Alternar Tema (Claro / Escuro)
    if ($('#themeToggle')) {
      $('#themeToggle').addEventListener('click', () => {
        document.body.classList.toggle('light');
        $('#themeToggle').textContent = document.body.classList.contains('light') ? '◐' : '☼';
        localStorage.setItem('codm-hub-theme', document.body.classList.contains('light') ? 'light' : 'dark');
      });
    }
    if (localStorage.getItem('codm-hub-theme') === 'light') { 
      document.body.classList.add('light'); 
      if ($('#themeToggle')) $('#themeToggle').textContent = '◐'; 
    }

    // Modais e Fechamentos
    $$('[data-open-duel]').forEach(button => button.addEventListener('click', openDuel));
    $$('[data-score-info]').forEach(button => button.addEventListener('click', () => showModal('#scoreModal')));
    if ($('#editProfile')) $('#editProfile').addEventListener('click', () => showModal('#editModal'));
    if ($('#modalBackdrop')) $('#modalBackdrop').addEventListener('click', closeModals);
    $$('[data-close-modal]').forEach(button => button.addEventListener('click', closeModals));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModals(); });

    // Seleção de foto do aparelho ao clicar no Avatar Principal
    const mainAvatar = $('#profileAvatar');
    if (mainAvatar) {
      mainAvatar.title = "Clique para alterar a foto do seu perfil com uma do seu aparelho";
      mainAvatar.style.cursor = "pointer";
      mainAvatar.addEventListener('click', async () => {
        try {
          const photoUrl = await selectAndUploadPhoto('avatars');
          if (photoUrl) {
            state.profile.avatarUrl = photoUrl;
            await saveUserProfile();
            updateAllProfileAvatars();
            toast('Foto do perfil atualizada!');
          }
        } catch (err) {
          console.error(err);
        }
      });
    }

    // Botão de trocar foto dentro da Modal de Perfil
    if ($('#changeAvatarBtn')) {
      $('#changeAvatarBtn').addEventListener('click', async () => {
        try {
          const photoUrl = await selectAndUploadPhoto('avatars');
          if (photoUrl) {
            state.profile.avatarUrl = photoUrl;
            await saveUserProfile();
            updateAllProfileAvatars();
            toast('Sua foto de perfil foi alterada!');
          }
        } catch (e) {
          console.error(e);
        }
      });
    }

    // Salvar formulário de edição do perfil
    if ($('#profileForm')) {
      $('#profileForm').addEventListener('submit', async event => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        
        state.profile.nickname = formData.get('nickname') || state.profile.nickname;
        state.profile.clan = formData.get('clan') || state.profile.clan;
        state.profile.bio = formData.get('bio') || state.profile.bio;
        state.profile.role = formData.get('role') || state.profile.role;
        state.profile.style = formData.get('style') || state.profile.style;
        state.profile.weapon = formData.get('weapon') || state.profile.weapon;
        state.profile.favoriteMap = formData.get('favoriteMap') || state.profile.favoriteMap;
        state.profile.availability = formData.get('availability') === 'true';

        await saveUserProfile();
        renderProfileData();
        closeModals();
        toast('Seu perfil foi atualizado no CODM HUB!');
      });
    }

    // Botão Anexar Foto nas Publicações do Feed
    if ($('#attachPostPhotoBtn')) {
      $('#attachPostPhotoBtn').addEventListener('click', async () => {
        try {
          const photoUrl = await selectAndUploadPhoto('feed');
          if (photoUrl) {
            pendingPostPhotoUrl = photoUrl;
            $('#attachPostPhotoBtn').innerHTML = '✓ Foto Anexada';
            $('#attachPostPhotoBtn').style.color = 'var(--green)';
            toast('Foto anexada à publicação!');
          }
        } catch (e) {
          console.error(e);
        }
      });
    }

    // Publicar no Feed
    if ($('#postInput')) {
      $('#postInput').addEventListener('input', event => { 
        if ($('#charCount')) $('#charCount').textContent = `${event.target.value.length}/300`; 
      });
    }

    if ($('#publishPost')) {
      $('#publishPost').addEventListener('click', () => {
        const input = $('#postInput'); 
        const text = input ? input.value.trim() : '';
        if (!text && !pendingPostPhotoUrl) return toast('Escreva uma mensagem ou anexe uma foto para publicar.');
        
        const author = state.profile.nickname || 'FALLK_OP';
        state.posts.unshift({
          author: author,
          initials: author.slice(0, 2).toUpperCase(),
          role: 'Você · agora',
          text,
          likes: 0,
          comments: 0,
          accent: 'gold',
          avatarUrl: state.profile.avatarUrl,
          mediaUrl: pendingPostPhotoUrl
        });
        
        state.posts = state.posts.slice(0, 10);
        persist();
        if (input) input.value = '';
        if ($('#charCount')) $('#charCount').textContent = '0/300';
        
        pendingPostPhotoUrl = '';
        if ($('#attachPostPhotoBtn')) {
          $('#attachPostPhotoBtn').innerHTML = '📷 Foto do Aparelho';
          $('#attachPostPhotoBtn').style.color = 'var(--gold)';
        }

        renderPosts();
        toast('Publicação enviada para o lobby da comunidade!');
      });
    }

    // Filtros de Arena
    $$('.filter[data-arena-filter]').forEach(button => button.addEventListener('click', () => {
      $$('.filter[data-arena-filter]').forEach(item => item.classList.toggle('active', item === button));
      renderMatches(button.dataset.arenaFilter);
    }));

    // Filtros de Ranking
    $$('.filter[data-ranking-filter]').forEach(button => button.addEventListener('click', () => {
      $$('.filter[data-ranking-filter]').forEach(item => item.classList.toggle('active', item === button));
      toast(`Filtro do ranking: ${button.textContent}`);
    }));

    if ($('#rankSearch')) $('#rankSearch').addEventListener('input', event => renderRanking(event.target.value));

    // Abas do Perfil
    $$('.profile-tab').forEach(tab => tab.addEventListener('click', () => {
      $$('.profile-tab').forEach(item => item.classList.toggle('active', item === tab));
      $$('.profile-tab-content').forEach(content => content.classList.toggle('active', content.id === tab.dataset.profileTab));
    }));

    // Botões de Apostas / Pontos da Arena
    $$('.point').forEach(point => point.addEventListener('click', () => $$('.point').forEach(item => item.classList.toggle('active', item === point))));

    // Form de Desafios/Duelos
    if ($('#duelForm')) {
      $('#duelForm').addEventListener('submit', event => {
        event.preventDefault();
        const rival = new FormData(event.currentTarget).get('opponent');
        const points = $('.point.active')?.dataset.points || '100';
        closeModals(); 
        toast(`Desafio de ${points} pontos enviado para ${rival}!`);
      });
    }

    // Adicionar Marco na Carreira
    if ($('#addCareerMilestone')) $('#addCareerMilestone').addEventListener('click', () => showModal('#careerModal'));

    if ($('#careerForm')) {
      $('#careerForm').addEventListener('submit', async event => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const milestone = {
          date: formData.get('date'),
          title: formData.get('title'),
          description: formData.get('description'),
          tone: 'gold'
        };
        
        if (!state.profile.career) state.profile.career = [];
        state.profile.career.unshift(milestone);
        await saveUserProfile();
        renderCareerTimeline();
        closeModals();
        toast('Novo marco registrado na sua carreira!');
      });
    }

    // Botão de Compartilhar Perfil
    if ($('#shareProfile')) {
      $('#shareProfile').addEventListener('click', async () => {
        const url = `${location.href.split('#')[0]}#perfil`;
        try { 
          await navigator.clipboard.writeText(url); 
          toast('Link do seu perfil copiado!'); 
        } catch { 
          toast(`Perfil pronto para compartilhar: ${state.profile.nickname} · ${formatNumber(state.score)} Player Score`); 
        }
      });
    }

    // Incrementar progresso do desafio
    if ($('#addChallengeProgress')) {
      $('#addChallengeProgress').addEventListener('click', () => showModal('#evidenceModal'));
    }

    // Botões que abrem modal de comprovação de evidência
    $$('[data-open-evidence]').forEach(btn => {
      btn.addEventListener('click', () => {
        const kind = btn.dataset.evidenceKind || 'weekly';
        if ($('#evidenceKind')) $('#evidenceKind').value = kind;
        if ($('#evidenceCategory')) $('#evidenceCategory').value = kind;
        showModal('#evidenceModal');
      });
    });

    // Submissão do Formulário de Evidência
    if ($('#evidenceForm')) {
      $('#evidenceForm').addEventListener('submit', event => {
        event.preventDefault();
        closeModals();
        toast('Sua prova foi enviada para o painel de verificação ADM!');
      });
    }

    // Form do Coach
    if ($('#coachForm')) {
      $('#coachForm').addEventListener('submit', event => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        createCoachReport(data); 
        toast('Sua análise tática do Coach está pronta!');
      });
    }

    // Toggle de Mercado de Talentos
    if ($('#toggleAvailable')) {
      $('#toggleAvailable').addEventListener('click', async event => {
        state.profile.availability = !state.profile.availability; 
        await saveUserProfile();
        
        event.currentTarget.textContent = state.profile.availability ? '✓ Disponível para times' : 'Marcar como disponível';
        event.currentTarget.classList.toggle('primary', state.profile.availability); 
        event.currentTarget.classList.toggle('ghost', !state.profile.availability);
        
        toast(state.profile.availability ? 'Seu perfil agora aparece no Mercado de Talentos!' : 'Sua disponibilidade foi desativada.');
      });
    }

    // Painel ADM (Atualizar e Guia)
    if ($('#refreshAdmin')) {
      $('#refreshAdmin').addEventListener('click', () => toast('Fila de auditoria ADM atualizada!'));
    }
    if ($('#openAdminGuide')) {
      $('#openAdminGuide').addEventListener('click', () => toast('Diretrizes de Moderação: Sempre verifique o Nick, Pontuação e Íntegra da Mídia enviada.'));
    }
  }

  initialise();
})();
import React, { useState, useRef } from 'react';
import { 
  User, Image as ImageIcon, Video, PlusCircle, CheckCircle, Shield, 
  Trophy, MessageSquare, Play, Grid, Bookmark, Film, Upload, BarChart2, 
  Crosshair, Award, Zap, ChevronRight, Share2, Settings, ExternalLink, Trash2, Check
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'coach'
  const [profileSubTab, setProfileSubTab] = useState('grid'); // 'grid' | 'reels' | 'tagged'

  // --- ESTADOS DO PERFIL (INSTAGRAM STYLE) ---
  const [profile, setProfile] = useState({
    username: "Fallk Fps",
    verified: true,
    avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&auto=format&fit=crop&q=80",
    role: "Gamer",
    titles: { gold: 6, silver: 2, bronze: 4 },
    bioQuote: "Na vida existe dois caminhos, no certo vc me encontra e no errado eu te acho",
    link: "youtube.com/channel/UCzrQ2802HEKd7Bpt4CVkQ...",
    followers: 489,
    following: 147,
  });

  // Feed do perfil (com imagens e vídeos)
  const [posts, setPosts] = useState([
    {
      id: 1,
      type: 'image',
      url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
      pinned: true,
      caption: 'Loadout atualizado para a season de COD Mobile 💥 #CODM',
      likes: 124,
      comments: 18
    },
    {
      id: 2,
      type: 'image',
      url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
      pinned: true,
      caption: 'Design LOBARK em andamento 🐺 #GraphicDesign',
      likes: 89,
      comments: 7
    },
    {
      id: 3,
      type: 'video',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-gameplay-of-a-first-person-shooter-41503-large.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80',
      pinned: true,
      caption: 'Highlight de Sniper - Zona de Conflito em Shipment 🎯',
      likes: 210,
      comments: 34
    }
  ]);

  // Modal para novos posts no perfil
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostUrl, setNewPostUrl] = useState('');
  const [newPostType, setNewPostType] = useState('image');
  const [newPostCaption, setNewPostCaption] = useState('');

  // --- ESTADOS DO COACH IA (4 PRINTS ESPECÍFICOS) ---
  const [coachScreenshots, setCoachScreenshots] = useState({
    impacto: null,   // Print 1: Relatório Detalhado (Score, KDA, B/M, Precisão)
    armamento: null, // Print 2: Armamento (Armas, Perks, Séries de Pontuação)
    objeto: null,    // Print 3: Pontuação de Objeto e Habilidades
    duelo: null      // Print 4: Matriz de Duelos individuais contra inimigos
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [verdict, setVerdict] = useState(null);

  // Manipular upload fictício/real dos 4 prints do Coach
  const handleScreenshotUpload = (type, e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCoachScreenshots(prev => ({ ...prev, [type]: url }));
    }
  };

  // Simular carregamento dos 4 prints do usuário
  const loadExampleScreenshots = () => {
    setCoachScreenshots({
      impacto: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80",
      armamento: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80",
      objeto: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80",
      duelo: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80"
    });
  };

  // Adicionar novo post no perfil
  const handleAddPost = (e) => {
    e.preventDefault();
    if (!newPostUrl) return;

    const newPost = {
      id: Date.now(),
      type: newPostType,
      url: newPostUrl,
      thumbnail: newPostType === 'video' ? 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80' : newPostUrl,
      pinned: false,
      caption: newPostCaption,
      likes: 0,
      comments: 0
    };

    setPosts([newPost, ...posts]);
    setNewPostUrl('');
    setNewPostCaption('');
    setShowNewPostModal(false);
  };

  // Executar Análise da IA do Coach com base nos 4 prints
  const runCoachAnalysis = () => {
    if (!coachScreenshots.impacto || !coachScreenshots.armamento || !coachScreenshots.objeto || !coachScreenshots.duelo) {
      alert("Por favor, envie ou carregue os 4 prints obrigatórios da partida para que a IA possa analisar corretamente!");
      return;
    }

    setAnalyzing(true);
    setVerdict(null);

    setTimeout(() => {
      setAnalyzing(false);
      setVerdict({
        overallRating: "S+",
        matchResult: "VITÓRIA (150 : 46) - Zona de Conflito (Shipment)",
        playerRole: "Aggressive Slayer / Anchor secundário",
        extractedStats: {
          kda: "60 / 18 / 9 (3.33 B/M)",
          score: "6887 (MVP da Partida)",
          accuracy: "25.2%",
          headshots: "6.7%",
          objScore: "1030 pts",
          objTime: "00:01"
        },
        loadoutAnalysis: {
          weapon: "FSS Hurricane + Pistola Automática",
          streaks: "Goliath XS1, Turret, UAV",
          verdictText: "Loadout otimizado para combate contínuo a curta distância. O alto volume de munição da FSS Hurricane casou perfeitamente com a densidade de inimigos em Shipment."
        },
        duelsAnalysis: [
          { enemy: "415HW8elekS", score: "16-6", status: "Dominado" },
          { enemy: "QING.JIU.LUKE", score: "11-7", status: "Vantagem" },
          { enemy: "JoelNina", score: "10-5", status: "Vantagem" },
          { enemy: "queasyqueen", score: "20-0", status: "Totalmente Neutralizado" }
        ],
        coachRecommendations: [
          "Seu tempo no objetivo foi de 00:01, mas sua pontuação de objeto foi 1030 graças às eliminações dentro da área. Como Slayer, seu papel foi cumprido com maestria ao manter os alvos longe da zona.",
          "Sua taxa de tiros na cabeça foi de 6.7%. Eleve o crosshair placement no mapa Shipment para atingir a meta recomendada de pelo menos 12%.",
          "Duelos individuais impecáveis: você anulou completamente o jogador 'queasyqueen' (20-0) e manteve K/D positivo contra todos os 4 adversários."
        ]
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col font-sans">
      
      {/* HEADER PRINCIPAL / NAVEGAÇÃO DE ABAS */}
      <header className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="bg-red-600 text-white font-black px-2 py-1 rounded text-lg tracking-wider">FALLK</div>
          <span className="text-xs text-gray-400 font-semibold tracking-widest uppercase">Gaming Platform</span>
        </div>

        <nav className="flex space-x-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'profile' ? 'bg-red-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            <User size={16} />
            <span>Perfil (Instagram)</span>
          </button>

          <button
            onClick={() => setActiveTab('coach')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'coach' ? 'bg-red-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            <Zap size={16} />
            <span>Coach IA</span>
          </button>
        </nav>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-2 sm:p-4">

        {/* ========================================================= */}
        {/* ABA DE PERFIL (ESTILO INSTAGRAM)                          */}
        {/* ========================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            
            {/* Top Bar do Perfil */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold">{profile.username}</h1>
                {profile.verified && <CheckCircle size={18} className="text-blue-500 fill-blue-500 text-black" />}
              </div>
              <div className="flex space-x-3 text-gray-300">
                <PlusCircle 
                  size={24} 
                  className="cursor-pointer hover:text-red-500 transition" 
                  onClick={() => setShowNewPostModal(true)}
                />
                <Settings size={24} className="cursor-pointer hover:text-white transition" />
              </div>
            </div>

            {/* Cabeçalho de Estatísticas e Avatar */}
            <div className="flex items-center justify-between py-2">
              <div className="relative">
                <img 
                  src={profile.avatar} 
                  alt="Avatar" 
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-red-600 object-cover p-0.5"
                />
                <button 
                  onClick={() => setShowNewPostModal(true)}
                  className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1 border-2 border-black hover:bg-blue-500"
                >
                  <PlusCircle size={14} className="text-white" />
                </button>
              </div>

              <div className="flex space-x-6 sm:space-x-8 text-center pr-4">
                <div>
                  <div className="text-lg font-bold text-white">{posts.length}</div>
                  <div className="text-xs text-gray-400">posts</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{profile.followers}</div>
                  <div className="text-xs text-gray-400">seguidores</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{profile.following}</div>
                  <div className="text-xs text-gray-400">seguindo</div>
                </div>
              </div>
            </div>

            {/* Bio e Medalhas */}
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-gray-200">{profile.role}</p>
              
              <div className="flex items-center space-x-2 text-xs py-0.5">
                <span className="text-gray-400">Titles:</span>
                <span className="flex items-center text-yellow-400">🥇x{profile.titles.gold}</span>
                <span className="flex items-center text-gray-300">🥈x{profile.titles.silver}</span>
                <span className="flex items-center text-amber-600">🥉x{profile.titles.bronze}</span>
              </div>

              <p className="text-gray-300 font-medium">👾 playing for ...</p>
              <p className="text-gray-300 italic">"{profile.bioQuote}"</p>
              
              <a 
                href={`https://${profile.link}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center space-x-1 text-blue-400 hover:underline text-xs"
              >
                <ExternalLink size={12} />
                <span>{profile.link}</span>
              </a>
            </div>

            {/* Botões de Ação do Perfil */}
            <div className="grid grid-cols-2 gap-2 py-2">
              <button className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-1.5 rounded-lg text-sm transition">
                Editar perfil
              </button>
              <button className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-1.5 rounded-lg text-sm transition">
                Compartilhar perfil
              </button>
            </div>

            {/* Painel Profissional (Banner fictício do Instagram) */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-3 text-xs">
              <p className="font-semibold text-white">Painel profissional</p>
              <p className="text-gray-400">14 visualizações nos últimos 30 dias.</p>
            </div>

            {/* Destaques (Highlights) */}
            <div className="flex space-x-4 overflow-x-auto py-2 no-scrollbar border-b border-gray-800">
              <div 
                onClick={() => setShowNewPostModal(true)}
                className="flex flex-col items-center space-y-1 cursor-pointer min-w-[64px]"
              >
                <div className="w-14 h-14 rounded-full border border-gray-700 flex items-center justify-center bg-gray-900">
                  <PlusCircle size={24} className="text-gray-400" />
                </div>
                <span className="text-xs text-gray-400">Novo</span>
              </div>

              <div className="flex flex-col items-center space-y-1 min-w-[64px]">
                <div className="w-14 h-14 rounded-full border-2 border-red-600 p-0.5">
                  <img 
                    src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80" 
                    className="w-full h-full rounded-full object-cover" 
                    alt="AWP"
                  />
                </div>
                <span className="text-xs text-gray-300 font-medium">AWP</span>
              </div>
            </div>

            {/* Abas de Navegação do Feed (Grade / Vídeos / Marcados) */}
            <div className="flex justify-around border-b border-gray-800 pt-1">
              <button
                onClick={() => setProfileSubTab('grid')}
                className={`flex justify-center items-center py-2 flex-1 border-b-2 ${
                  profileSubTab === 'grid' ? 'border-white text-white' : 'border-transparent text-gray-500'
                }`}
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setProfileSubTab('reels')}
                className={`flex justify-center items-center py-2 flex-1 border-b-2 ${
                  profileSubTab === 'reels' ? 'border-white text-white' : 'border-transparent text-gray-500'
                }`}
              >
                <Film size={20} />
              </button>
              <button
                onClick={() => setProfileSubTab('tagged')}
                className={`flex justify-center items-center py-2 flex-1 border-b-2 ${
                  profileSubTab === 'tagged' ? 'border-white text-white' : 'border-transparent text-gray-500'
                }`}
              >
                <User size={20} />
              </button>
            </div>

            {/* FEED DE POSTS (GRADE DE FOTOS E VÍDEOS) */}
            {profileSubTab === 'grid' && (
              <div className="grid grid-cols-3 gap-1 pt-1">
                {posts.map((post) => (
                  <div key={post.id} className="relative aspect-square group bg-gray-900 overflow-hidden cursor-pointer">
                    {post.type === 'video' ? (
                      <video 
                        src={post.url} 
                        poster={post.thumbnail}
                        className="w-full h-full object-cover"
                        muted 
                        loop
                      />
                    ) : (
                      <img 
                        src={post.url} 
                        alt="Post Feed" 
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Indicadores de tipo no topo da imagem */}
                    {post.type === 'video' && (
                      <div className="absolute top-1.5 right-1.5 bg-black/60 p-1 rounded-full">
                        <Play size={12} className="text-white fill-white" />
                      </div>
                    )}

                    {/* Ícone de Pinned */}
                    {post.pinned && (
                      <div className="absolute top-1.5 left-1.5 bg-red-600 p-1 rounded-full text-white shadow">
                        <Zap size={10} />
                      </div>
                    )}

                    {/* Hover Effect */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-4 text-white font-bold text-xs">
                      <span>❤️ {post.likes}</span>
                      <span>💬 {post.comments}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {profileSubTab === 'reels' && (
              <div className="grid grid-cols-3 gap-1 pt-1">
                {posts.filter(p => p.type === 'video').map((post) => (
                  <div key={post.id} className="relative aspect-[9/16] bg-gray-900 overflow-hidden">
                    <video src={post.url} className="w-full h-full object-cover" controls />
                  </div>
                ))}
              </div>
            )}

            {profileSubTab === 'tagged' && (
              <div className="py-12 text-center text-gray-500 text-sm">
                Nenhum vídeo ou foto marcada por outros usuários ainda.
              </div>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* ABA DO COACH IA (ANÁLISE BASEADA NAS 4 IMAGENS DO CODM)  */}
        {/* ========================================================= */}
        {activeTab === 'coach' && (
          <div className="space-y-6">
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Zap className="text-red-500" size={20} />
                <span>Coach IA - Análise Tática COD Mobile</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Para obter o veredito exato da partida, envie os **4 prints específicos** da tela de estatísticas detalhadas pós-jogo.
              </p>
            </div>

            {/* GRID DE UPLOAD DOS 4 PRINTS OBRIGATÓRIOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* PRINT 1: RELATÓRIO DETALHADO (IMPACTO) */}
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-red-400 uppercase">1. Vitória / Impacto / KDA</span>
                    {coachScreenshots.impacto && <Check size={16} className="text-green-500" />}
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3">Print com Placard final, Score, KDA (B/M), Precisão e Headshots.</p>
                </div>

                {coachScreenshots.impacto ? (
                  <div className="relative h-28 bg-gray-900 rounded overflow-hidden border border-gray-800">
                    <img src={coachScreenshots.impacto} alt="Print Impacto" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setCoachScreenshots(p => ({ ...p, impacto: null }))}
                      className="absolute top-1 right-1 bg-black/80 p-1 rounded-full text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-gray-800 hover:border-red-600 h-28 rounded flex flex-col items-center justify-center cursor-pointer transition">
                    <Upload size={20} className="text-gray-500 mb-1" />
                    <span className="text-xs text-gray-400">Anexar Print 1</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleScreenshotUpload('impacto', e)} />
                  </label>
                )}
              </div>

              {/* PRINT 2: ARMAMENTO */}
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-red-400 uppercase">2. Armamento & Loadout</span>
                    {coachScreenshots.armamento && <Check size={16} className="text-green-500" />}
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3">Print com Armas principais, secundárias, Vantagens e Séries de Pontuação.</p>
                </div>

                {coachScreenshots.armamento ? (
                  <div className="relative h-28 bg-gray-900 rounded overflow-hidden border border-gray-800">
                    <img src={coachScreenshots.armamento} alt="Print Armamento" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setCoachScreenshots(p => ({ ...p, armamento: null }))}
                      className="absolute top-1 right-1 bg-black/80 p-1 rounded-full text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-gray-800 hover:border-red-600 h-28 rounded flex flex-col items-center justify-center cursor-pointer transition">
                    <Upload size={20} className="text-gray-500 mb-1" />
                    <span className="text-xs text-gray-400">Anexar Print 2</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleScreenshotUpload('armamento', e)} />
                  </label>
                )}
              </div>

              {/* PRINT 3: OBJETO */}
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-red-400 uppercase">3. Pontuação de Objeto</span>
                    {coachScreenshots.objeto && <Check size={16} className="text-green-500" />}
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3">Print com Letal/Tático, Habilidade de Operador e Pontuação de Objeto.</p>
                </div>

                {coachScreenshots.objeto ? (
                  <div className="relative h-28 bg-gray-900 rounded overflow-hidden border border-gray-800">
                    <img src={coachScreenshots.objeto} alt="Print Objeto" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setCoachScreenshots(p => ({ ...p, objeto: null }))}
                      className="absolute top-1 right-1 bg-black/80 p-1 rounded-full text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-gray-800 hover:border-red-600 h-28 rounded flex flex-col items-center justify-center cursor-pointer transition">
                    <Upload size={20} className="text-gray-500 mb-1" />
                    <span className="text-xs text-gray-400">Anexar Print 3</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleScreenshotUpload('objeto', e)} />
                  </label>
                )}
              </div>

              {/* PRINT 4: DUELO */}
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-red-400 uppercase">4. Matriz de Duelos</span>
                    {coachScreenshots.duelo && <Check size={16} className="text-green-500" />}
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3">Print com confronto direto (X - Y) contra cada jogador do time rival.</p>
                </div>

                {coachScreenshots.duelo ? (
                  <div className="relative h-28 bg-gray-900 rounded overflow-hidden border border-gray-800">
                    <img src={coachScreenshots.duelo} alt="Print Duelo" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setCoachScreenshots(p => ({ ...p, duelo: null }))}
                      className="absolute top-1 right-1 bg-black/80 p-1 rounded-full text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-gray-800 hover:border-red-600 h-28 rounded flex flex-col items-center justify-center cursor-pointer transition">
                    <Upload size={20} className="text-gray-500 mb-1" />
                    <span className="text-xs text-gray-400">Anexar Print 4</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleScreenshotUpload('duelo', e)} />
                  </label>
                )}
              </div>

            </div>

            {/* Botões de Ação para Análise */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={runCoachAnalysis}
                disabled={analyzing}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center space-x-2 transition shadow-lg shadow-red-900/30"
              >
                {analyzing ? (
                  <span>Analisando 4 prints com IA...</span>
                ) : (
                  <>
                    <Zap size={18} />
                    <span>Gerar Veredito Tático da Partida</span>
                  </>
                )}
              </button>

              <button
                onClick={loadExampleScreenshots}
                className="bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 font-medium px-4 py-3 rounded-lg text-xs transition"
              >
                Preencher com Prints de Exemplo
              </button>
            </div>

            {/* VEREDITO DA IA */}
            {verdict && (
              <div className="bg-gray-950 border-2 border-red-600/50 rounded-xl p-5 space-y-5 animate-fade-in">
                
                {/* Cabeçalho do Veredito */}
                <div className="flex justify-between items-start border-b border-gray-800 pb-4">
                  <div>
                    <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Resultado da Análise IA</span>
                    <h3 className="text-xl font-black text-white mt-0.5">{verdict.matchResult}</h3>
                    <p className="text-xs text-gray-400 mt-1">Função identificada: <span className="text-red-400 font-semibold">{verdict.playerRole}</span></p>
                  </div>
                  <div className="bg-red-600/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-center">
                    <div className="text-xs font-semibold">RANKING</div>
                    <div className="text-2xl font-black">{verdict.overallRating}</div>
                  </div>
                </div>

                {/* Grid de Estatísticas Extraídas */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-400">K/D/A Final</div>
                    <div className="text-sm font-bold text-white">{verdict.extractedStats.kda}</div>
                  </div>
                  <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-400">Pontuação Total</div>
                    <div className="text-sm font-bold text-yellow-400">{verdict.extractedStats.score}</div>
                  </div>
                  <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-400">Precisão de Tiro</div>
                    <div className="text-sm font-bold text-white">{verdict.extractedStats.accuracy}</div>
                  </div>
                  <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-400">Tiros na Cabeça</div>
                    <div className="text-sm font-bold text-white">{verdict.extractedStats.headshots}</div>
                  </div>
                  <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-400">Pts de Objeto</div>
                    <div className="text-sm font-bold text-green-400">{verdict.extractedStats.objScore}</div>
                  </div>
                  <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-400">Tempo na Zona</div>
                    <div className="text-sm font-bold text-gray-300">{verdict.extractedStats.objTime}</div>
                  </div>
                </div>

                {/* Análise de Loadout */}
                <div className="bg-gray-900/80 p-3.5 rounded-lg border border-gray-800 space-y-1">
                  <h4 className="text-xs font-bold text-gray-200 uppercase flex items-center space-x-1">
                    <Shield size={14} className="text-red-500" />
                    <span>Avaliação de Armamento ({verdict.loadoutAnalysis.weapon})</span>
                  </h4>
                  <p className="text-xs text-gray-300">{verdict.loadoutAnalysis.verdictText}</p>
                </div>

                {/* Análise de Duelos x Inimigos */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-200 uppercase">Matriz de Confronte Direto (Duelos)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {verdict.duelsAnalysis.map((duel, i) => (
                      <div key={i} className="flex justify-between items-center bg-gray-900 p-2 rounded border border-gray-800 text-xs">
                        <span className="text-gray-300 font-medium">{duel.enemy}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">{duel.score}</span>
                          <span className="bg-green-950 text-green-400 text-[10px] px-1.5 py-0.5 rounded border border-green-800">{duel.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recomendações e Dicas do Coach */}
                <div className="space-y-2 pt-2 border-t border-gray-800">
                  <h4 className="text-xs font-bold text-red-400 uppercase flex items-center space-x-1">
                    <Award size={14} />
                    <span>Recomendações Práticas do Coach</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {verdict.coachRecommendations.map((rec, idx) => (
                      <li key={idx} className="text-xs text-gray-300 flex items-start space-x-2">
                        <span className="text-red-500 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* MODAL PARA PUBLICAR NOVO VÍDEO/FOTO NO PERFIL */}
      {showNewPostModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-gray-800 w-full max-w-md rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <h3 className="font-bold text-white text-base">Nova Publicação no Feed</h3>
              <button onClick={() => setShowNewPostModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddPost} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Tipo de Mídia</label>
                <div className="flex space-x-3">
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input 
                      type="radio" 
                      name="postType" 
                      value="image" 
                      checked={newPostType === 'image'} 
                      onChange={() => setNewPostType('image')} 
                    />
                    <span>Imagem</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input 
                      type="radio" 
                      name="postType" 
                      value="video" 
                      checked={newPostType === 'video'} 
                      onChange={() => setNewPostType('video')} 
                    />
                    <span>Vídeo</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">URL da Mídia (Imagem ou Vídeo MP4)</label>
                <input 
                  type="text" 
                  required
                  placeholder="https://..."
                  value={newPostUrl}
                  onChange={(e) => setNewPostUrl(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-white text-xs focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Legenda</label>
                <textarea 
                  rows={2}
                  placeholder="Escreva uma legenda..."
                  value={newPostCaption}
                  onChange={(e) => setNewPostCaption(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-white text-xs focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowNewPostModal(false)}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-gray-300 py-2 rounded text-xs"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded text-xs"
                >
                  Publicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}