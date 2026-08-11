(() => {
  'use strict';

  const $ = (selector, node = document) => node.querySelector(selector);
  const $$ = (selector, node = document) => [...node.querySelectorAll(selector)];
  const formatNumber = value => new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const now = () => new Date().toISOString();
  const dateLabel = value => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Data a definir';
  const initials = name => String(name || 'J').trim().slice(0, 2).toUpperCase();

  const emptyProfile = () => ({
    nickname: '', clan: '', role: 'Flex', style: 'Tactical', weapon: '', favoriteMap: '', bio: '',
    availability: false, rank: 'Não classificado', score: 0, avatarUrl: '', playerId: '',
    instaFeed: [], career: [], skills: { aim: 0, decision: 0, aggression: 0, positioning: 0 }
  });

  let firebase = null;
  let currentUser = null;
  let authMode = 'login';
  let coachPrints = [null, null, null, null];
  let pendingPostMedia = null;
  let selectedMatch = null;
  let arenaFilter = 'all';
  let profile = emptyProfile();
  let posts = [];
  let matches = [];
  let publicProfiles = [];
  let notifications = [];
  let unsubscribers = [];
  let reminderTimers = [];

  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    $('p', el).textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 3800);
  }

  function isFirebaseReady() { return Boolean(firebase?.available && firebase.db && firebase.sdk); }
  function ensureSignedIn() {
    if (currentUser) return true;
    toast('Entre na sua conta para usar este recurso.');
    showModal('#authModal');
    return false;
  }
  function addUnsubscriber(callback) { if (typeof callback === 'function') unsubscribers.push(callback); }
  function clearRealtimeData() {
    unsubscribers.forEach(unsubscribe => unsubscribe());
    unsubscribers = [];
    reminderTimers.forEach(clearTimeout);
    reminderTimers = [];
  }
  function docTime(data) { return data?.createdAt || data?.updatedAt || now(); }

  async function uploadToCloudinary(file, folder) {
    const cloudName = firebase?.config?.cloudinaryCloudName;
    const uploadPreset = firebase?.config?.cloudinaryUploadPreset;
    if (!cloudName || !uploadPreset || cloudName === 'SEU_CLOUD_NAME' || uploadPreset === 'SEU_UPLOAD_PRESET') {
      throw new Error('Configure o Cloudinary em firebase-config.js antes de enviar arquivos.');
    }
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', uploadPreset);
    form.append('folder', `codm-hub/${folder}`);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/auto/upload`, { method: 'POST', body: form });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.secure_url) throw new Error(data?.error?.message || 'Não foi possível enviar o arquivo.');
    return data.secure_url;
  }

  async function compressImage(file, maxDimension = 1600, quality = .82) {
    if (!file?.type?.startsWith('image/')) return file;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(blob => blob ? resolve(new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' })) : reject(new Error('Falha ao preparar a imagem.')), 'image/jpeg', quality);
        };
        image.onerror = reject; image.src = reader.result;
      };
      reader.onerror = reject; reader.readAsDataURL(file);
    });
  }

  function pickFile(accept) {
    return new Promise(resolve => {
      const input = document.createElement('input'); input.type = 'file'; input.accept = accept;
      input.onchange = event => resolve(event.target.files?.[0] || null); input.click();
    });
  }
  async function selectAndUploadMedia(accept, folder) {
    if (!ensureSignedIn()) return null;
    const file = await pickFile(accept); if (!file) return null;
    toast('Enviando arquivo...');
    const prepared = file.type.startsWith('image/') ? await compressImage(file) : file;
    const url = await uploadToCloudinary(prepared, folder);
    toast('Arquivo enviado.');
    return { url, type: file.type.startsWith('video/') ? 'video' : 'image' };
  }
  async function readAnalysisImage(file) {
    const prepared = await compressImage(file, 1280, .72);
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(prepared); });
  }

  async function saveProfile() {
    if (!ensureSignedIn() || !isFirebaseReady()) return false;
    const sdk = firebase.sdk;
    const privateData = { profile, updatedAt: now() };
    const publicData = {
      uid: currentUser.uid, nickname: profile.nickname || currentUser.email.split('@')[0], clan: profile.clan || '', role: profile.role || 'Flex',
      style: profile.style || '', weapon: profile.weapon || '', favoriteMap: profile.favoriteMap || '', bio: profile.bio || '',
      avatarUrl: profile.avatarUrl || '', availability: Boolean(profile.availability), rank: profile.rank || 'Não classificado',
      score: Number(profile.score) || 0, skills: profile.skills || {}, updatedAt: now()
    };
    await Promise.all([
      sdk.setDoc(sdk.doc(firebase.db, 'users', currentUser.uid), privateData, { merge: true }),
      sdk.setDoc(sdk.doc(firebase.db, 'publicProfiles', currentUser.uid), publicData, { merge: true })
    ]);
    return true;
  }

  async function loadOwnProfile(user) {
    profile = emptyProfile();
    if (!isFirebaseReady()) return;
    const snap = await firebase.sdk.getDoc(firebase.sdk.doc(firebase.db, 'users', user.uid));
    if (snap.exists()) profile = { ...emptyProfile(), ...(snap.data().profile || {}) };
    else await saveProfile();
    renderProfile(); renderSkills(); updateAuthUI();
  }

  function renderAvatar(element, name, imageUrl) {
    if (!element) return;
    element.textContent = imageUrl ? '' : initials(name);
    element.style.backgroundImage = imageUrl ? `url('${imageUrl}')` : '';
    element.classList.toggle('has-image', Boolean(imageUrl));
  }
  function renderProfile() {
    const name = profile.nickname || currentUser?.email?.split('@')[0] || 'JOGADOR';
    const set = (selector, value) => { const el = $(selector); if (el) el.textContent = value; };
    set('#profileName', name); set('#cardNickname', name); set('#headerNickname', name);
    set('#profileSubtitle', `${profile.role || 'Flex'} · ${profile.weapon || 'Arma não informada'} · ${profile.clan || 'Sem clã'}`);
    set('#cardClanRole', `${profile.clan || 'SEM CLÃ'} · ${(profile.role || 'Flex').toUpperCase()}`);
    set('#profileBio', `“${profile.bio || 'Sem bio definida.'}”`); set('#profileClan', profile.clan || 'SEM CLÃ');
    set('#profileStyle', (profile.style || '—').toUpperCase()); set('#profileWeapon', (profile.weapon || '—').toUpperCase());
    set('#profileRank', profile.rank || 'Não classificado'); set('#profileId', profile.playerId || 'ID pendente');
    set('#cardRank', profile.rank || 'Não classificado'); set('#cardScore', formatNumber(profile.score));
    set('#homeScore', formatNumber(profile.score)); set('#profileScore', formatNumber(profile.score));
    set('#resumeContact', `@${name}`);
    ['#profileAvatar', '#headerAvatar', '#cardAvatar', '#feedUserAvatar'].forEach(selector => renderAvatar($(selector), name, profile.avatarUrl));
    const form = $('#profileForm');
    if (form) ['nickname', 'clan', 'bio', 'role', 'style', 'weapon', 'favoriteMap'].forEach(field => { if (form.elements[field]) form.elements[field].value = profile[field] || ''; });
    renderCareer(); renderProfileFeed();
    renderHome();
  }
  function renderHome() {
    const set = (selector, value) => { const element = $(selector); if (element) element.textContent = value; };
    set('#homeRankEmblem', profile.rank || '—');
    set('#homePlayerId', profile.playerId || 'ID pendente');
    set('#homeWeapon', profile.weapon || '—');
    const profileId = $('.card-footer span:last-child'); if (profileId) profileId.textContent = profile.playerId || 'ID pendente';
    set('#challengePercent', '—'); set('#challengeProgress', '—'); set('#largeChallengeText', 'A validação de desafios ainda não está configurada.');
    if ($('#challengeBar')) $('#challengeBar').style.width = '0'; if ($('#largeChallengeBar')) $('#largeChallengeBar').style.width = '0';
    const latestReport = profile.coachReports?.[0];
    set('#homeCoachGrade', latestReport ? `${Number(latestReport.grade) || 0}/100` : '—');
    set('#homeCoachCopy', latestReport ? 'Último relatório salvo no seu histórico privado' : 'Envie quatro prints para receber sua primeira análise');
    const trend = $('.score-trend'); if (trend) trend.innerHTML = '—<small>sem resultados validados</small>';
    const floating = $$('.floating-stat'); if (floating[0]) { $('b', floating[0]).textContent = '—'; $('span', floating[0]).textContent = 'Aguardando resultados'; }
    if (floating[1]) { $('b', floating[1]).textContent = profile.weapon || '—'; $('span', floating[1]).textContent = 'Arma favorita'; }
    const scoreText = $('.quick-grid .metric-card:first-child p'); if (scoreText) scoreText.textContent = 'Sem classificação validada';
  }
  function renderCareer() {
    const output = $('#careerTimeline'); if (!output) return;
    const list = Array.isArray(profile.career) ? profile.career : [];
    output.innerHTML = list.length ? list.map(item => `<div class="career-event"><span class="event-dot ${escapeHtml(item.tone || 'gold')}"></span><time>${escapeHtml(item.date)}</time><div><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.description)}</p></div></div>`).join('') : '<p class="empty-state">Ainda não há marcos registrados.</p>';
  }
  function renderProfileFeed() {
    const grid = $('#instaGrid'); if (!grid) return;
    const list = Array.isArray(profile.instaFeed) ? profile.instaFeed : [];
    grid.innerHTML = list.length ? list.map(item => `<article class="insta-item" tabindex="0" data-media-id="${escapeHtml(item.id)}"><${item.type === 'video' ? 'video muted playsinline' : 'img'} src="${escapeHtml(item.url)}" ${item.type === 'video' ? '' : `alt="${escapeHtml(item.caption || 'Publicação')}`}"></${item.type === 'video' ? 'video' : 'img'}><div class="insta-item-overlay"><span>Publicado ${escapeHtml(dateLabel(item.createdAt))}</span></div></article>`).join('') : '<div class="insta-empty"><strong>Seu feed está vazio.</strong><span>Publique uma foto ou vídeo para compor seu perfil.</span><button class="button primary small" data-add-profile-media>+ Nova mídia</button></div>';
    $$('[data-add-profile-media]', grid).forEach(button => button.addEventListener('click', addProfileMedia));
    $$('.insta-item', grid).forEach(element => element.addEventListener('click', () => {
      const item = list.find(media => media.id === element.dataset.mediaId); if (!item) return;
      $('#instaModalContent').innerHTML = item.type === 'video' ? `<video controls autoplay playsinline src="${escapeHtml(item.url)}"></video><b>${escapeHtml(item.caption || '')}</b>` : `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.caption || '')}"><b>${escapeHtml(item.caption || '')}</b>`;
      showModal('#instaMediaModal');
    }));
  }
  function renderSkills() {
    const target = $('#skillBars'); if (!target) return;
    const labels = [['aim', 'Mira', 'var(--gold)'], ['decision', 'Decisão', 'var(--blue)'], ['aggression', 'Agressão', 'var(--pink)'], ['positioning', 'Posicionamento', 'var(--green)']];
    target.innerHTML = labels.map(([key, label, color]) => { const score = Math.max(0, Math.min(100, Number(profile.skills?.[key]) || 0)); return `<div class="skill-row"><span>${label}</span><i><b style="width:${score}%;--skill:${color}"></b></i><strong>${score || '—'}</strong></div>`; }).join('');
  }

  function postMarkup(post) {
    const name = post.authorName || 'Jogador';
    const media = post.mediaUrl ? (post.mediaType === 'video' ? `<video controls playsinline src="${escapeHtml(post.mediaUrl)}"></video>` : `<img src="${escapeHtml(post.mediaUrl)}" alt="Mídia da publicação">`) : '';
    return `<article class="post card" data-post-id="${escapeHtml(post.id)}"><div class="post-head"><span class="avatar" ${post.authorAvatar ? `style="background-image:url('${escapeHtml(post.authorAvatar)}');background-size:cover"` : ''}>${post.authorAvatar ? '' : initials(name)}</span><div><button class="text-button post-author" data-open-profile="${escapeHtml(post.authorUid)}">${escapeHtml(name)}</button><small>${escapeHtml(post.authorRole || 'Jogador')} · ${escapeHtml(dateLabel(docTime(post)))}</small></div></div><p class="post-body">${escapeHtml(post.text || '')}</p>${media ? `<div class="post-media-preview">${media}</div>` : ''}<div class="post-footer"><button data-like-post="${escapeHtml(post.id)}">♡ <span>${Number(post.likeCount) || 0}</span> curtidas</button><button data-comment-post="${escapeHtml(post.id)}">◌ <span>${Number(post.commentCount) || 0}</span> comentários</button><button data-share-post="${escapeHtml(post.id)}">↗ Compartilhar</button></div></article>`;
  }
  function renderPosts() {
    const output = $('#postList'); const spotlight = $('#spotlightPosts');
    if (output) output.innerHTML = posts.length ? posts.map(postMarkup).join('') : '<div class="card empty-state">Ainda não há publicações. Seja o primeiro a iniciar a conversa.</div>';
    if (spotlight) spotlight.innerHTML = posts.slice(0, 3).map(postMarkup).join('') || '<p class="empty-state">Os destaques aparecerão aqui.</p>';
    $$('[data-like-post]').forEach(button => button.addEventListener('click', () => toggleLike(button.dataset.likePost)));
    $$('[data-comment-post]').forEach(button => button.addEventListener('click', () => addComment(button.dataset.commentPost)));
    $$('[data-share-post]').forEach(button => button.addEventListener('click', () => shareUrl(`post=${button.closest('[data-post-id]').dataset.postId}`)));
    $$('[data-open-profile]').forEach(button => button.addEventListener('click', () => openPublicProfile(button.dataset.openProfile)));
  }

  function matchMarkup(match) {
    const owner = match.ownerName || 'Jogador'; const isOwner = currentUser?.uid === match.ownerUid; const full = Number(match.requestCount) >= Number(match.maxRequests || 1);
    const status = match.status === 'cancelled' ? 'CANCELADO' : full ? 'LISTA DE ESPERA' : 'ABERTO';
    return `<article class="match-card card" data-match-id="${escapeHtml(match.id)}"><div class="match-top"><span class="mode-tag">${escapeHtml(match.mode)} · ${status}</span><span class="xp-badge">${escapeHtml(match.format || 'BO1')}</span></div><h3>${escapeHtml(match.title || 'Scrim')}</h3><p>${escapeHtml(match.gameMode || '')} · ${escapeHtml(match.map || 'Mapa a definir')}</p><div class="match-player"><span class="avatar small" ${match.ownerAvatar ? `style="background-image:url('${escapeHtml(match.ownerAvatar)}');background-size:cover"` : ''}>${match.ownerAvatar ? '' : initials(owner)}</span><div><button class="text-button post-author" data-open-profile="${escapeHtml(match.ownerUid)}">${escapeHtml(owner)}</button><small>${escapeHtml(match.ownerClan || 'Sem clã')} · ${Number(match.teamSize) || 1} por lado</small></div></div><div class="match-details"><span>📅 ${escapeHtml(dateLabel(match.startAt))}</span><span>🎙 ${escapeHtml(match.contact || 'Contato no HUB')}</span></div><p class="match-description">${escapeHtml(match.description || 'Sem observações adicionais.')}</p><div class="match-bottom"><button class="button small ghost" data-calendar-match="${escapeHtml(match.id)}">Adicionar agenda</button>${isOwner ? `<button class="button small ghost" data-manage-match="${escapeHtml(match.id)}">Gerenciar (${Number(match.requestCount) || 0})</button>` : `<button class="button small primary" data-request-match="${escapeHtml(match.id)}" ${full || match.status !== 'open' ? 'disabled' : ''}>Solicitar vaga</button>`}</div></article>`;
  }
  function renderMatches() {
    const output = $('#matchGrid'); if (!output) return;
    const visible = matches.filter(match => arenaFilter === 'all' || match.mode === arenaFilter).filter(match => match.status !== 'cancelled');
    output.innerHTML = visible.length ? visible.map(matchMarkup).join('') : '<div class="card empty-state">Nenhuma scrim agendada neste filtro. Crie a primeira.</div>';
    $$('[data-request-match]').forEach(button => button.addEventListener('click', () => requestMatch(button.dataset.requestMatch)));
    $$('[data-manage-match]').forEach(button => button.addEventListener('click', () => manageMatch(button.dataset.manageMatch)));
    $$('[data-calendar-match]').forEach(button => button.addEventListener('click', () => downloadCalendar(matches.find(match => match.id === button.dataset.calendarMatch))));
    $$('[data-open-profile]').forEach(button => button.addEventListener('click', () => openPublicProfile(button.dataset.openProfile)));
  }
  function renderRanking(query = '') {
    const text = query.trim().toLowerCase(); const list = publicProfiles.filter(item => item.nickname?.toLowerCase().includes(text)); const target = $('#rankingRows');
    if (!target) return;
    target.innerHTML = list.length ? list.map((item, index) => `<div class="rank-row"><span class="rank-number">${index + 1}</span><span class="rank-player"><span class="avatar small" ${item.avatarUrl ? `style="background-image:url('${escapeHtml(item.avatarUrl)}');background-size:cover"` : ''}>${item.avatarUrl ? '' : initials(item.nickname)}</span><button class="text-button post-author" data-open-profile="${escapeHtml(item.uid)}">${escapeHtml(item.nickname)}</button></span><span class="rank-role">${escapeHtml(item.role || '—')}</span><span class="rank-wr">${item.availability ? 'Disponível' : '—'}</span><strong class="rank-score">${formatNumber(item.score)}</strong><button class="circle-action" data-open-profile="${escapeHtml(item.uid)}">→</button></div>`).join('') : '<div class="rank-row"><span></span><span>Nenhum jogador encontrado.</span></div>';
    const podium = $('.podium');
    if (podium) podium.innerHTML = `<span class="eyebrow">RANKING DA COMUNIDADE</span><div class="podium-players">${publicProfiles.slice(0, 3).map((item, index) => `<div class="podium-player ${index === 0 ? 'first' : index === 1 ? 'second' : 'third'}"><span class="avatar">${initials(item.nickname)}</span><b>${escapeHtml(item.nickname)}</b><small>${formatNumber(item.score)} PTS</small><i>${index + 1}</i></div>`).join('') || '<p class="empty-state">O pódio aparecerá quando houver perfis cadastrados.</p>'}</div>`;
    const insight = $('.rank-insight');
    if (insight) insight.innerHTML = `<span class="eyebrow">SUA POSIÇÃO</span><h3>${currentUser ? `#${Math.max(1, publicProfiles.findIndex(item => item.uid === currentUser.uid) + 1)}` : '—'}</h3><p>${currentUser ? 'O score competitivo depende de resultados validados pela operação.' : 'Entre em sua conta para aparecer no ranking da comunidade.'}</p>`;
    $$('[data-open-profile]', target).forEach(button => button.addEventListener('click', () => openPublicProfile(button.dataset.openProfile)));
  }
  function renderNotifications() {
    const list = $('#notificationsList'); const badge = $('#notificationBadge'); const unread = notifications.filter(item => !item.readAt).length;
    if (badge) { badge.textContent = unread; badge.classList.toggle('hidden', unread === 0); }
    if (list) list.innerHTML = notifications.length ? notifications.map(item => `<button class="notification-item ${item.readAt ? '' : 'unread'}" data-notification-id="${escapeHtml(item.id)}"><b>${escapeHtml(item.title || 'Atualização')}</b><span>${escapeHtml(item.message || '')}</span><small>${escapeHtml(dateLabel(docTime(item)))}</small></button>`).join('') : '<p class="empty-state">Você não tem notificações.</p>';
    $$('[data-notification-id]', list || document).forEach(button => button.addEventListener('click', () => markNotificationRead(button.dataset.notificationId)));
  }

  function subscribePublicData() {
    if (!isFirebaseReady()) return;
    const { collection, onSnapshot } = firebase.sdk;
    const listenerError = () => toast('Os dados ainda não estão liberados. Publique as regras do Firestore incluídas no projeto.');
    addUnsubscriber(onSnapshot(collection(firebase.db, 'posts'), snap => { posts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => String(docTime(b)).localeCompare(String(docTime(a)))); renderPosts(); }, listenerError));
    addUnsubscriber(onSnapshot(collection(firebase.db, 'matches'), snap => { matches = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => String(a.startAt).localeCompare(String(b.startAt))); renderMatches(); scheduleReminders(); }, listenerError));
    addUnsubscriber(onSnapshot(collection(firebase.db, 'publicProfiles'), snap => { publicProfiles = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() })).sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)); renderRanking($('#rankingSearch')?.value || ''); }, listenerError));
  }
  function subscribeNotifications() {
    if (!isFirebaseReady() || !currentUser) return;
    const { collection, onSnapshot, query, where } = firebase.sdk;
    addUnsubscriber(onSnapshot(query(collection(firebase.db, 'notifications'), where('ownerUid', '==', currentUser.uid)), snap => { notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => String(docTime(b)).localeCompare(String(docTime(a)))); renderNotifications(); }, () => toast('Não foi possível carregar suas notificações.')));
  }
  function scheduleReminders() {
    reminderTimers.forEach(clearTimeout); reminderTimers = [];
    if (!currentUser || Notification.permission !== 'granted') return;
    matches.filter(match => match.ownerUid === currentUser.uid || match.requestedBy?.includes(currentUser.uid)).forEach(match => {
      const delay = new Date(match.startAt).getTime() - Date.now() - 15 * 60 * 1000;
      if (delay > 0 && delay < 2147483647) reminderTimers.push(setTimeout(() => new Notification('CODM HUB · Scrim em 15 minutos', { body: `${match.title} começa às ${dateLabel(match.startAt)}` }), delay));
    });
  }

  async function createPost() {
    if (!ensureSignedIn() || !isFirebaseReady()) return;
    const input = $('#postInput'); const text = input.value.trim();
    if (!text && !pendingPostMedia) return toast('Escreva uma mensagem ou anexe uma mídia.');
    const ref = firebase.sdk.doc(firebase.sdk.collection(firebase.db, 'posts'));
    await firebase.sdk.setDoc(ref, { authorUid: currentUser.uid, authorName: profile.nickname || currentUser.email.split('@')[0], authorRole: profile.role || 'Jogador', authorAvatar: profile.avatarUrl || '', text, mediaUrl: pendingPostMedia?.url || '', mediaType: pendingPostMedia?.type || '', likeCount: 0, commentCount: 0, createdAt: now() });
    input.value = ''; pendingPostMedia = null; $('#charCount').textContent = '0/300'; $('#attachPostPhotoBtn').textContent = '🖼 Anexar Foto/Mídia'; toast('Publicação salva na comunidade.');
  }
  async function toggleLike(postId) {
    if (!ensureSignedIn() || !isFirebaseReady()) return;
    const { doc, getDoc, setDoc, deleteDoc, updateDoc, increment } = firebase.sdk;
    const postRef = doc(firebase.db, 'posts', postId); const likeRef = doc(firebase.db, 'posts', postId, 'likes', currentUser.uid); const current = await getDoc(likeRef);
    if (current.exists()) { await deleteDoc(likeRef); await updateDoc(postRef, { likeCount: increment(-1) }); } else { await setDoc(likeRef, { userUid: currentUser.uid, createdAt: now() }); await updateDoc(postRef, { likeCount: increment(1) }); }
  }
  async function addComment(postId) {
    if (!ensureSignedIn() || !isFirebaseReady()) return;
    const text = window.prompt('Escreva seu comentário (máximo de 300 caracteres):')?.trim(); if (!text) return;
    const { doc, collection, setDoc, updateDoc, increment } = firebase.sdk; const commentRef = doc(collection(firebase.db, 'posts', postId, 'comments'));
    await setDoc(commentRef, { authorUid: currentUser.uid, authorName: profile.nickname || currentUser.email.split('@')[0], text: text.slice(0, 300), createdAt: now() });
    await updateDoc(doc(firebase.db, 'posts', postId), { commentCount: increment(1) }); toast('Comentário enviado.');
  }
  async function addProfileMedia() {
    try {
      const media = await selectAndUploadMedia('image/*,video/*', 'profile-feed'); if (!media) return;
      const caption = window.prompt('Legenda da publicação (opcional):') || '';
      profile.instaFeed = [{ id: crypto.randomUUID(), ...media, caption: caption.slice(0, 300), createdAt: now() }, ...(profile.instaFeed || [])].slice(0, 50);
      await saveProfile(); renderProfileFeed(); toast('Mídia adicionada ao seu perfil.');
    } catch (error) { toast(error.message || 'Não foi possível publicar a mídia.'); }
  }
  async function requestMatch(matchId) {
    if (!ensureSignedIn() || !isFirebaseReady()) return;
    const match = matches.find(item => item.id === matchId); if (!match) return;
    const message = window.prompt('Apresente sua line-up ou informe um contato para a scrim (opcional):') || '';
    const requestRef = firebase.sdk.doc(firebase.db, 'matches', matchId, 'requests', currentUser.uid);
    const old = await firebase.sdk.getDoc(requestRef); if (old.exists()) return toast('Você já solicitou uma vaga nesta scrim.');
    await firebase.sdk.setDoc(requestRef, { requesterUid: currentUser.uid, requesterName: profile.nickname || currentUser.email.split('@')[0], requesterClan: profile.clan || '', message: message.slice(0, 500), status: 'pending', createdAt: now() });
    await firebase.sdk.updateDoc(firebase.sdk.doc(firebase.db, 'matches', matchId), { requestCount: firebase.sdk.increment(1), requestedBy: firebase.sdk.arrayUnion(currentUser.uid) });
    await createNotification(match.ownerUid, 'Nova solicitação de scrim', `${profile.nickname || 'Um jogador'} solicitou uma vaga em “${match.title}”.`, { matchId });
    toast('Solicitação enviada ao anfitrião.');
  }
  async function createNotification(ownerUid, title, message, extra = {}) {
    if (!isFirebaseReady() || !currentUser || ownerUid === currentUser.uid) return;
    const ref = firebase.sdk.doc(firebase.sdk.collection(firebase.db, 'notifications'));
    await firebase.sdk.setDoc(ref, { ownerUid, actorUid: currentUser.uid, title, message, ...extra, createdAt: now(), readAt: null });
  }
  async function markNotificationRead(id) {
    if (!isFirebaseReady()) return;
    await firebase.sdk.updateDoc(firebase.sdk.doc(firebase.db, 'notifications', id), { readAt: now() });
  }
  async function manageMatch(matchId) {
    if (!ensureSignedIn() || !isFirebaseReady()) return;
    const match = matches.find(item => item.id === matchId); if (!match || match.ownerUid !== currentUser.uid) return;
    const snap = await firebase.sdk.getDocs(firebase.sdk.collection(firebase.db, 'matches', matchId, 'requests'));
    const requests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    $('#matchManageContent').innerHTML = `<h2>${escapeHtml(match.title)}</h2><p>${requests.length ? 'Solicitações recebidas:' : 'Ainda não há solicitações.'}</p>${requests.map(item => `<div class="request-row"><b>${escapeHtml(item.requesterName)}</b><span>${escapeHtml(item.requesterClan || 'Sem clã')} · ${escapeHtml(item.message || 'Sem mensagem')}</span><button class="button small primary" data-accept-request="${escapeHtml(item.id)}">Aceitar</button></div>`).join('')}<button class="button ghost full" data-cancel-match>Cancelar agendamento</button>`;
    showModal('#matchManageModal');
    $$('[data-accept-request]').forEach(button => button.addEventListener('click', () => acceptMatchRequest(match, button.dataset.acceptRequest)));
    $('[data-cancel-match]')?.addEventListener('click', async () => { if (window.confirm('Cancelar esta scrim?')) { await firebase.sdk.updateDoc(firebase.sdk.doc(firebase.db, 'matches', match.id), { status: 'cancelled', updatedAt: now() }); closeModals(); } });
  }
  async function acceptMatchRequest(match, requesterUid) {
    const requestRef = firebase.sdk.doc(firebase.db, 'matches', match.id, 'requests', requesterUid);
    await firebase.sdk.updateDoc(requestRef, { status: 'accepted', respondedAt: now() });
    await firebase.sdk.updateDoc(firebase.sdk.doc(firebase.db, 'matches', match.id), { status: 'closed', acceptedRequesterUid: requesterUid, updatedAt: now() });
    const requestSnap = await firebase.sdk.getDoc(requestRef); const request = requestSnap.data();
    await createNotification(requesterUid, 'Solicitação aceita', `Sua vaga na scrim “${match.title}” foi aceita. Confira o agendamento.`, { matchId: match.id });
    closeModals(); toast(`Solicitação de ${request?.requesterName || 'jogador'} aceita.`);
  }
  async function createMatch(event) {
    event.preventDefault(); if (!ensureSignedIn() || !isFirebaseReady()) return;
    const data = Object.fromEntries(new FormData(event.currentTarget)); const startAt = new Date(`${data.date}T${data.time}`).toISOString();
    if (Number.isNaN(new Date(startAt).getTime()) || new Date(startAt) <= new Date()) return toast('Informe uma data e horário futuros.');
    const ref = firebase.sdk.doc(firebase.sdk.collection(firebase.db, 'matches'));
    await firebase.sdk.setDoc(ref, { ownerUid: currentUser.uid, ownerName: profile.nickname || currentUser.email.split('@')[0], ownerClan: profile.clan || '', ownerAvatar: profile.avatarUrl || '', title: data.title.trim().slice(0, 80), mode: data.mode, gameMode: data.gameMode, map: data.map.trim().slice(0, 60), format: data.format, teamSize: Number(data.teamSize), maxRequests: 1, requestCount: 0, requestedBy: [], contact: data.contact.trim().slice(0, 100), description: data.description.trim().slice(0, 500), startAt, status: 'open', createdAt: now() });
    event.currentTarget.reset(); closeModals(); toast('Scrim agendada e visível para a comunidade.');
  }
  function downloadCalendar(match) {
    if (!match) return; const start = new Date(match.startAt); const end = new Date(start.getTime() + 90 * 60000); const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:${match.id}@codmhub\r\nDTSTAMP:${stamp(new Date())}\r\nDTSTART:${stamp(start)}\r\nDTEND:${stamp(end)}\r\nSUMMARY:${match.title.replace(/[\r\n,;]/g, ' ')}\r\nDESCRIPTION:${(match.description || '').replace(/[\r\n,;]/g, ' ')}\r\nLOCATION:${(match.map || '').replace(/[\r\n,;]/g, ' ')}\r\nEND:VEVENT\r\nEND:VCALENDAR`;
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); link.download = `${match.title.replace(/[^a-z0-9]/gi, '-')}.ics`; link.click(); URL.revokeObjectURL(link.href); toast('Arquivo de calendário baixado.');
  }
  async function openPublicProfile(uid) {
    if (!uid) return; const player = publicProfiles.find(item => item.uid === uid); if (!player) return;
    $('#publicProfileContent').innerHTML = `<div class="public-profile-head"><span class="avatar xxl" ${player.avatarUrl ? `style="background-image:url('${escapeHtml(player.avatarUrl)}');background-size:cover"` : ''}>${player.avatarUrl ? '' : initials(player.nickname)}</span><div><h2>${escapeHtml(player.nickname)}</h2><p>${escapeHtml(player.role || 'Jogador')} · ${escapeHtml(player.clan || 'Sem clã')}</p></div></div><p>${escapeHtml(player.bio || 'Sem bio definida.')}</p><div class="public-profile-stats"><span><b>${formatNumber(player.score)}</b> Score</span><span><b>${escapeHtml(player.weapon || '—')}</b> Arma</span><span><b>${player.availability ? 'Disponível' : 'Indisponível'}</b> para time</span></div>`;
    showModal('#publicProfileModal');
  }
  async function shareUrl(fragment) {
    const url = `${location.href.split('#')[0]}#${fragment}`;
    try { await navigator.clipboard.writeText(url); toast('Link copiado.'); } catch { toast(url); }
  }

  async function selectCoachPrint(slot) {
    const file = await pickFile('image/png,image/jpeg,image/webp'); if (!file) return;
    coachPrints[slot] = await readAnalysisImage(file);
    const preview = $(`#printPrev${slot}`); preview.classList.add('has-file'); preview.innerHTML = `<img src="${coachPrints[slot]}" alt="Print ${slot + 1}"><span class="print-number">${slot + 1}</span>`;
    $(`.btn-upload-print[data-slot="${slot}"]`).textContent = 'Trocar print';
  }
  async function runCoachAnalysis(event) {
    event.preventDefault(); if (!ensureSignedIn()) return;
    if (coachPrints.some(item => !item)) return toast('Anexe os quatro prints da partida.');
    const button = $('#coachForm button[type="submit"]'); button.disabled = true; button.textContent = 'IA analisando os prints...';
    try {
      const form = Object.fromEntries(new FormData(event.currentTarget)); const token = await currentUser.getIdToken();
      const response = await fetch(firebase?.config?.coachApiUrl || '/api/analyze-coach', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ mode: form.mode, map: form.map, screenshots: coachPrints }) });
      const report = await response.json(); if (!response.ok) throw new Error(report.error || 'Falha na análise.');
      profile.skills = report.metrics || profile.skills; profile.coachReports = [{ ...report, mode: form.mode, map: form.map, createdAt: now() }, ...(profile.coachReports || [])].slice(0, 20);
      await saveProfile(); renderSkills(); renderCoachReport(report, form); toast('Relatório do Coach salvo no seu perfil privado.');
    } catch (error) { $('#coachReport').innerHTML = `<div class="report-empty"><span>⚠</span><h2>Análise indisponível</h2><p>${escapeHtml(error.message || 'Tente novamente.')}</p></div>`; toast(error.message || 'Não foi possível analisar os prints.');
    } finally { button.disabled = false; button.textContent = '✦ Gerar Veredito da IA baseada nos Prints'; }
  }
  function renderCoachReport(report, data) {
    const metric = key => Math.max(0, Math.min(100, Number(report.metrics?.[key]) || 0));
    $('#coachReport').innerHTML = `<div class="report-title"><div><span class="eyebrow">RELATÓRIO SALVO · ${escapeHtml(data.mode)} / ${escapeHtml(data.map)}</span><h2>${escapeHtml(report.title || 'Análise competitiva')}</h2></div><span class="coach-grade">${Math.max(0, Math.min(100, Number(report.grade) || 0))}</span></div><div class="coach-source-badge">✓ Baseado somente nos quatro prints enviados</div><div class="coach-kpis"><div><b>${metric('aim') || '—'}</b><span>MIRA</span></div><div><b>${metric('decision') || '—'}</b><span>DECISÃO</span></div><div><b>${metric('aggression') || '—'}</b><span>AGRESSÃO</span></div><div><b>${metric('positioning') || '—'}</b><span>POSICIONAMENTO</span></div></div><div class="coach-insight"><b>VEREDITO</b><p>${escapeHtml(report.verdict || '')}</p></div><div class="coach-insight"><b>PRÓXIMO TREINO</b><p>${escapeHtml(report.recommendation || '')}</p></div><div class="coach-evidence"><b>DADOS IDENTIFICADOS</b><p>${escapeHtml(report.evidence || 'Nenhum dado identificado.')}</p></div>${report.warnings?.length ? `<div class="coach-warnings"><b>ATENÇÃO</b><ul>${report.warnings.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>` : ''}`;
  }

  function showModal(id) { $('#modalBackdrop')?.classList.add('show'); const modal = $(id); if (modal) { modal.classList.add('show'); document.body.style.overflow = 'hidden'; modal.querySelector('input,select,button')?.focus(); } }
  function closeModals() { $('#modalBackdrop')?.classList.remove('show'); $$('.modal').forEach(modal => modal.classList.remove('show')); document.body.style.overflow = ''; }
  function navigate(page) { if (page === 'perfil' && !ensureSignedIn()) return; const target = document.getElementById(page); if (!target) return; $$('.page').forEach(section => section.classList.toggle('active', section.id === page)); $$('[data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === page)); document.body.classList.remove('menu-open'); history.replaceState(null, '', `#${page}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function updateAuthUI() {
    const loggedIn = Boolean(currentUser); $$('.auth-required-nav').forEach(element => element.classList.toggle('hidden', !loggedIn));
    $('#authButton')?.classList.toggle('hidden', loggedIn); $('#profileMini')?.classList.toggle('hidden', !loggedIn); $('#logoutButton')?.classList.toggle('hidden', !loggedIn);
  }
  async function requestBrowserNotifications() { if (!('Notification' in window)) return toast('Seu navegador não oferece notificações.'); const permission = await Notification.requestPermission(); toast(permission === 'granted' ? 'Lembretes no navegador ativados.' : 'Permissão de notificações não concedida.'); scheduleReminders(); }

  function bindEvents() {
    $$('[data-page]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); navigate(button.dataset.page); }));
    $('#authButton')?.addEventListener('click', () => showModal('#authModal')); $('#logoutButton')?.addEventListener('click', () => firebase?.sdk.signOut(firebase.auth));
    $('#quickProfileBtn')?.addEventListener('click', () => navigate('perfil')); $('#activityProfileBtn')?.addEventListener('click', () => navigate('perfil'));
    $$('[data-score-info]').forEach(button => button.addEventListener('click', () => toast('O score só poderá mudar após validação operacional; ele não é gerado pelo site.')));
    $('#notificationButton')?.addEventListener('click', () => showModal('#notificationsModal')); $('#enableNotifications')?.addEventListener('click', requestBrowserNotifications);
    $('#menuButton')?.addEventListener('click', () => document.body.classList.toggle('menu-open')); $('#modalBackdrop')?.addEventListener('click', closeModals); $$('[data-close-modal]').forEach(button => button.addEventListener('click', closeModals));
    $('#themeToggle')?.addEventListener('click', () => { document.body.classList.toggle('light'); localStorage.setItem('codm-hub-theme', document.body.classList.contains('light') ? 'light' : 'dark'); }); if (localStorage.getItem('codm-hub-theme') === 'light') document.body.classList.add('light');
    $('#toggleAuthMode')?.addEventListener('click', () => { authMode = authMode === 'login' ? 'register' : 'login'; $('#authModalTitle').textContent = authMode === 'login' ? 'Entre na sua carreira' : 'Crie sua conta no HUB'; $('#emailAuthSubmit').textContent = authMode === 'login' ? 'Entrar na conta' : 'Criar conta'; $('#toggleAuthMode').textContent = authMode === 'login' ? 'Ainda não tem conta? Criar nova conta' : 'Já tem uma conta? Entrar'; });
    $('#authForm')?.addEventListener('submit', async event => { event.preventDefault(); if (!isFirebaseReady()) return toast('Firebase não está disponível.'); const data = new FormData(event.currentTarget); try { if (authMode === 'login') await firebase.sdk.signInWithEmailAndPassword(firebase.auth, data.get('email'), data.get('password')); else await firebase.sdk.createUserWithEmailAndPassword(firebase.auth, data.get('email'), data.get('password')); closeModals(); } catch (error) { toast(error.message || 'Não foi possível autenticar.'); } });
    $('#googleLogin')?.addEventListener('click', async () => { try { await firebase.sdk.signInWithPopup(firebase.auth, new firebase.sdk.GoogleAuthProvider()); closeModals(); } catch (error) { toast(error.message || 'Falha no login com Google.'); } });
    $('#editProfile')?.addEventListener('click', () => { if (ensureSignedIn()) showModal('#editModal'); });
    $('#profileForm')?.addEventListener('submit', async event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); profile = { ...profile, ...data }; await saveProfile(); renderProfile(); closeModals(); toast('Perfil salvo e atualizado para a comunidade.'); });
    const avatarChange = async () => { try { const media = await selectAndUploadMedia('image/*', 'avatars'); if (media) { profile.avatarUrl = media.url; await saveProfile(); renderProfile(); } } catch (error) { toast(error.message); } };
    $('#profileAvatar')?.addEventListener('click', avatarChange); $('#changeAvatarBtn')?.addEventListener('click', avatarChange);
    $('#addMediaBtn')?.addEventListener('click', addProfileMedia); $('#uploadInstaMediaBtn')?.addEventListener('click', addProfileMedia);
    $('#attachPostPhotoBtn')?.addEventListener('click', async () => { try { pendingPostMedia = await selectAndUploadMedia('image/*,video/*', 'posts'); if (pendingPostMedia) $('#attachPostPhotoBtn').textContent = '✓ Mídia anexada'; } catch (error) { toast(error.message); } });
    $('#postInput')?.addEventListener('input', event => { $('#charCount').textContent = `${event.target.value.length}/300`; }); $('#publishPost')?.addEventListener('click', createPost);
    $('#createMatchBtn')?.addEventListener('click', () => { if (ensureSignedIn()) showModal('#matchModal'); }); $('#matchForm')?.addEventListener('submit', createMatch);
    $$('.filter[data-filter]').forEach(button => button.addEventListener('click', () => { arenaFilter = button.dataset.filter; $$('.filter[data-filter]').forEach(item => item.classList.toggle('active', item === button)); renderMatches(); }));
    $('#rankingSearch')?.addEventListener('input', event => renderRanking(event.target.value));
    $$('.profile-tab').forEach(tab => tab.addEventListener('click', () => { $$('.profile-tab').forEach(item => item.classList.toggle('active', item === tab)); $$('.profile-tab-content').forEach(content => content.classList.toggle('active', content.id === `tab-${tab.dataset.profileTab}`)); }));
    $('#addCareerMilestone')?.addEventListener('click', () => toast('Os marcos podem ser incluídos pelo formulário de perfil na próxima atualização.'));
    $('#shareProfile')?.addEventListener('click', () => currentUser ? shareUrl(`player=${currentUser.uid}`) : showModal('#authModal')); $('#shareCardBtn')?.addEventListener('click', () => currentUser ? shareUrl(`player=${currentUser.uid}`) : showModal('#authModal'));
    $$('.btn-upload-print').forEach(button => button.addEventListener('click', () => selectCoachPrint(Number(button.dataset.slot)))); $('#coachForm')?.addEventListener('submit', runCoachAnalysis);
    $('#toggleAvailable')?.addEventListener('click', async () => { if (!ensureSignedIn()) return; profile.availability = !profile.availability; await saveProfile(); $('#toggleAvailable').textContent = profile.availability ? '✓ Disponível para times' : 'Marcar como disponível'; toast(profile.availability ? 'Seu perfil está visível para recrutadores.' : 'Sua disponibilidade foi removida.'); });
  }
  function initialise() {
    bindEvents(); renderProfile(); renderSkills(); renderPosts(); renderMatches(); renderRanking();
    window.addEventListener('codmFirebaseReady', event => { firebase = event.detail; if (!isFirebaseReady()) return toast('Não foi possível conectar ao Firebase.'); subscribePublicData(); firebase.sdk.onAuthStateChanged(firebase.auth, async user => { clearRealtimeData(); currentUser = user; if (user) { await loadOwnProfile(user); subscribePublicData(); subscribeNotifications(); } else { profile = emptyProfile(); posts = []; matches = []; publicProfiles = []; notifications = []; renderProfile(); renderPosts(); renderMatches(); renderRanking(); renderNotifications(); updateAuthUI(); subscribePublicData(); } }); });
    const page = location.hash.slice(1); if (['inicio', 'perfil', 'arena', 'ranking', 'desafios', 'coach', 'comunidade'].includes(page)) navigate(page);
  }
  initialise();
})();
