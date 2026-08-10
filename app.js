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