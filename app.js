(() => {
  'use strict';

  const storageKey = 'codm-hub-career-v5';
  let activeStorageKey = `${storageKey}:guest`;

  const storageKeyForUser = user => `${storageKey}:${user?.uid || 'guest'}`;
  
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
    instaFeed: [],
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
      const data = JSON.parse(localStorage.getItem(activeStorageKey));
      return {
        ...defaults,
        ...data,
        profile: {
          ...defaults.profile,
          ...(data?.profile || {}),
          instaFeed: Array.isArray(data?.profile?.instaFeed)
            ? data.profile.instaFeed
            : Array.isArray(data?.profile?.feedMedia)
              ? data.profile.feedMedia
              : defaults.profile.instaFeed
        }
      }; 
    } catch { 
      return structuredClone(defaults); 
    }
  };

  let state = load();
  const resetStateForUser = (user) => {
    activeStorageKey = storageKeyForUser(user);
    state = load();
  };

  const persist = () => {
    try {
      localStorage.setItem(activeStorageKey, JSON.stringify(state));
    } catch (error) {
      console.warn('Não foi possível salvar o cache local do perfil:', error);
    }
  };

  const $ = (selector, node = document) => node.querySelector(selector);
  const $$ = (selector, node = document) => [...node.querySelectorAll(selector)];
  const formatNumber = value => new Intl.NumberFormat('pt-BR').format(value);

  let firebase = null;
  let currentUser = null;
  let authMode = 'login'; // 'login' ou 'register'
  let pendingPostPhotoUrl = '';
  // Mídias do feed do perfil, no formato Instagram.
  let coachPrints = [null, null, null, null];


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
   * e faz o upload da foto para o Cloudinary.
   */
  async function uploadToCloudinary(file, folder = 'uploads') {
    const cloudName = firebase?.config?.cloudinaryCloudName;
    const uploadPreset = firebase?.config?.cloudinaryUploadPreset;

    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary não configurado. Preencha CLOUDINARY_CLOUD_NAME e CLOUDINARY_UPLOAD_PRESET em firebase-config.js.');
    }

    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/auto/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', `codm-hub/${folder}`);

    const response = await fetch(endpoint, { method: 'POST', body: formData });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.secure_url) {
      console.error('Cloudinary upload error:', payload);
      throw new Error(payload?.error?.message || 'Não foi possível enviar a mídia para o armazenamento.');
    }

    return payload.secure_url;
  }

  async function compressImageForUpload(file, maxDimension = 1800, quality = 0.82) {
    if (!file?.type?.startsWith('image/')) return file;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => {
        const image = new Image();
        image.onload = () => {
          const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const ctx = canvas.getContext('2d');
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(blob => {
            if (!blob) return reject(new Error('Não foi possível preparar a imagem.'));
            resolve(new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' }));
          }, 'image/jpeg', quality);
        };
        image.onerror = reject;
        image.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function selectAndUploadPhoto(folder = 'uploads') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async event => {
        const file = event.target.files?.[0];
        if (!file) return resolve(null);

        try {
          if (!currentUser) throw new Error('Entre na sua conta antes de enviar uma foto.');
          toast('Enviando foto...');
          const prepared = await compressImageForUpload(file, 1600, 0.82);
          const url = await uploadToCloudinary(prepared, folder);
          toast('Foto salva no seu perfil!');
          resolve(url);
        } catch (error) {
          console.error('Erro ao enviar foto:', error);
          toast(error.message || 'Não foi possível salvar a foto.');
          reject(error);
        }
      };
      input.click();
    });
  }

  /**
   * Seletor universal para fotos/vídeos usando Cloudinary como armazenamento permanente.
   */
  async function selectAndUploadMedia(accept = 'image/*,video/*', folder = 'uploads') {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = async event => {
        const file = event.target.files?.[0];
        if (!file) return resolve(null);
        const type = file.type.startsWith('video/') ? 'video' : 'image';

        try {
          if (!currentUser) throw new Error('Entre na sua conta antes de publicar uma mídia.');
          toast('Enviando mídia...');
          const prepared = type === 'image' ? await compressImageForUpload(file) : file;
          const url = await uploadToCloudinary(prepared, folder);
          toast('Mídia salva no seu perfil!');
          resolve({ url, type, file: prepared });
        } catch (error) {
          console.error('Erro ao enviar mídia:', error);
          toast(error.message || 'Não foi possível salvar essa mídia.');
          reject(error);
        }
      };
      input.click();
    });
  }

  /**
   * Redimensiona um print antes de enviá-lo ao Coach.
   * Isso evita payloads gigantes e preserva a leitura dos números da tela.
   */
  async function fileToAnalysisDataUrl(file, maxDimension = 1280, quality = 0.72) {
    if (!file || !file.type.startsWith('image/')) return null;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => {
        const image = new Image();
        image.onload = () => {
          const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

          const ctx = canvas.getContext('2d');
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        image.onerror = reject;
        image.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function selectCoachPrint(slotIdx) {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp';
      input.onchange = async event => {
        const file = event.target.files && event.target.files[0];
        if (!file) return resolve(null);

        try {
          toast(`Processando Print ${slotIdx + 1}...`);
          const dataUrl = await fileToAnalysisDataUrl(file);

          // Prints do Coach não precisam ser armazenados permanentemente.
          // Eles ficam em memória apenas durante a análise e nunca entram no Firestore.
          resolve({ url: dataUrl, dataUrl, type: 'image', file });
        } catch (error) {
          reject(error);
        }
      };
      input.click();
    });
  }

  function renderProfileInstagramFeed() {
    const grid = $('#instaGrid');
    if (!grid) return;

    const items = Array.isArray(state.profile.instaFeed) ? state.profile.instaFeed : [];
    if (!items.length) {
      grid.innerHTML = `
        <div class="insta-empty">
          <strong>Seu feed está vazio.</strong>
          <span>Publique fotos ou vídeos de partidas, setups e melhores jogadas.</span>
          <button type="button" class="button primary small" data-empty-insta-upload>+ Nova mídia</button>
        </div>`;
      const emptyButton = $('[data-empty-insta-upload]', grid);
      if (emptyButton) emptyButton.addEventListener('click', handleAddInstagramMedia);
      return;
    }

    grid.innerHTML = items.map(item => {
      const safeUrl = escapeHtml(item.url || '');
      const caption = escapeHtml(item.caption || '');
      const media = item.type === 'video'
        ? `<video src="${safeUrl}" muted playsinline preload="metadata"></video>`
        : `<img src="${safeUrl}" alt="${caption || 'Publicação do perfil'}" loading="lazy">`;

      return `
        <article class="insta-item" data-insta-id="${escapeHtml(item.id)}" tabindex="0" role="button" aria-label="Abrir publicação">
          ${media}
          <span class="insta-type-badge">${item.type === 'video' ? '🎥 VÍDEO' : '📷 FOTO'}</span>
          <div class="insta-item-overlay">
            <span>♡ ${Number(item.likes || 0)}</span>
            <span>💬 ${Number(item.comments || 0)}</span>
          </div>
        </article>`;
    }).join('');

    $$('.insta-item', grid).forEach(itemEl => {
      const open = () => {
        const item = items.find(post => String(post.id) === String(itemEl.dataset.instaId));
        if (item) openInstaMediaModal(item);
      };
      itemEl.addEventListener('click', open);
      itemEl.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      });
    });
  }

  function openInstaMediaModal(item) {
    const content = $('#instaModalContent');
    if (!content) return;

    const safeUrl = escapeHtml(item.url || '');
    const safeCaption = escapeHtml(item.caption || '');
    const media = item.type === 'video'
      ? `<video src="${safeUrl}" controls autoplay playsinline style="width:min(100%,720px);max-height:70vh;border-radius:10px;background:#000;"></video>`
      : `<img src="${safeUrl}" alt="${safeCaption || 'Publicação'}" style="width:min(100%,720px);max-height:70vh;border-radius:10px;object-fit:contain;background:#000;">`;

    content.innerHTML = `
      ${media}
      <div class="insta-modal-meta">
        <strong>${safeCaption || 'Publicação do CODM HUB'}</strong>
        <span>♡ ${Number(item.likes || 0)} curtidas · 💬 ${Number(item.comments || 0)} comentários · ${escapeHtml(item.date || 'Agora')}</span>
      </div>`;
    showModal('#instaMediaModal');
  }

  async function handleAddInstagramMedia() {
    try {
      const media = await selectAndUploadMedia('image/*,video/*', 'profile_feed');
      if (!media) return;

      const caption = window.prompt('Digite uma legenda para a publicação (opcional):') || '';
      const newPost = {
        id: `profile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: media.type,
        url: media.url,
        caption,
        likes: 0,
        comments: 0,
        date: 'Agora'
      };

      if (!Array.isArray(state.profile.instaFeed)) state.profile.instaFeed = [];
      state.profile.instaFeed.unshift(newPost);
      state.profile.instaFeed = state.profile.instaFeed.slice(0, 30);

      await saveUserProfile();
      renderProfileInstagramFeed();
      toast('Publicação adicionada ao seu perfil!');
    } catch (error) {
      console.error('Erro ao adicionar mídia ao perfil:', error);
      toast('Não foi possível adicionar essa mídia.');
    }
  }

  function setupCoachPrintsUpload() {
    $$('.btn-upload-print').forEach(button => {
      button.addEventListener('click', async () => {
        const slotIdx = Number(button.dataset.slot);
        try {
          const result = await selectCoachPrint(slotIdx);
          if (!result) return;

          coachPrints[slotIdx] = result;

          const preview = $(`#printPrev${slotIdx}`);
          if (preview) {
            preview.classList.add('has-file');
            preview.innerHTML = `
              <img src="${escapeHtml(result.dataUrl)}" alt="Print ${slotIdx + 1} carregado">
              <span class="print-number">${slotIdx + 1}</span>`;
          }

          button.textContent = '✓ Print anexado';
          button.style.color = 'var(--green)';
          toast(`Print ${slotIdx + 1} anexado.`);
        } catch (error) {
          console.error(`Erro no Print ${slotIdx + 1}:`, error);
          toast(`Não foi possível carregar o Print ${slotIdx + 1}.`);
        }
      });
    });
  }

  function resetCoachPrints() {
    coachPrints = [null, null, null, null];
    for (let i = 0; i < 4; i += 1) {
      const preview = $(`#printPrev${i}`);
      const button = $(`.btn-upload-print[data-slot="${i}"]`);
      if (preview) {
        preview.classList.remove('has-file');
        preview.innerHTML = `<span>${i + 1}</span><small>${['Placar Geral & Resultado','K/D/A, dano e pontuação','Objetivos, tempo e capturas','Armas, perks e utilitários'][i]}</small>`;
      }
      if (button) {
        button.textContent = `Anexar Print ${i + 1}`;
        button.style.color = '';
      }
    }
  }

  async function requestCoachAI(data) {
    // O Coach roda pela API Serverless da Vercel para não exigir o plano Blaze do Firebase.
    // A GEMINI_API_KEY fica somente nas variáveis de ambiente da Vercel e nunca é enviada ao navegador.
    const screenshots = coachPrints.map(print => print.dataUrl);

    const apiUrl = firebase?.config?.coachApiUrl || '/api/analyze-coach';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: data.mode,
        map: data.map,
        screenshots
      })
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const error = new Error(payload?.error || 'Não foi possível conectar ao Coach IA.');
      error.status = response.status;
      throw error;
    }

    return payload;
  }

  function renderCoachReport(report, data) {
    const grade = Math.max(0, Math.min(100, Number(report.grade || 0)));
    const metrics = report.metrics || {};
    const insight = escapeHtml(report.verdict || 'A análise foi concluída sem um veredito textual.');
    const recommendation = escapeHtml(report.recommendation || 'Repita a análise com quatro prints legíveis se algum dado estiver incompleto.');

    if ($('#coachReport')) {
      $('#coachReport').innerHTML = `
        <div class="report-title">
          <div>
            <span class="eyebrow">VEREDITO DA IA · ${escapeHtml(data.mode)} / ${escapeHtml(data.map)}</span>
            <h2>${escapeHtml(report.title || 'Análise competitiva')}</h2>
          </div>
          <span class="coach-grade">${grade}</span>
        </div>
        <div class="coach-source-badge">✓ Baseado exclusivamente nos 4 prints enviados</div>
        <div class="coach-kpis">
          <div><b>${Number(metrics.aim || 0)}</b><span>MIRA / DANO</span></div>
          <div><b>${Number(metrics.decision || 0)}</b><span>DECISÃO</span></div>
          <div><b>${Number(metrics.aggression || 0)}</b><span>AGRESSÃO</span></div>
          <div><b>${Number(metrics.positioning || 0)}</b><span>POSICIONAMENTO</span></div>
        </div>
        <div class="coach-insight"><b>✦ VEREDITO</b><p>${insight}</p></div>
        <div class="coach-insight"><b>PRÓXIMO TREINO</b><p>${recommendation}</p></div>
        ${report.evidence ? `<div class="coach-evidence"><b>DADOS IDENTIFICADOS NOS PRINTS</b><p>${escapeHtml(report.evidence)}</p></div>` : ''}
        ${Array.isArray(report.warnings) && report.warnings.length ? `<div class="coach-warnings"><b>ATENÇÃO</b><ul>${report.warnings.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>` : ''}
      `;
    }

    state.activities.unshift({
      icon: '✦',
      title: 'Análise do Coach concluída',
      subtitle: `Veredito ${grade}/100 em ${data.mode}`,
      time: 'agora'
    });
    state.activities = state.activities.slice(0, 5);
    persist();
    renderActivities();
  }

  async function runCoachAnalysis(data) {
    const missing = coachPrints.findIndex(item => !item);
    if (missing !== -1) {
      toast(`Envie os 4 prints. Falta o Print ${missing + 1}.`);
      const preview = $(`#printPrev${missing}`);
      if (preview) preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const submitButton = $('#coachForm button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = '✦ IA analisando os 4 prints...';
    }

    if ($('#coachReport')) {
      $('#coachReport').innerHTML = `
        <div class="report-empty coach-loading">
          <span>✦</span>
          <h2>Analisando os 4 prints...</h2>
          <p>A IA está cruzando somente as informações visíveis nas imagens. Não use dados digitados como métricas da partida.</p>
        </div>`;
    }

    try {
      const report = await requestCoachAI(data);
      renderCoachReport(report, data);
      toast('Veredito da IA gerado com os 4 prints.');
    } catch (error) {
      console.error('Falha na análise do Coach:', error);
      if (error.status === 413) {
        if ($('#coachReport')) {
          $('#coachReport').innerHTML = `
            <div class="report-empty">
              <span>⚠</span>
              <h2>Prints muito pesados</h2>
              <p>Os 4 prints foram reduzidos automaticamente, mas ainda ficaram grandes demais para a requisição. Tente usar capturas de tela em resolução menor.</p>
            </div>`;
        }
        toast('Reduza o tamanho dos 4 prints e tente novamente.');
      } else {
        if ($('#coachReport')) {
          $('#coachReport').innerHTML = `
            <div class="report-empty">
              <span>⚠</span>
              <h2>Não foi possível concluir a análise</h2>
              <p>Confira se os 4 prints estão legíveis e tente novamente.</p>
            </div>`;
        }
        toast('A análise da IA falhou. Tente novamente.');
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = '✦ Gerar Veredito da IA baseada nos Prints';
      }
    }
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

    resetStateForUser(user);

    if (firebase && firebase.available && firebase.db && firebase.sdk.doc && firebase.sdk.getDoc) {
      try {
        const userDocRef = firebase.sdk.doc(firebase.db, 'users', user.uid);
        const docSnap = await firebase.sdk.getDoc(userDocRef);
        if (docSnap.exists()) {
          const fetchedData = docSnap.data();
          state.profile = {
            ...defaultProfile,
            ...(fetchedData.profile || {}),
            instaFeed: Array.isArray(fetchedData.profile?.instaFeed) ? fetchedData.profile.instaFeed : []
          };
          if (Number.isFinite(Number(fetchedData.score))) state.score = Number(fetchedData.score);
        } else {
          await saveUserProfile();
          showModal('#editModal');
          if ($('#editModalTitle')) $('#editModalTitle').textContent = 'Crie seu perfil competitivo';
          toast('Bem-vindo! Complete seu perfil para começar.');
        }
      } catch (err) {
        console.error('Erro ao obter perfil no Firestore:', err);
        toast('Não foi possível carregar seu perfil salvo.');
      }
    }

    renderProfileData();
    renderProfileInstagramFeed();
    persist();
    updateAuthUI();
  }

  async function saveUserProfile() {
    if (!currentUser) {
      persist();
      return false;
    }

    if (!(firebase && firebase.available && firebase.db && firebase.sdk.doc && firebase.sdk.setDoc)) {
      persist();
      return false;
    }

    try {
      const userDocRef = firebase.sdk.doc(firebase.db, 'users', currentUser.uid);
      await firebase.sdk.setDoc(userDocRef, {
        profile: state.profile,
        score: state.score,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      persist();
      return true;
    } catch (err) {
      console.error('Erro ao salvar perfil no Firestore:', err);
      toast('Não foi possível salvar seu perfil. Verifique sua conexão e as regras do Firestore.');
      return false;
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
    renderProfileInstagramFeed();
    setupCoachPrintsUpload();

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
        firebase.sdk.onAuthStateChanged(firebase.auth, async (user) => {
          currentUser = user;
          if (user) {
            await loadUserProfile(user);
          } else {
            activeStorageKey = storageKeyForUser(null);
            state = structuredClone(defaults);
            renderProfileData();
            renderProfileInstagramFeed();
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
          toast('Firebase não está disponível. Faça o deploy/configure o Firebase antes de entrar.');
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
          toast('Firebase não está disponível. Configure o Firebase antes de usar o login com Google.');
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

    // Feed do perfil estilo Instagram.
    if ($('#addMediaBtn')) $('#addMediaBtn').addEventListener('click', handleAddInstagramMedia);
    if ($('#uploadInstaMediaBtn')) $('#uploadInstaMediaBtn').addEventListener('click', handleAddInstagramMedia);

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

    // Form do Coach: a análise só é liberada com os 4 prints.
    if ($('#coachForm')) {
      $('#coachForm').addEventListener('submit', async event => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        await runCoachAnalysis(data);
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
