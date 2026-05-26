const API_URL = 'http://localhost:3001/api/auth';
const AUTH_MODE = 'local'; // Cambia a 'backend' solo si tienes la API corriendo.
const SESSION_TOKEN_KEY = 'rm_token';
const SESSION_USER_KEY = 'rm_user';
const LOCAL_USERS_KEY = 'rm_local_users';
const SOCIAL_STORAGE_PREFIX = 'rm_social_state';

const state = {
  user: loadSession()?.user || null,
  selectedRating: 5,
  social: null,
  activeSocialTab: 'progress',
  selectedFriendId: null,
};

function getInitials(name) {
  return String(name || 'JU')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'JU';
}

function getLocalUsers() {
  const saved = localStorage.getItem(LOCAL_USERS_KEY);
  if (!saved) {
    const demoUsers = [
      {
        id: 'demo-user',
        username: 'MindHunterDemo',
        email: 'demo@minds.local',
        password: '123456',
      },
    ];
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(demoUsers));
    return demoUsers;
  }

  try {
    const users = JSON.parse(saved);
    return Array.isArray(users) ? users : [];
  } catch (_) {
    localStorage.removeItem(LOCAL_USERS_KEY);
    return getLocalUsers();
  }
}

function saveLocalUsers(users) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validateAuthPayload(endpoint, payload) {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || '');

  if (!email || !email.includes('@')) {
    throw new Error('Escribe un correo válido.');
  }

  if (!password || password.length < 6) {
    throw new Error('La contraseña debe tener mínimo 6 caracteres.');
  }

  if (endpoint === 'register') {
    const username = String(payload.username || '').trim();
    const confirmPassword = String(payload.confirmPassword || '');

    if (!username || username.length < 3) {
      throw new Error('El usuario debe tener mínimo 3 caracteres.');
    }

    if (password !== confirmPassword) {
      throw new Error('Las contraseñas no coinciden.');
    }
  }
}

function createPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
  };
}

async function requestLocalAuth(endpoint, payload) {
  validateAuthPayload(endpoint, payload);

  const users = getLocalUsers();
  const email = normalizeEmail(payload.email);

  if (endpoint === 'register') {
    const username = String(payload.username || '').trim();
    const userExists = users.some((user) => normalizeEmail(user.email) === email);

    if (userExists) {
      throw new Error('Ese correo ya está registrado. Inicia sesión.');
    }

    const newUser = {
      id: `local-${Date.now()}`,
      username,
      email,
      password: String(payload.password),
    };

    users.push(newUser);
    saveLocalUsers(users);

    return {
      token: `local-token-${newUser.id}`,
      user: createPublicUser(newUser),
    };
  }

  if (endpoint === 'login') {
    const foundUser = users.find((user) => normalizeEmail(user.email) === email);

    if (!foundUser || String(foundUser.password) !== String(payload.password)) {
      throw new Error('Correo o contraseña incorrectos.');
    }

    return {
      token: `local-token-${foundUser.id}`,
      user: createPublicUser(foundUser),
    };
  }

  throw new Error('Acción de autenticación no soportada.');
}

async function requestBackendAuth(endpoint, payload) {
  const response = await fetch(`${API_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await response.json();
  } catch (_) {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || 'No se pudo completar la solicitud');
  }

  return data;
}

async function requestAuth(endpoint, payload) {
  if (AUTH_MODE === 'backend') {
    return requestBackendAuth(endpoint, payload);
  }

  return requestLocalAuth(endpoint, payload);
}

function saveSession(token, user) {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
}

function loadSession() {
  const token = localStorage.getItem(SESSION_TOKEN_KEY);
  const userValue = localStorage.getItem(SESSION_USER_KEY);

  if (!token || !userValue) return null;

  try {
    return { token, user: JSON.parse(userValue) };
  } catch (_) {
    logout();
    return null;
  }
}

function logout() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_USER_KEY);
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 4000);
}

function updateNavActions() {
  const navActions = document.getElementById('navActions');
  if (!navActions) return;

  if (state.user) {
    navActions.innerHTML = `
      <button class="btn btn-red" type="button" data-social-open>Zona social</button>
      <button class="btn btn-outline" type="button" id="logoutBtn">Cerrar sesion</button>
    `;
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      logout();
      state.user = null;
      state.social = null;
      state.selectedFriendId = null;
      closeSocialHub();
      updateNavActions();
      showToast('Sesion cerrada', 'info');
    });
    return;
  }

  navActions.innerHTML = `
    <button class="btn btn-red" data-auth="register" type="button">Registrarse</button>
    <button class="btn btn-outline" data-auth="login" type="button">Iniciar sesion</button>
  `;
}

function initParticles() {
  const particles = document.querySelector('.particles');
  if (!particles) return;

  const fragment = document.createDocumentFragment();
  for (let index = 0; index < 30; index += 1) {
    const particle = document.createElement('span');
    particle.className = 'particle';
    particle.style.animationDelay = `${index * 0.8}s`;
    particle.style.left = `${Math.random() * 100}%`;
    fragment.appendChild(particle);
  }
  particles.appendChild(fragment);
}

function setModalTab(mode) {
  const nextMode = mode === 'register' ? 'register' : 'login';
  const tabs = document.querySelectorAll('[data-auth-tab]');
  const forms = document.querySelectorAll('[data-auth-form]');

  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.authTab === nextMode);
  });

  forms.forEach((form) => {
    form.hidden = form.dataset.authForm !== nextMode;
  });

  clearAuthErrors();
}

function clearAuthErrors() {
  document.querySelectorAll('[data-auth-error]').forEach((errorBox) => {
    errorBox.textContent = '';
  });
}

function openModal(mode = 'login') {
  const modal = document.getElementById('authModal');
  if (!modal) return;

  setModalTab(mode);
  modal.hidden = false;
  document.body.style.overflow = 'hidden';

  const input = mode === 'register'
    ? document.getElementById('registerUsername')
    : document.getElementById('loginEmail');
  window.setTimeout(() => input?.focus(), 50);
}

function closeModal() {
  const modal = document.getElementById('authModal');
  if (!modal) return;

  modal.hidden = true;
  document.body.style.overflow = '';
  clearAuthErrors();
}

function setAuthLoading(form, isLoading, loadingText, defaultText) {
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : defaultText;
}

function setFormError(form, message) {
  const errorBox = form.querySelector('[data-auth-error]');
  if (errorBox) errorBox.textContent = message;
}

function initAuth() {
  updateNavActions();

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-auth]');
    if (trigger) {
      event.preventDefault();
      openModal(trigger.getAttribute('data-auth') || 'login');
      return;
    }

    const tabTrigger = event.target.closest('[data-auth-tab]');
    if (tabTrigger) {
      setModalTab(tabTrigger.getAttribute('data-auth-tab'));
    }
  });

  document.querySelector('.auth-close')?.addEventListener('click', closeModal);

  document.getElementById('authModal')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeModal();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal();
      closeSocialHub();
    }
  });

  document.getElementById('loginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    clearAuthErrors();
    setAuthLoading(form, true, 'VERIFICANDO...', 'ENTRAR AL JUEGO');

    try {
      const data = await requestAuth('login', {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value,
      });
      saveSession(data.token, data.user);
      state.user = data.user;
      updateNavActions();
      closeModal();
      showToast(`Bienvenido, ${data.user?.username || 'jugador'}!`, 'success');
      state.social = loadSocialState();
      window.setTimeout(() => openSocialHub('progress'), 350);
    } catch (error) {
      setFormError(form, error.message);
    } finally {
      setAuthLoading(form, false, 'VERIFICANDO...', 'ENTRAR AL JUEGO');
    }
  });

  document.getElementById('registerForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    clearAuthErrors();
    setAuthLoading(form, true, 'CREANDO CUENTA...', 'CREAR CUENTA');

    try {
      const payload = {
        username: document.getElementById('registerUsername').value,
        email: document.getElementById('registerEmail').value,
        password: document.getElementById('registerPassword').value,
        confirmPassword: document.getElementById('registerConfirmPassword').value,
      };

      const data = await requestAuth('register', payload);
      saveSession(data.token, data.user);
      state.user = data.user;
      updateNavActions();
      closeModal();
      showToast(`Bienvenido, ${data.user?.username || 'jugador'}!`, 'success');
      state.social = loadSocialState();
      window.setTimeout(() => openSocialHub('progress'), 350);
    } catch (error) {
      setFormError(form, error.message);
    } finally {
      setAuthLoading(form, false, 'CREANDO CUENTA...', 'CREAR CUENTA');
    }
  });
}

function renderStars(rating) {
  const value = Number(rating) || 0;
  return '★'.repeat(value) + '☆'.repeat(Math.max(0, 5 - value));
}

function updateRatingButtons(rating) {
  const buttons = document.querySelectorAll('.star-rating button');
  buttons.forEach((button) => {
    const value = Number(button.dataset.rating);
    button.textContent = value <= rating ? '★' : '☆';
    button.setAttribute('aria-checked', String(value === rating));
  });
}

function initComments() {
  updateRatingButtons(state.selectedRating);

  document.querySelectorAll('.star-rating button').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedRating = Number(button.dataset.rating) || 5;
      updateRatingButtons(state.selectedRating);
    });
  });

  document.getElementById('commentForm')?.addEventListener('submit', (event) => {
    event.preventDefault();

    const nameInput = document.getElementById('commentName');
    const textInput = document.getElementById('commentText');
    const name = nameInput.value.trim();
    const text = textInput.value.trim();

    if (!name || !text) {
      showToast('Completa tu nombre y comentario.', 'error');
      return;
    }

    const card = document.createElement('article');
    card.className = 'comment-card';
    card.innerHTML = `
      <div class="comment-stars">${renderStars(state.selectedRating)}</div>
      <p class="comment-text"></p>
      <div class="comment-author">
        <div class="comment-avatar">${getInitials(name)}</div>
        <div class="comment-author-info">
          <div class="name"></div>
          <div class="date">Ahora</div>
        </div>
      </div>
    `;
    card.querySelector('.comment-text').textContent = text;
    card.querySelector('.name').textContent = name;

    document.getElementById('commentsGrid')?.prepend(card);
    event.currentTarget.reset();
    state.selectedRating = 5;
    updateRatingButtons(state.selectedRating);
    showToast('Comentario publicado localmente.', 'success');
  });
}

function initStatCounter() {
  const targets = [
    { id: 'cnt1', value: 150, decimals: 0 },
    { id: 'cnt2', value: 48, decimals: 0 },
    { id: 'cnt3', value: 24, decimals: 0 },
    { id: 'cnt4', value: 4.8, decimals: 1 },
  ];

  const elements = targets
    .map((target) => ({ ...target, el: document.getElementById(target.id) }))
    .filter((target) => target.el);

  if (!elements.length || !('IntersectionObserver' in window)) return;

  const animate = () => {
    const duration = 900;
    const startedAt = performance.now();

    function tick(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      elements.forEach(({ el, value, decimals }) => {
        const current = value * progress;
        el.textContent = current.toFixed(decimals);
      });

      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      animate();
      observer.disconnect();
    }
  }, { threshold: 0.35 });

  observer.observe(document.querySelector('.stats-bar'));
}


function getCurrentUsername() {
  const rawName = state.user?.username || state.user?.name || state.user?.email?.split('@')[0] || 'Jugador';
  return String(rawName).trim() || 'Jugador';
}

function getSocialStorageKey() {
  const userKey = state.user?.id || state.user?._id || state.user?.email || state.user?.username || 'local';
  return `${SOCIAL_STORAGE_PREFIX}_${String(userKey).toLowerCase().replace(/[^a-z0-9_-]/gi, '_')}`;
}

function createDefaultSocialState() {
  return {
    progress: {
      chapter: 7,
      totalChapters: 12,
      percent: 58,
      rank: 'Sobreviviente del Ala Norte',
      location: 'Ala Norte',
      missions: [
        { title: 'Encontrar la llave oxidada', description: 'Pista principal desbloqueada en el aula 204.', done: true },
        { title: 'Reconstruir 3 recuerdos', description: 'Falta 1 fragmento para cerrar el capítulo.', done: false },
        { title: 'Hablar con Aria', description: 'Disponible antes de entrar al laboratorio.', done: false },
      ],
      activities: [
        'Desbloqueaste el archivo: Voz en la radio.',
        'Completaste el final temporal: Eco del pasillo.',
        'Agregaste una teoría al foro: La puerta roja.',
      ],
    },
    stats: [
      { label: 'Horas jugadas', value: '18.4 h', caption: 'Tiempo total de campaña' },
      { label: 'Exploración', value: '63%', caption: 'Habitaciones revisadas' },
      { label: 'Finales vistos', value: '5/24', caption: 'Rutas desbloqueadas' },
      { label: 'Coleccionables', value: '31/80', caption: 'Recuerdos recuperados' },
      { label: 'Decisiones críticas', value: '42', caption: 'Elecciones con impacto' },
      { label: 'Racha diaria', value: '6 días', caption: 'Actividad consecutiva' },
    ],
    skills: [
      { label: 'Lógica', value: 82 },
      { label: 'Sigilo', value: 71 },
      { label: 'Memoria', value: 64 },
      { label: 'Intuición', value: 77 },
    ],
    forumPosts: [
      {
        id: 'thread-red-door',
        title: 'Teoría: la puerta roja no lleva al mismo pasillo dos veces',
        author: 'DarkVoid_99',
        message: 'Comparé tres partidas y el orden de los recuerdos cambia según la decisión del capítulo 4.',
        replies: 18,
        likes: 42,
        time: 'Hace 22 min',
      },
      {
        id: 'thread-aria-route',
        title: 'Ruta de Aria: ¿conviene confiar en ella desde el inicio?',
        author: 'MindHunter_X',
        message: 'Encontré una línea de diálogo nueva si guardas silencio en la enfermería.',
        replies: 11,
        likes: 25,
        time: 'Hace 1 h',
      },
      {
        id: 'thread-school-map',
        title: 'Mapa colaborativo del instituto: zonas bloqueadas',
        author: 'ShadowMind',
        message: 'Estoy marcando accesos secretos y habitaciones con recuerdos coleccionables.',
        replies: 33,
        likes: 58,
        time: 'Ayer',
      },
    ],
    friends: [
      { id: 'darkvoid_99', name: 'DarkVoid_99', status: 'online', level: 21, avatar: 'DV' },
      { id: 'mindhunter_x', name: 'MindHunter_X', status: 'online', level: 17, avatar: 'MH' },
      { id: 'shadowmind', name: 'ShadowMind', status: 'offline', level: 14, avatar: 'SM' },
    ],
    messages: {
      darkvoid_99: [
        { from: 'friend', text: '¿Ya viste el archivo oculto del aula 204?', time: '22:14' },
        { from: 'me', text: 'Sí, creo que cambia el final del capítulo 7.', time: '22:16' },
      ],
      mindhunter_x: [
        { from: 'friend', text: 'Estoy armando una teoría sobre Aria.', time: '19:40' },
      ],
      shadowmind: [
        { from: 'friend', text: 'Cuando vuelva online probamos co-op.', time: 'Ayer' },
      ],
    },
  };
}

function loadSocialState() {
  if (!state.user) return createDefaultSocialState();

  const key = getSocialStorageKey();
  const saved = localStorage.getItem(key);
  if (!saved) {
    const defaultState = createDefaultSocialState();
    localStorage.setItem(key, JSON.stringify(defaultState));
    return defaultState;
  }

  try {
    const parsed = JSON.parse(saved);
    const defaults = createDefaultSocialState();
    return {
      ...defaults,
      ...parsed,
      progress: { ...defaults.progress, ...(parsed.progress || {}) },
      stats: Array.isArray(parsed.stats) ? parsed.stats : defaults.stats,
      skills: Array.isArray(parsed.skills) ? parsed.skills : defaults.skills,
      forumPosts: Array.isArray(parsed.forumPosts) ? parsed.forumPosts : defaults.forumPosts,
      friends: Array.isArray(parsed.friends) ? parsed.friends : defaults.friends,
      messages: { ...defaults.messages, ...(parsed.messages || {}) },
    };
  } catch (_) {
    const defaultState = createDefaultSocialState();
    localStorage.setItem(key, JSON.stringify(defaultState));
    return defaultState;
  }
}

function saveSocialState() {
  if (!state.user || !state.social) return;
  localStorage.setItem(getSocialStorageKey(), JSON.stringify(state.social));
}

function openSocialHub(tab = 'progress') {
  if (!state.user) {
    showToast('Inicia sesión para entrar a la zona social.', 'info');
    openModal('login');
    return;
  }

  const hub = document.getElementById('socialHub');
  if (!hub) return;

  state.social = loadSocialState();
  if (!state.selectedFriendId && state.social.friends.length) {
    state.selectedFriendId = state.social.friends[0].id;
  }
  renderSocialHub();
  setSocialTab(tab);
  hub.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeSocialHub() {
  const hub = document.getElementById('socialHub');
  if (!hub) return;
  hub.hidden = true;
  document.body.style.overflow = '';
}

function setSocialTab(tab) {
  const nextTab = ['progress', 'stats', 'forum', 'friends'].includes(tab) ? tab : 'progress';
  state.activeSocialTab = nextTab;

  document.querySelectorAll('[data-social-tab]').forEach((button) => {
    const isActive = button.dataset.socialTab === nextTab;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  document.querySelectorAll('[data-social-panel]').forEach((panel) => {
    const isActive = panel.dataset.socialPanel === nextTab;
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
  });
}

function renderSocialHub() {
  if (!state.social) return;
  const username = getCurrentUsername();
  const progress = state.social.progress;

  const avatar = document.getElementById('socialAvatar');
  const usernameNode = document.getElementById('socialUsername');
  const rankNode = document.getElementById('socialRank');
  if (avatar) avatar.textContent = getInitials(username);
  if (usernameNode) usernameNode.textContent = username;
  if (rankNode) rankNode.textContent = `Rango: ${progress.rank}`;

  const progressChapter = document.getElementById('progressChapter');
  const campaignProgressBar = document.getElementById('campaignProgressBar');
  const campaignProgressText = document.getElementById('campaignProgressText');
  if (progressChapter) progressChapter.textContent = progress.chapter;
  if (campaignProgressBar) campaignProgressBar.style.width = `${progress.percent}%`;
  if (campaignProgressText) campaignProgressText.textContent = `${progress.percent}% completado`;

  renderMissions();
  renderActivities();
  renderSocialStats();
  renderForumPosts();
  renderFriends();
  renderChat();
}

function renderMissions() {
  const list = document.getElementById('missionList');
  if (!list || !state.social) return;
  list.innerHTML = '';

  state.social.progress.missions.forEach((mission) => {
    const item = document.createElement('div');
    item.className = `mission-item ${mission.done ? 'done' : ''}`;

    const marker = document.createElement('span');
    marker.className = 'mission-marker';
    marker.textContent = mission.done ? '✓' : '•';

    const body = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = mission.title;
    const desc = document.createElement('p');
    desc.textContent = mission.description;
    body.append(title, desc);

    item.append(marker, body);
    list.appendChild(item);
  });
}

function renderActivities() {
  const timeline = document.getElementById('activityTimeline');
  if (!timeline || !state.social) return;
  timeline.innerHTML = '';

  state.social.progress.activities.forEach((activity, index) => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    const dot = document.createElement('span');
    dot.className = 'timeline-dot';
    const text = document.createElement('p');
    text.textContent = activity;
    const time = document.createElement('small');
    time.textContent = index === 0 ? 'Ahora' : `Hace ${index + 1} h`;
    item.append(dot, text, time);
    timeline.appendChild(item);
  });
}

function renderSocialStats() {
  const grid = document.getElementById('socialStatsGrid');
  const skillGrid = document.getElementById('skillGrid');
  if (!grid || !skillGrid || !state.social) return;

  grid.innerHTML = '';
  state.social.stats.forEach((stat) => {
    const card = document.createElement('article');
    card.className = 'stat-social-card';

    const label = document.createElement('span');
    label.textContent = stat.label;
    const value = document.createElement('strong');
    value.textContent = stat.value;
    const caption = document.createElement('p');
    caption.textContent = stat.caption;
    card.append(label, value, caption);
    grid.appendChild(card);
  });

  skillGrid.innerHTML = '';
  state.social.skills.forEach((skill) => {
    const item = document.createElement('div');
    item.className = 'skill-item';
    item.innerHTML = `
      <div class="skill-label"><span></span><span>${skill.value}%</span></div>
      <div class="skill-bar"><div class="skill-fill" style="width:${skill.value}%"></div></div>
    `;
    item.querySelector('.skill-label span').textContent = skill.label;
    skillGrid.appendChild(item);
  });
}

function renderForumPosts() {
  const list = document.getElementById('forumList');
  if (!list || !state.social) return;
  list.innerHTML = '';

  state.social.forumPosts.forEach((post) => {
    const card = document.createElement('article');
    card.className = 'forum-card';

    const meta = document.createElement('div');
    meta.className = 'forum-meta';

    const avatar = document.createElement('div');
    avatar.className = 'comment-avatar';
    avatar.textContent = getInitials(post.author);

    const info = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = post.title;
    const details = document.createElement('span');
    details.textContent = `${post.author} · ${post.time}`;
    info.append(title, details);
    meta.append(avatar, info);

    const message = document.createElement('p');
    message.textContent = post.message;

    const actions = document.createElement('div');
    actions.className = 'forum-actions';
    actions.innerHTML = `<span>💬 ${post.replies} respuestas</span><span>▲ ${post.likes} votos</span>`;

    card.append(meta, message, actions);
    list.appendChild(card);
  });
}

function renderFriends() {
  const list = document.getElementById('friendsList');
  if (!list || !state.social) return;
  list.innerHTML = '';

  state.social.friends.forEach((friend) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `friend-row ${state.selectedFriendId === friend.id ? 'active' : ''}`;
    row.dataset.friendId = friend.id;

    const avatar = document.createElement('span');
    avatar.className = 'friend-avatar';
    avatar.textContent = friend.avatar || getInitials(friend.name);

    const info = document.createElement('span');
    info.className = 'friend-info';
    const name = document.createElement('strong');
    name.textContent = friend.name;
    const meta = document.createElement('small');
    meta.textContent = `Nivel ${friend.level} · ${friend.status === 'online' ? 'En línea' : 'Desconectado'}`;
    info.append(name, meta);

    const status = document.createElement('span');
    status.className = `friend-status ${friend.status}`;
    status.setAttribute('aria-label', friend.status === 'online' ? 'En línea' : 'Desconectado');

    row.append(avatar, info, status);
    list.appendChild(row);
  });
}

function renderChat() {
  const friend = state.social?.friends.find((item) => item.id === state.selectedFriendId) || state.social?.friends[0];
  const title = document.getElementById('chatFriendName');
  const status = document.getElementById('chatStatus');
  const feed = document.getElementById('chatFeed');
  const form = document.getElementById('chatForm');
  if (!title || !status || !feed || !form) return;

  if (!friend) {
    title.textContent = 'Sin amigos todavía';
    status.textContent = 'Agrega jugadores';
    feed.innerHTML = '<p class="empty-chat">Agrega un jugador para iniciar una conversación local.</p>';
    form.hidden = true;
    return;
  }

  state.selectedFriendId = friend.id;
  title.textContent = friend.name;
  status.textContent = friend.status === 'online' ? 'En línea' : 'Desconectado';
  form.hidden = false;
  feed.innerHTML = '';

  const messages = state.social.messages[friend.id] || [];
  messages.forEach((message) => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${message.from === 'me' ? 'me' : 'friend'}`;
    const text = document.createElement('p');
    text.textContent = message.text;
    const time = document.createElement('small');
    time.textContent = message.time;
    bubble.append(text, time);
    feed.appendChild(bubble);
  });

  if (!messages.length) {
    feed.innerHTML = '<p class="empty-chat">Todavía no hay mensajes con este jugador.</p>';
  }

  feed.scrollTop = feed.scrollHeight;
}

function initSocialHub() {
  if (state.user) {
    state.social = loadSocialState();
  }

  document.addEventListener('click', (event) => {
    const socialTrigger = event.target.closest('[data-social-open]');
    if (socialTrigger) {
      event.preventDefault();
      openSocialHub('progress');
      return;
    }

    const tabTrigger = event.target.closest('[data-social-tab]');
    if (tabTrigger) {
      setSocialTab(tabTrigger.dataset.socialTab);
      return;
    }

    const friendRow = event.target.closest('[data-friend-id]');
    if (friendRow) {
      state.selectedFriendId = friendRow.dataset.friendId;
      renderFriends();
      renderChat();
    }
  });

  document.getElementById('socialClose')?.addEventListener('click', closeSocialHub);
  document.getElementById('socialHub')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeSocialHub();
  });

  document.getElementById('forumForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!state.user) {
      openModal('login');
      return;
    }

    const titleInput = document.getElementById('forumTitle');
    const messageInput = document.getElementById('forumMessage');
    const title = titleInput.value.trim();
    const message = messageInput.value.trim();
    if (!title || !message) {
      showToast('Completa el título y el mensaje del hilo.', 'error');
      return;
    }

    state.social.forumPosts.unshift({
      id: `thread-${Date.now()}`,
      title,
      author: getCurrentUsername(),
      message,
      replies: 0,
      likes: 0,
      time: 'Ahora',
    });
    state.social.progress.activities.unshift(`Publicaste un hilo: ${title}`);
    state.social.progress.activities = state.social.progress.activities.slice(0, 5);
    saveSocialState();
    renderForumPosts();
    renderActivities();
    event.currentTarget.reset();
    showToast('Hilo publicado localmente.', 'success');
  });

  document.getElementById('friendForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('friendUsername');
    const name = input.value.trim();
    if (!name) return;

    const exists = state.social.friends.some((friend) => friend.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      showToast('Ese jugador ya está en tu lista.', 'info');
      return;
    }

    const id = name.toLowerCase().replace(/[^a-z0-9_-]/gi, '_') || `friend_${Date.now()}`;
    const friend = {
      id,
      name,
      status: 'online',
      level: Math.floor(Math.random() * 20) + 1,
      avatar: getInitials(name),
    };
    state.social.friends.unshift(friend);
    state.social.messages[id] = [
      { from: 'friend', text: 'Solicitud aceptada. ¿Listo para explorar?', time: 'Ahora' },
    ];
    state.selectedFriendId = id;
    saveSocialState();
    renderFriends();
    renderChat();
    input.value = '';
    showToast('Jugador agregado a amigos.', 'success');
  });

  document.getElementById('chatForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('chatMessage');
    const message = input.value.trim();
    if (!message || !state.selectedFriendId) return;

    const now = new Date();
    const time = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    if (!state.social.messages[state.selectedFriendId]) state.social.messages[state.selectedFriendId] = [];
    state.social.messages[state.selectedFriendId].push({ from: 'me', text: message, time });
    saveSocialState();
    input.value = '';
    renderChat();
    showToast('Mensaje guardado localmente.', 'success');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initAuth();
  initSocialHub();
  initComments();
  initStatCounter();
});
