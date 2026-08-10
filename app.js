(() => {
  'use strict';

  const storageKey = 'codm-hub-career-v3';
  const defaults = {
    score: 8742,
    challenge: 19,
    available: false,
    profile: {
      bio: 'Entre no meu lobby se quiser jogar para vencer.',
      role: 'Entry Fragger',
      avatarUrl: ''
    },
    posts: [
      { author: 'VK_VALKYRIE', initials: 'VK', role: 'Valkyrie Esports · 18 min', text: 'Treino aberto para line-ups 5v5 hoje, 21h BRT. Procuro IGL e suporte com disponibilidade fixa.', likes: 38, comments: 12, accent: 'blue', mediaUrl: '' },
      { author: 'TUCAFPS', initials: 'TU', role: 'Free Agent · 42 min', text: 'Finalmente alcancei Elite II. O foco no objetivo mudou completamente minhas partidas de Hardpoint. 🔥', likes: 71, comments: 9, accent: 'pink', mediaUrl: '' },
      { author: 'LO BARK', initials: 'LB', role: 'Clã · 1 h', text: 'FALLK_OP garantiu mais uma série no X1 Night Cup. Próxima parada: Top 100.', likes: 124, comments: 19, accent: 'gold', mediaUrl: '' }
    ],
    activities: [
      { icon: '♛', title: 'Vitória no X1 Night Cup', subtitle: 'FALLK_OP 2 × 0 ZN_Mirage · +100 pontos', time: 'hoje, 22:14' },
      { icon: '◎', title: 'Desafio atualizado', subtitle: 'AK117: 19 de 30 eliminações concluídas', time: 'ontem, 19:32' },
      { icon: '✦', title: 'Análise do Coach concluída', subtitle: 'Seu posicionamento evoluiu 7 pontos', time: 'ontem, 17:08' }
    ]
  };

  const load = () => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey)) }; }
    catch { return structuredClone(defaults); }
  };
  let state = load();
  const persist = () => localStorage.setItem(storageKey, JSON.stringify(state));
  const $ = (selector, node = document) => node.querySelector(selector);
  const $$ = (selector, node = document) => [...node.querySelectorAll(selector)];
  const formatNumber = value => new Intl.NumberFormat('pt-BR').format(value);
  let firebase = null;
  let currentUser = null;
  let currentProfile = null;
  let isAdmin = false;
  let authMode = 'login';
  const liveSubscriptions = [];
  let pendingPostPhotoUrl = '';

  // Escuta a inicialização do Firebase
  window.addEventListener('codmFirebaseReady', (e) => {
    firebase = e.detail;
    if (firebase && firebase.available) {
      if (firebase.sdk.onAuthStateChanged) {
        firebase.sdk.onAuthStateChanged(firebase.auth, (user) => {
          currentUser = user;
          if (user) {
            toast(`Conectado como ${user.email || 'Usuário'}`);
          }
        });
      }
    }
  });

  /**
   * Abre o seletor de arquivos do próprio aparelho do usuário (galeria ou câmera)
   * e faz o upload da imagem selecionada para o Firebase Storage.
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
          toast('Processando foto do seu aparelho...');
          if (firebase && firebase.available && firebase.storage && firebase.sdk.ref && firebase.sdk.uploadBytes) {
            const userId = currentUser ? currentUser.uid : 'user_' + Date.now();
            const fileName = `${folder}/${userId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const storageRef = firebase.sdk.ref(firebase.storage, fileName);
            
            const snapshot = await firebase.sdk.uploadBytes(storageRef, file);
            const downloadUrl = await firebase.sdk.getDownloadURL(snapshot.ref);
            
            toast('Foto enviada para o Firebase Storage com sucesso!');
            resolve(downloadUrl);
          } else {
            const reader = new FileReader();
            reader.onload = (e) => {
              toast('Foto do aparelho carregada com sucesso!');
              resolve(e.target.result);
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
          }
        } catch (err) {
          console.error('Erro no upload da foto:', err);
          toast('Falha ao conectar com Storage. Carregando em modo de compatibilidade...');
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        }
      };

      input.click();
    });
  }

  const defaultProfile = {
    nickname: 'FALLK_OP', clan: 'LO BARK', role: 'Entry Fragger', style: 'Aggressive', weapon: 'AK117',
    favoriteMap: 'Nuketown', bio: 'Entre no meu lobby se quiser jogar para vencer.', availability: false,
    rank: 'ELITE III', globalScore: 8742, avatarUrl: '',
    career: [
      { date: 'AGO 2026', title: 'Elite III alcançado', description: '+442 Player Score na temporada.', tone: 'gold' },
      { date: 'JUL 2026', title: 'Campeão · X1 Night Cup', description: 'Venceu 5 séries sem perder.', tone: 'pink' },
      { date: 'JUN 2026', title: 'Entrada no LO BARK', description: 'Assinado como Entry Fragger.', tone: 'blue' }
    ]
  };

  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    $('p', el).textContent = message;
    el.classList.add('show');
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => el.classList.remove('show'), 3300);
  }

  function updateChallenge() {
    const count = Math.min(30, state.challenge);
    const percent = Math.round((count / 30) * 100);
    if ($('#challengeProgress')) $('#challengeProgress').textContent = count;
    if ($('#challengePercent')) $('#challengePercent').textContent = `${percent}%`;
    if ($('#challengeCount')) $('#challengeCount').textContent = count;
    if ($('#challengeBar')) $('#challengeBar').style.width = `${percent}%`;
    if ($('#largeChallengeBar')) $('#largeChallengeBar').style.width = `${percent}%`;
    if ($('#largeChallengeText')) $('#largeChallengeText').textContent = `${count} de 30 eliminações`;
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
        <div><b>${item.title}</b><p>${item.subtitle}</p></div>
        <time>${item.time}</time>
      </div>`).join('');
  }

  function renderAvatar(avatarEl, initials, avatarUrl) {
    if (!avatarEl) return;
    if (avatarUrl) {
      avatarEl.style.backgroundImage = `url('${avatarUrl}')`;
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.style.backgroundPosition = 'center';
      avatarEl.classList.add('has-image');
    } else {
      avatarEl.style.backgroundImage = '';
      avatarEl.classList.remove('has-image');
    }
  }

  function updateAllProfileAvatars() {
    const url = state.profile.avatarUrl;
    $$('.profile-mini .avatar, .profile-main .avatar, #userAvatar, #profileAvatar').forEach(el => {
      renderAvatar(el, 'FO', url);
    });
  }

  function postMarkup(post, spotlight = false) {
    const hasMedia = post.mediaUrl ? `<div class="post-media-preview"><img src="${post.mediaUrl}" alt="Mídia enviada pelo usuário" style="max-width:100%; border-radius:8px; margin-top:10px;"></div>` : '';
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
        <div class="post-footer"><button data-like>♡ <span>${post.likes}</span> curtidas</button><button>◌ ${post.comments} comentários</button><button>↗ Compartilhar</button></div>
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
      $('#rankingRows').innerHTML = list.map((row, index) => `
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

  function navigate(page) {
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

  function createCoachReport(data) {
    const kills = Number(data.kills);
    const deaths = Math.max(1, Number(data.deaths));
    const kd = kills / deaths;
    const win = data.win === 'yes';
    const behavior = data.behavior;
    const aim = Math.min(98, Math.round(66 + kd * 11 + (win ? 4 : 0)));
    const decision = Math.min(96, Math.max(42, 72 + (win ? 9 : -6) + (behavior === 'solo' ? -10 : 0) + (behavior === 'objective' ? 7 : 0)));
    const aggression = Math.min(96, Math.round(57 + kills * 1.1 + (behavior === 'solo' ? 7 : 0)));
    const positioning = Math.min(94, Math.max(40, 67 + (behavior === 'balanced' ? 11 : 0) + (behavior === 'solo' ? -14 : 0) + (behavior === 'passive' ? -5 : 0)));
    let insight = 'Você jogou de forma equilibrada. Preserve as trocas com seu squad e use essa consistência para acelerar o ritmo no meio da partida.';
    let title = 'Base sólida para evoluir';
    if (behavior === 'solo') { title = 'Evite as entradas isoladas'; insight = 'Seu dano aparece, mas você está entrando sozinho em situações de desvantagem. Espere o trade do time antes do próximo push e transforme agressividade em eliminações seguras.'; }
    if (behavior === 'objective') { title = 'Ótima leitura de objetivo'; insight = 'Você gerou valor ao priorizar o objetivo. Agora comunique o timing de rotação para que o time chegue junto e proteja seus pontos.'; }
    if (behavior === 'passive') { title = 'Você pode pressionar mais'; insight = 'Seu posicionamento se manteve seguro, mas o impacto caiu. Escolha um timing por rotação para disputar espaço ao lado de um companheiro.'; }
    const grade = Math.round((aim + decision + aggression + positioning) / 4);
    if ($('#coachReport')) {
      $('#coachReport').innerHTML = `
        <div class="report-title"><div><span class="eyebrow">RELATÓRIO · ${escapeHtml(data.mode)} / ${escapeHtml(data.map)}</span><h2>${title}</h2></div><span class="coach-grade">${grade}</span></div>
        <div class="coach-kpis"><div><b>${aim}</b><span>MIRA</span></div><div><b>${decision}</b><span>DECISÃO</span></div><div><b>${aggression}</b><span>AGRESSIVIDADE</span></div><div><b>${positioning}</b><span>POSICIONAMENTO</span></div></div>
        <div class="coach-insight"><b>✦ PRINCIPAL INSIGHT</b><p>${insight}</p></div>
        <div class="coach-insight"><b>PRÓXIMO TREINO</b><p>Antes da próxima partida, jogue duas rotações com foco em callouts curtos: posição, número de inimigos e direção do push.</p></div>`;
    }
    state.activities.unshift({ icon: '✦', title: 'Análise do Coach concluída', subtitle: `Relatório ${grade}/100 em ${data.mode}`, time: 'agora' });
    state.activities = state.activities.slice(0, 5);
    persist(); renderActivities();
  }

  function initialise() {
    updateChallenge(); updateScore(); renderActivities(); renderPosts(); renderMatches(); renderRanking(); renderSkills(); updateAllProfileAvatars();
    const initialPage = location.hash.slice(1);
    if (initialPage && document.getElementById(initialPage)) navigate(initialPage);

    $$('[data-page]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); navigate(button.dataset.page); }));
    if ($('#menuButton')) {
      $('#menuButton').addEventListener('click', () => {
        const open = document.body.classList.toggle('menu-open');
        $('#menuButton').setAttribute('aria-expanded', String(open));
      });
    }
    if ($('#themeToggle')) {
      $('#themeToggle').addEventListener('click', () => {
        document.body.classList.toggle('light');
        $('#themeToggle').textContent = document.body.classList.contains('light') ? '◐' : '☼';
        localStorage.setItem('codm-hub-theme', document.body.classList.contains('light') ? 'light' : 'dark');
      });
    }
    if (localStorage.getItem('codm-hub-theme') === 'light') { document.body.classList.add('light'); if ($('#themeToggle')) $('#themeToggle').textContent = '◐'; }

    $$('[data-open-duel]').forEach(button => button.addEventListener('click', openDuel));
    $$('[data-score-info]').forEach(button => button.addEventListener('click', () => showModal('#scoreModal')));
    if ($('#editProfile')) $('#editProfile').addEventListener('click', () => showModal('#editModal'));
    if ($('#modalBackdrop')) $('#modalBackdrop').addEventListener('click', closeModals);
    $$('[data-close-modal]').forEach(button => button.addEventListener('click', closeModals));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModals(); });

    // Permite trocar a foto de perfil diretamente ao clicar no Avatar principal
    const mainAvatar = $('.profile-main .avatar');
    if (mainAvatar) {
      mainAvatar.title = "Clique para selecionar uma foto do seu aparelho";
      mainAvatar.style.cursor = "pointer";
      mainAvatar.addEventListener('click', async () => {
        try {
          const photoUrl = await selectAndUploadPhoto('avatars');
          if (photoUrl) {
            state.profile.avatarUrl = photoUrl;
            persist();
            updateAllProfileAvatars();
            toast('Foto do perfil atualizada no Firebase Storage!');
          }
        } catch (err) {
          console.error(err);
        }
      });
    }

    // Botão de upload de foto do aparelho no modal de edição do perfil
    const modalForm = $('#profileForm');
    if (modalForm && !$('#changeAvatarBtn')) {
      const avatarBtnGroup = document.createElement('div');
      avatarBtnGroup.style.margin = '10px 0';
      avatarBtnGroup.innerHTML = `
        <button type="button" id="changeAvatarBtn" class="photo-upload-btn button ghost full">
          📷 Escolher Foto do Aparelho (Firebase)
        </button>
      `;
      modalForm.prepend(avatarBtnGroup);

      $('#changeAvatarBtn').addEventListener('click', async () => {
        try {
          const photoUrl = await selectAndUploadPhoto('avatars');
          if (photoUrl) {
            state.profile.avatarUrl = photoUrl;
            persist();
            updateAllProfileAvatars();
            toast('Foto do aparelho carregada com sucesso!');
          }
        } catch (e) {
          console.error(e);
        }
      });
    }

    // Botão para anexar foto do dispositivo nas publicações do Feed
    const postActions = $('.post-actions');
    if (postActions && !$('#attachPostPhotoBtn')) {
      const attachBtn = document.createElement('button');
      attachBtn.type = 'button';
      attachBtn.id = 'attachPostPhotoBtn';
      attachBtn.className = 'text-button';
      attachBtn.style.color = 'var(--gold)';
      attachBtn.style.cursor = 'pointer';
      attachBtn.innerHTML = '📷 Foto do Aparelho';
      postActions.prepend(attachBtn);

      attachBtn.addEventListener('click', async () => {
        try {
          const photoUrl = await selectAndUploadPhoto('feed');
          if (photoUrl) {
            pendingPostPhotoUrl = photoUrl;
            attachBtn.innerHTML = '✓ Foto Anexada';
            attachBtn.style.color = 'var(--green)';
            toast('Foto anexada à sua publicação!');
          }
        } catch (e) {
          console.error(e);
        }
      });
    }

    $$('.filter[data-arena-filter]').forEach(button => button.addEventListener('click', () => {
      $$('.filter[data-arena-filter]').forEach(item => item.classList.toggle('active', item === button));
      renderMatches(button.dataset.arenaFilter);
    }));
    $$('.filter[data-ranking-filter]').forEach(button => button.addEventListener('click', () => {
      $$('.filter[data-ranking-filter]').forEach(item => item.classList.toggle('active', item === button));
      toast(`Ranking ${button.textContent} selecionado.`);
    }));
    if ($('#rankSearch')) $('#rankSearch').addEventListener('input', event => renderRanking(event.target.value));

    $$('.profile-tab').forEach(tab => tab.addEventListener('click', () => {
      $$('.profile-tab').forEach(item => item.classList.toggle('active', item === tab));
      $$('.profile-tab-content').forEach(content => content.classList.toggle('active', content.id === tab.dataset.profileTab));
    }));
    $$('.point').forEach(point => point.addEventListener('click', () => $$('.point').forEach(item => item.classList.toggle('active', item === point))));

    if ($('#duelForm')) {
      $('#duelForm').addEventListener('submit', event => {
        event.preventDefault();
        const rival = new FormData(event.currentTarget).get('opponent');
        const points = $('.point.active')?.dataset.points || '100';
        closeModals(); toast(`Desafio de ${points} pontos enviado para ${rival}!`);
      });
    }

    if ($('#profileForm')) {
      $('#profileForm').addEventListener('submit', event => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        state.profile = { ...state.profile, ...data }; persist(); closeModals();
        if ($('.profile-main p')) $('.profile-main p').textContent = `“${data.bio || state.profile.bio}”`;
        toast('Seu perfil competitivo foi atualizado.');
      });
    }

    if ($('#shareProfile')) {
      $('#shareProfile').addEventListener('click', async () => {
        const url = `${location.href.split('#')[0]}#perfil`;
        try { await navigator.clipboard.writeText(url); toast('Link do seu perfil copiado!'); }
        catch { toast('Perfil pronto para compartilhar: FALLK_OP · 8.742 Player Score'); }
      });
    }

    if ($('#addChallengeProgress')) {
      $('#addChallengeProgress').addEventListener('click', () => {
        if (state.challenge >= 30) return toast('Desafio concluído! A medalha será liberada em breve.');
        state.challenge += 1;
        if (state.challenge === 30) { state.score += 500; toast('Desafio concluído! +500 XP e medalha desbloqueada.'); }
        else toast(`Eliminação registrada: ${state.challenge}/30.`);
        persist(); updateChallenge(); updateScore();
      });
    }

    if ($('#coachForm')) {
      $('#coachForm').addEventListener('submit', event => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        createCoachReport(data); toast('Sua análise tática está pronta.');
      });
    }

    if ($('#postInput')) $('#postInput').addEventListener('input', event => { if ($('#charCount')) $('#charCount').textContent = `${event.target.value.length}/300`; });
    
    if ($('#publishPost')) {
      $('#publishPost').addEventListener('click', () => {
        const input = $('#postInput'); const text = input ? input.value.trim() : '';
        if (!text && !pendingPostPhotoUrl) return toast('Escreva algo ou anexe uma foto para publicar no feed.');
        
        state.posts.unshift({
          author: 'FALLK_OP',
          initials: 'FO',
          role: 'Você · agora',
          text,
          likes: 0,
          comments: 0,
          accent: 'gold',
          avatarUrl: state.profile.avatarUrl,
          mediaUrl: pendingPostPhotoUrl
        });
        
        state.posts = state.posts.slice(0, 8);
        persist();
        if (input) input.value = '';
        if ($('#charCount')) $('#charCount').textContent = '0/300';
        
        pendingPostPhotoUrl = '';
        const attachBtn = $('#attachPostPhotoBtn');
        if (attachBtn) {
          attachBtn.innerHTML = '📷 Foto do Aparelho';
          attachBtn.style.color = 'var(--gold)';
        }

        renderPosts();
        toast('Publicado na comunidade com sucesso!');
      });
    }

    if ($('#toggleAvailable')) {
      $('#toggleAvailable').addEventListener('click', event => {
        state.available = !state.available; persist();
        event.currentTarget.textContent = state.available ? '✓ Disponível para times' : 'Marcar como disponível';
        event.currentTarget.classList.toggle('primary', state.available); event.currentTarget.classList.toggle('ghost', !state.available);
        toast(state.available ? 'Seu perfil agora aparece no mercado de talentos.' : 'Você saiu do mercado de talentos.');
      });
    }
    
    if (state.available && $('#toggleAvailable')) {
      const button = $('#toggleAvailable');
      button.textContent = '✓ Disponível para times';
      button.classList.remove('ghost');
      button.classList.add('primary');
    }
  }

  initialise();
})();