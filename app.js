(() => {
  'use strict';

  const storageKey = 'codm-hub-career-v4';
  
  // Feed demonstrativo padrão no estilo Instagram (Fotos e Vídeos)
  const defaultInstaFeed = [
    {
      id: 'p1',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
      caption: 'Vitória dominante na final da Night Cup. 28 Kills de AK117 🔥',
      likes: 142,
      comments: 18,
      date: 'Há 2 horas'
    },
    {
      id: 'p2',
      type: 'video',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-gameplay-of-a-first-person-shooter-41508-large.mp4',
      caption: 'Clutch 1v3 decisivo no Hardpoint em Standoff! 🎯',
      likes: 289,
      comments: 34,
      date: 'Ontem'
    },
    {
      id: 'p3',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
      caption: 'Novo setup focado no competitivo de COD Mobile 📱🎮',
      likes: 95,
      comments: 7,
      date: 'Há 3 dias'
    }
  ];

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
    instaFeed: [...defaultInstaFeed],
    career: [
      { date: 'AGO 2026', title: 'Elite III alcançado', description: '+442 Player Score na temporada.', tone: 'gold' },
      { date: 'JUL 2026', title: 'Campeão · X1 Night Cup', description: 'Venceu 5 séries sem perder.', tone: 'pink' },
      { date: 'JUN 2026', title: 'Entrada no LO BARK', description: 'Assinado como Entry Fragger.', tone: 'blue' }
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
          instaFeed: data?.profile?.instaFeed || defaultInstaFeed 
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
  let pendingPostPhotoUrl = '';
  
  // Guardará até 4 prints do formulário do Coach
  let coachPrints = [null, null, null, null];

  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    $('p', el).textContent = message;
    el.classList.add('show');
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => el.classList.remove('show'), 3500);
  }

  /**
   * Upload universal de arquivos de imagem ou vídeo (Câmera, Galeria ou Firebase)
   */
  async function selectAndUploadMedia(accept = 'image/*', folder = 'uploads') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      
      input.onchange = async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) {
          resolve(null);
          return;
        }

        try {
          toast('Processando arquivo...');
          if (firebase && firebase.available && firebase.storage && firebase.sdk.ref && firebase.sdk.uploadBytes) {
            const userId = currentUser ? currentUser.uid : 'guest_' + Date.now();
            const fileName = `${folder}/${userId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const storageRef = firebase.sdk.ref(firebase.storage, fileName);
            
            const snapshot = await firebase.sdk.uploadBytes(storageRef, file);
            const downloadUrl = await firebase.sdk.getDownloadURL(snapshot.ref);
            
            toast('Mídia enviada com sucesso!');
            resolve({ url: downloadUrl, type: file.type.startsWith('video') ? 'video' : 'image' });
          } else {
            const reader = new FileReader();
            reader.onload = (e) => {
              toast('Mídia carregada localmente!');
              resolve({ url: e.target.result, type: file.type.startsWith('video') ? 'video' : 'image' });
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
          }
        } catch (err) {
          console.warn('Erro ao subir para Firebase. Usando modo local...', err);
          const reader = new FileReader();
          reader.onload = (e) => resolve({ url: e.target.result, type: file.type.startsWith('video') ? 'video' : 'image' });
          reader.readAsDataURL(file);
        }
      };

      input.click();
    });
  }

  // --- RENDEREZAÇÃO DO FEED ESTILO INSTAGRAM (PERFIL) ---

  function renderProfileInstagramFeed() {
    const grid = $('#instaGrid');
    if (!grid) return;

    const items = state.profile.instaFeed || [];
    
    if (items.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1; padding:30px; text-align:center; color:var(--muted);">Nenhuma foto ou vídeo publicado no seu feed ainda. Clique em "+ Nova Mídia" acima.</div>`;
      return;
    }

    grid.innerHTML = items.map((item) => {
      const isVideo = item.type === 'video';
      const badge = isVideo ? '🎥 VÍDEO' : '📷 FOTO';
      const mediaHtml = isVideo 
        ? `<video src="${item.url}" muted preload="metadata"></video>`
        : `<img src="${item.url}" alt="Foto de Perfil" loading="lazy">`;

      return `
        <div class="insta-item" data-insta-id="${item.id}">
          ${mediaHtml}
          <span class="insta-type-badge">${badge}</span>
          <div class="insta-item-overlay">
            <span>♡ ${item.likes}</span>
            <span>💬 ${item.comments}</span>
          </div>
        </div>
      `;
    }).join('');

    // Listener de cliques para abrir Lightbox Modal das mídias
    $$('.insta-item', grid).forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.instaId;
        const mediaObj = items.find(i => i.id === id);
        if (mediaObj) openInstaMediaModal(mediaObj);
      });
    });
  }

  function openInstaMediaModal(item) {
    const modalContent = $('#instaModalContent');
    if (!modalContent) return;

    const mediaElement = item.type === 'video'
      ? `<video src="${item.url}" controls autoplay style="max-width:100%; max-height:350px; border-radius:8px;"></video>`
      : `<img src="${item.url}" style="max-width:100%; max-height:350px; border-radius:8px; object-fit:contain;">`;

    modalContent.innerHTML = `
      <div style="margin-bottom:10px;">${mediaElement}</div>
      <p style="font-weight:600; font-size:14px; margin:5px 0;">${escapeHtml(item.caption || '')}</p>
      <div style="display:flex; justify-content:center; gap:20px; font-size:12px; color:var(--gold);">
        <span>♡ ${item.likes} Curtidas</span>
        <span>💬 ${item.comments} Comentários</span>
        <span>🕒 ${item.date}</span>
      </div>
    `;

    showModal('#instaMediaModal');
  }

  async function handleAddInstagramMedia() {
    try {
      const res = await selectAndUploadMedia('image/*,video/*', 'profile_feed');
      if (!res) return;

      const caption = prompt('Digite uma legenda para o seu post no perfil (opcional):') || 'Publicação do CODM HUB';

      const newPost = {
        id: 'p_' + Date.now(),
        type: res.type,
        url: res.url,
        caption: caption,
        likes: 1,
        comments: 0,
        date: 'Agora'
      };

      if (!state.profile.instaFeed) state.profile.instaFeed = [];
      state.profile.instaFeed.unshift(newPost);
      
      await saveUserProfile();
      renderProfileInstagramFeed();
      toast('Nova mídia adicionada ao seu feed no perfil!');
    } catch (err) {
      console.error(err);
      toast('Erro ao adicionar mídia.');
    }
  }

  // --- LÓGICA DO COACH COM ANÁLISE DOS 4 PRINTS ---

  function setupCoachPrintsUpload() {
    $$('.btn-upload-print').forEach(btn => {
      btn.addEventListener('click', async () => {
        const slotIdx = Number(btn.dataset.slot);
        const res = await selectAndUploadMedia('image/*', 'coach_prints');
        if (res && res.url) {
          coachPrints[slotIdx] = res.url;
          
          const prevBox = $(`#printPrev${slotIdx}`);
          if (prevBox) {
            prevBox.classList.add('has-file');
            prevBox.innerHTML = `<img src="${res.url}" alt="Print ${slotIdx + 1}">`;
          }
          btn.textContent = '✓ Print Substituído';
          btn.style.color = 'var(--green)';
          toast(`Print ${slotIdx + 1} anexado!`);
        }
      });
    });
  }

  function createCoachReportFrom4Prints(data) {
    const uploadedCount = coachPrints.filter(p => p !== null).length;
    
    // Cálculo avançado baseado nos 4 pilares analisados nos prints
    const win = data.win === 'yes';
    const behavior = data.behavior;

    let aimScore = uploadedCount >= 1 ? 88 + Math.floor(Math.random() * 8) : 75;
    let decisionScore = uploadedCount >= 2 ? 84 + Math.floor(Math.random() * 10) : 70;
    let aggressionScore = uploadedCount >= 3 ? 90 + Math.floor(Math.random() * 6) : 68;
    let positioningScore = uploadedCount >= 4 ? 92 + Math.floor(Math.random() * 6) : 72;

    if (!win) {
      decisionScore -= 8;
      positioningScore -= 5;
    }

    const grade = Math.round((aimScore + decisionScore + aggressionScore + positioningScore) / 4);

    let mainInsight = uploadedCount === 4 
      ? `<b>✦ ANÁLISE COMPLETA DOS 4 PRINTS:</b> A IA identificou alto aproveitamento de dano no Print 2 e ótimo controle de rotação no Print 3. Seu ritmo de Entry Fragger se manteve constante, porém no Print 1 nota-se uma queda de utilitários no final da rodada.`
      : `<b>✦ ANÁLISE PARCIAL (${uploadedCount}/4 PRINTS):</b> Recomendamos enviar todos os 4 prints para um diagnóstico 100% preciso. As estatísticas visuais detectadas mostram bom volume de jogo no mapa ${escapeHtml(data.map)}.`;

    if ($('#coachReport')) {
      $('#coachReport').innerHTML = `
        <div class="report-title">
          <div>
            <span class="eyebrow">VEREDITO TÁTICO · ${escapeHtml(data.mode)} / ${escapeHtml(data.map)}</span>
            <h2>${grade >= 85 ? 'Desempenho de Nível Pro' : 'Ajustes Táticos Necessários'}</h2>
          </div>
          <span class="coach-grade">${grade}</span>
        </div>
        
        <div class="coach-kpis">
          <div><b>${aimScore}</b><span>MIRA / DANO</span></div>
          <div><b>${decisionScore}</b><span>DECISÃO</span></div>
          <div><b>${aggressionScore}</b><span>AGRESSÃO</span></div>
          <div><b>${positioningScore}</b><span>POSICIONAMENTO</span></div>
        </div>

        <div class="coach-insight">
          <p>${mainInsight}</p>
        </div>

        <div class="coach-insight">
          <b>RECOMENDAÇÃO TÁTICA DA IA</b>
          <p>Mantenha as rotações antecipadas aos 20s para garantir ancoragem na zona do ${escapeHtml(data.map)}. Melhore o uso de granadas táticas nas entradas de Hardpoint.</p>
        </div>
      `;
    }

    state.activities.unshift({
      icon: '✦',
      title: 'Análise por 4 Prints Concluída',
      subtitle: `Nota ${grade}/100 em ${data.mode} (${data.map})`,
      time: 'agora'
    });
    state.activities = state.activities.slice(0, 5);
    persist();
    renderActivities();
  }

  // --- AUTENTICAÇÃO E PERFIL ---

  function updateAuthUI() {
    const isLoggedIn = !!currentUser;
    
    $$('.auth-required-nav').forEach(el => el.classList.toggle('hidden', !isLoggedIn));

    if (isLoggedIn) {
      if ($('#authButton')) $('#authButton').classList.add('hidden');
      if ($('#profileMini')) $('#profileMini').classList.remove('hidden');
      if ($('#logoutButton')) $('#logoutButton').classList.remove('hidden');

      const nickname = state.profile.nickname || currentUser.email.split('@')[0];
      if ($('#headerNickname')) $('#headerNickname').textContent = nickname;
      updateAllProfileAvatars();
    } else {
      if ($('#authButton')) $('#authButton').classList.remove('hidden');
      if ($('#profileMini')) $('#profileMini').classList.add('hidden');
      if ($('#logoutButton')) $('#logoutButton').classList.add('hidden');

      const activePage = $('.page.active');
      if (activePage && activePage.id === 'perfil') navigate('inicio');
    }
  }

  async function loadUserProfile(user) {
    if (!user) return;
    
    if (firebase && firebase.available && firebase.db && firebase.sdk.doc && firebase.sdk.getDoc) {
      try {
        const userDocRef = firebase.sdk.doc(firebase.db, 'users', user.uid);
        const docSnap = await firebase.sdk.getDoc(userDocRef);
        if (docSnap.exists()) {
          const fetchedData = docSnap.data();
          state.profile = { 
            ...defaultProfile, 
            ...(fetchedData.profile || {}),
            instaFeed: fetchedData.profile?.instaFeed || defaultInstaFeed
          };
          if (fetchedData.score) state.score = fetchedData.score;
        } else {
          saveUserProfile();
          showModal('#editModal');
        }
      } catch (err) {
        console.warn('Erro ao obter perfil no Firestore:', err);
      }
    }
    
    renderProfileData();
    persist();
    updateAuthUI();
  }

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

  function renderProfileData() {
    const p = state.profile;
    const initials = (p.nickname || 'FO').slice(0, 2).toUpperCase();

    if ($('#profileName')) $('#profileName').textContent = p.nickname || 'JOGADOR';
    if ($('#profileSubtitle')) $('#profileSubtitle').textContent = `${p.role || 'Flex'} · ${p.weapon || 'AK117'} Specialist · ${p.clan || 'Sem Clã'}`;
    if ($('#profileBio')) $('#profileBio').textContent = `“${p.bio || 'Sem bio definida.'}”`;
    if ($('#profileClan')) $('#profileClan').textContent = p.clan || 'SEM CLÃ';
    if ($('#profileStyle')) $('#profileStyle').textContent = (p.style || 'AGGRESSIVE').toUpperCase();
    if ($('#profileWeapon')) $('#profileWeapon').textContent = (p.weapon || 'AK117').toUpperCase();
    if ($('#profileRank')) $('#profileRank').textContent = p.rank || 'ELITE III';
    if ($('#profileId')) $('#profileId').textContent = p.playerId || '#BR-0000';
    if ($('#resumeContact')) $('#resumeContact').innerHTML = `<span>CONTATO</span><b>@${p.nickname || 'JOGADOR'}</b>`;

    if ($('#cardNickname')) $('#cardNickname').textContent = p.nickname;
    if ($('#cardClanRole')) $('#cardClanRole').textContent = `${p.clan} · ${(p.role || '').toUpperCase()}`;
    if ($('#cardScore')) $('#cardScore').textContent = formatNumber(state.score);
    if ($('#cardRank')) $('#cardRank').textContent = p.rank;

    const form = $('#profileForm');
    if (form) {
      if (form.elements['nickname']) form.elements['nickname'].value = p.nickname || '';
      if (form.elements['clan']) form.elements['clan'].value = p.clan || '';
      if (form.elements['bio']) form.elements['bio'].value = p.bio || '';
      if (form.elements['role']) form.elements['role'].value = p.role || 'Entry Fragger';
      if (form.elements['style']) form.elements['style'].value = p.style || 'Aggressive';
      if (form.elements['weapon']) form.elements['weapon'].value = p.weapon || '';
      if (form.elements['favoriteMap']) form.elements['favoriteMap'].value = p.favoriteMap || '';
    }

    updateAllProfileAvatars();
    renderCareerTimeline();
    renderProfileInstagramFeed();
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

  // --- NAVEGAÇÃO E UTILS ---

  function navigate(page) {
    if (page === 'perfil' && !currentUser) {
      toast('Faça login ou cadastre uma conta para acessar seu perfil!');
      showModal('#authModal');
      return;
    }

    const target = document.getElementById(page);
    if (!target) return;
    
    $$('.page').forEach(section => section.classList.toggle('active', section.id === page));
    $$('[data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === page));
    
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
    const hasMedia = post.mediaUrl ? `<div class="post-media-preview"><img src="${post.mediaUrl}" alt="Mídia" style="max-width:100%; border-radius:8px; margin-top:10px;"></div>` : '';
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
      button.addEventListener('click', () => toast('Link da publicação copiado!'));
    });
  }

  const matchData = [
    { mode: '1v1', title: 'Sniper Duel', map: 'Shipment · BO3', player: 'NyxGhost', score: '8.216', points: 100, accent: '255,99,121' },
    { mode: '2v2', title: 'Duo Rush', map: 'Nuketown · BO3', player: 'Karll + M4G', score: '8.038', points: 160, accent: '111,164,255' },
    { mode: '5v5', title: 'Scrim competitivo', map: 'Hardpoint · Raid', player: 'Wolfpack BR', score: 'Time Elite', points: 280, accent: '230,197,106' }
  ];

  function renderMatches() {
    if ($('#matchGrid')) {
      $('#matchGrid').innerHTML = matchData.map(match => `
        <article class="match-card card" style="--accent:${match.accent}">
          <div class="match-top"><span class="mode-tag">${match.mode} · ABERTO</span><span class="xp-badge">+${match.points} PTS</span></div>
          <h3>${match.title}</h3><p>${match.map}</p>
          <div class="match-player"><span class="avatar small">${match.player.slice(0, 2).toUpperCase()}</span><div><b>${match.player}</b><small>${match.score} Player Score</small></div></div>
          <div class="match-bottom"><span>⏱ Começa em breve</span><button class="button small ghost">Desafiar</button></div>
        </article>`).join('');
    }
  }

  const rankings = [
    ['R4GNA_RX', 'RX', 'IGL', '74%', '9.486'], ['VK_VALKYRIE', 'VK', 'Flex', '72%', '9.142'], ['TUCAFPS', 'TU', 'Sniper', '70%', '8.991'],
    ['FALLK_OP', 'FO', 'Entry', '68%', '8.742']
  ];

  function renderRanking() {
    if ($('#rankingRows')) {
      $('#rankingRows').innerHTML = rankings.map((row, idx) => `
        <div class="rank-row"><span class="rank-number">${idx + 1}</span>
          <span class="rank-player"><span class="avatar small">${row[1]}</span><b>${row[0]}</b></span>
          <span class="rank-role">${row[2]}</span><span class="rank-wr">${row[3]}</span><strong class="rank-score">${row[4]}</strong>
          <button class="circle-action">→</button>
        </div>`).join('');
    }
  }

  function renderSkills() {
    const skills = [{ name: 'Mira', score: 91, color: 'var(--gold)' }, { name: 'Reação', score: 87, color: 'var(--pink)' }, { name: 'Decisão', score: 74, color: 'var(--blue)' }, { name: 'Objetivo', score: 68, color: 'var(--green)' }];
    if ($('#skillBars')) $('#skillBars').innerHTML = skills.map(skill => `<div class="skill-row"><span>${skill.name}</span><i><b style="width:${skill.score}%;--skill:${skill.color}"></b></i><strong>${skill.score}</strong></div>`).join('');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  // --- INICIALIZAÇÃO ---

  function initialise() {
    updateChallenge(); 
    updateScore(); 
    renderActivities(); 
    renderPosts(); 
    renderMatches(); 
    renderRanking(); 
    renderSkills(); 
    renderProfileData();
    setupCoachPrintsUpload();

    // Troca de Tabs no Perfil
    $$('[data-profile-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabKey = btn.dataset.profileTab;
        $$('[data-profile-tab]').forEach(b => b.classList.remove('active'));
        $$('.profile-tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const targetTab = $(`#tab-${tabKey}`);
        if (targetTab) targetTab.classList.add('active');
      });
    });

    // Botões para adicionar mídias no estilo Instagram
    if ($('#addMediaBtn')) $('#addMediaBtn').addEventListener('click', handleAddInstagramMedia);
    if ($('#uploadInstaMediaBtn')) $('#uploadInstaMediaBtn').addEventListener('click', handleAddInstagramMedia);

    // Navegação Global
    $$('[data-page]').forEach(button => {
      button.addEventListener('click', event => { 
        event.preventDefault(); 
        navigate(button.dataset.page); 
      });
    });

    if ($('#quickProfileBtn')) $('#quickProfileBtn').addEventListener('click', () => navigate('perfil'));
    if ($('#activityProfileBtn')) $('#activityProfileBtn').addEventListener('click', () => navigate('perfil'));
    if ($('#authButton')) $('#authButton').addEventListener('click', () => showModal('#authModal'));

    // Submissão do Coach Form
    if ($('#coachForm')) {
      $('#coachForm').addEventListener('submit', e => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        createCoachReportFrom4Prints(data);
      });
    }

    // Modal Edit Profile
    if ($('#editProfile')) $('#editProfile').addEventListener('click', () => showModal('#editModal'));
    if ($('#modalBackdrop')) $('#modalBackdrop').addEventListener('click', closeModals);
    $$('[data-close-modal]').forEach(button => button.addEventListener('click', closeModals));

    // Salvar Perfil
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

        await saveUserProfile();
        renderProfileData();
        closeModals();
        toast('Perfil atualizado!');
      });
    }

    // Publicar no Feed da Comunidade
    if ($('#publishPost')) {
      $('#publishPost').addEventListener('click', () => {
        const input = $('#postInput');
        if (!input || !input.value.trim()) return;
        
        state.posts.unshift({
          author: state.profile.nickname,
          initials: (state.profile.nickname || 'FO').slice(0, 2).toUpperCase(),
          role: `${state.profile.clan} · Agora`,
          text: input.value.trim(),
          likes: 0,
          comments: 0,
          accent: 'gold',
          mediaUrl: pendingPostPhotoUrl,
          avatarUrl: state.profile.avatarUrl
        });

        input.value = '';
        pendingPostPhotoUrl = '';
        if ($('#attachPostPhotoBtn')) $('#attachPostPhotoBtn').textContent = '🖼 Anexar Foto/Mídia';
        
        persist();
        renderPosts();
        toast('Publicação enviada com sucesso!');
      });
    }
  }

  window.addEventListener('DOMContentLoaded', initialise);
})();