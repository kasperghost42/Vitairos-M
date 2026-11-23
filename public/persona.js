import { initVoice } from './voice.js';
import { initHome } from './home.js';

const key = 'vitairos-m-persona-v1';
const byId = (id) => document.getElementById(id);
const dayFormat = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: 'America/Santiago' });
const localDay = new Intl.DateTimeFormat('sv-SE', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Santiago',
});
const scores = ['Muy difícil', 'Difícil', 'Intermedio', 'Bueno', 'Muy bueno'];
const emotions = [
  { label: 'Muy triste', emoji: '😢' },
  { label: 'Triste', emoji: '😔' },
  { label: 'Neutral', emoji: '😐' },
  { label: 'Contento', emoji: '😌' },
  { label: 'Feliz', emoji: '😊' },
  { label: 'Muy feliz', emoji: '😄' },
];

function emotionFor(value) {
  return emotions[Math.min(5, Math.floor((value + 10) / 20))];
}

function renderEmotion() {
  const input = byId('emotion-value');
  const value = Number(input.value);
  const emotion = emotionFor(value);
  byId('emotion-emoji').textContent = emotion.emoji;
  byId('emotion-result').textContent = `${emotion.label} (${value})`;
  input.setAttribute('aria-valuetext', `${emotion.label}, ${value} de 100`);
  document.querySelectorAll('[data-emotion-value]').forEach((button) => {
    button.setAttribute('aria-pressed', String(emotionFor(Number(button.dataset.emotionValue)) === emotion));
  });
}
const views = {
  inicio: ['Mi espacio', 'Registra cómo te fue y retoma tus conversaciones.'],
  progreso: ['Mi progreso', 'Revisa tus registros de bienestar a lo largo del tiempo.'],
  chat: ['Chatbot', 'Ordena una idea o prepara una pregunta para tu próxima sesión.'],
  historial: ['Historial', 'Vuelve a una conversación guardada.'],
  contacto: ['Contactar profesionales', 'Consulta las opciones de acceso y orientación profesional.'],
  consejos: ['Consejos diarios', 'Pequeñas acciones para hacer espacio para ti.'],
  agenda: ['Mi agenda', 'Organiza tus citas de prueba en este navegador.'],
  ficha: ['Mi ficha', 'Tus registros, notas personales y actividad en un solo lugar.'],
  logros: ['Mis logros', 'Reconoce cada pequeño paso, a tu propio ritmo.'],
};

const state = { checkins: [], conversations: [], activeId: null, completedTips: [], appointments: [], summaryCopied: false };
let config;
let waiting = false;
let toastTimer;
let currentView;

function announce(text) {
  byId('personal-status').textContent = text;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { byId('personal-status').textContent = ''; }, 4500);
}

try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (Array.isArray(saved?.checkins)) state.checkins = saved.checkins;
  if (Array.isArray(saved?.conversations)) state.conversations = saved.conversations;
  if (typeof saved?.activeId === 'string') state.activeId = saved.activeId;
  if (Array.isArray(saved?.completedTips)) state.completedTips = saved.completedTips.filter(item => typeof item === 'string');
  if (Array.isArray(saved?.appointments)) state.appointments = saved.appointments.filter(item => item && typeof item.date === 'string' && typeof item.time === 'string' && typeof item.professional === 'string');
  state.summaryCopied = saved?.summaryCopied === true;
} catch {
  announce('El navegador no pudo recuperar los datos de prueba.');
}

function persist(message) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
    if (message) announce(message);
  } catch {
    announce('El cambio está en memoria. El navegador no pudo guardarlo.');
  }
}

function activeChat() {
  return state.conversations.find((item) => item.id === state.activeId);
}

function element(tag, text, className) {
  const item = document.createElement(tag);
  item.textContent = text;
  if (className) item.className = className;
  return item;
}

function formatDay(date) {
  return dayFormat.format(new Date(date + 'T12:00:00Z'));
}

function renderProgress() {
  const entries = [...state.checkins].sort((a, b) => b.date.localeCompare(a.date));
  const today = localDay.format();
  const selection = entries.find((item) => item.date === today);
  byId('emotion-value').value = selection?.emotionValue ?? (selection ? [0, 20, 40, 80, 100][selection.score - 1] : 50);
  byId('emotion-comment').value = selection?.comment ?? '';
  renderEmotion();
  byId('checkin-count').textContent = entries.length;
  byId('last-checkin').textContent = entries.length ? 'Último: ' + formatDay(entries[0].date) : 'Sin registros todavía';
  byId('checkin-list').replaceChildren(...entries.slice(0, 7).map(({ date, score, emotionValue, comment }) => {
    const row = element('li', '', 'checkin-row');
    const hasEmotion = Number.isInteger(emotionValue);
    const emotion = hasEmotion ? emotionFor(emotionValue) : null;
    const value = element('strong', hasEmotion ? `${emotion.emoji} ${emotion.label} · ${emotionValue}/100` : score + '/5 · ' + scores[score - 1]);
    const bar = document.createElement('progress');
    bar.max = hasEmotion ? 100 : 5;
    bar.value = hasEmotion ? emotionValue : score;
    bar.setAttribute('aria-label', 'Valoración del ' + formatDay(date));
    row.append(element('span', formatDay(date)), value, bar);
    if (comment) row.append(element('p', comment, 'checkin-comment'));
    return row;
  }));
  byId('empty-progress').hidden = entries.length > 0;
  home.render();
}

function renderChat() {
  const conversation = activeChat();
  byId('chat-title').textContent = conversation?.title ?? 'Conversación nueva';
  const messages = byId('messages');
  messages.replaceChildren(...(conversation?.messages ?? []).map(({ role, content }) => {
    const row = element('li', '', role === 'user' ? 'chat-user' : 'chat-assistant');
    row.append(element('strong', role === 'user' ? 'Tú' : 'Asistente'), element('p', content));
    return row;
  }));
  messages.scrollTop = messages.scrollHeight;
  byId('empty-chat').hidden = Boolean(conversation);
}

function renderHistory() {
  const conversations = [...state.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  byId('conversation-count').textContent = conversations.length;
  byId('empty-history').hidden = conversations.length > 0;
  byId('history-list').replaceChildren(...conversations.map((conversation) => {
    const row = element('li', '', 'history-row');
    const info = element('div', '');
    info.append(element('strong', conversation.title), element('small', dayFormat.format(new Date(conversation.updatedAt))));
    const actions = element('div', '', 'entry-actions');
    const resume = element('button', 'Continuar', 'button secondary');
    resume.type = 'button';
    resume.setAttribute('aria-label', 'Continuar: ' + conversation.title);
    resume.addEventListener('click', () => {
      if (waiting) return announce('Espera la respuesta antes de cambiar de conversación.');
      if (state.activeId !== conversation.id) byId('message').value = '';
      state.activeId = conversation.id;
      persist();
      byId('chat-error').hidden = true;
      renderChat();
      location.hash = 'chat';
    });
    const remove = element('button', 'Eliminar', 'button secondary');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Eliminar: ' + conversation.title);
    remove.addEventListener('click', () => {
      if (waiting) return announce('Espera la respuesta antes de eliminar una conversación.');
      const dialog = byId('delete-chat');
      dialog.returnValue = 'keep';
      dialog.addEventListener('close', () => {
        if (dialog.returnValue !== 'delete') return;
        state.conversations = state.conversations.filter(({ id }) => id !== conversation.id);
        if (state.activeId === conversation.id) {
          state.activeId = null;
          byId('message').value = '';
          byId('chat-error').hidden = true;
        }
        persist('Conversación eliminada.');
        renderHistory();
        renderChat();
        byId('view-title').focus();
      }, { once: true });
      dialog.showModal();
    });
    actions.append(resume, remove);
    row.append(info, actions);
    return row;
  }));
  home.render();
}

function showView(moveFocus = false) {
  const name = location.hash.slice(1);
  const view = Object.hasOwn(views, name) ? name : 'inicio';
  if (currentView === view) return;
  home.render();
  if (currentView === 'chat') voice.cancel();
  currentView = view;
  document.querySelectorAll('[data-view]').forEach((section) => {
    section.hidden = section.dataset.view !== view;
  });
  document.querySelectorAll('[data-view-link]').forEach((link) => {
    if (link.dataset.viewLink === view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const heading = byId('view-title');
  heading.textContent = views[view][0];
  byId('view-description').textContent = views[view][1];
  if (moveFocus && name !== 'principal') {
    heading.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

function renderControls() {
  const busy = waiting || voice.busy;
  byId('message').disabled = busy;
  byId('new-chat').disabled = busy;
  byId('send-message').disabled = busy || !config?.ready;
  byId('send-message').textContent = waiting ? 'Esperando respuesta…' : 'Enviar mensaje';
  byId('external-consent').disabled = busy;
  voice.lock(waiting);
}

byId('emotion-value').addEventListener('input', renderEmotion);
document.querySelectorAll('[data-emotion-value]').forEach((button) => {
  button.addEventListener('click', () => {
    byId('emotion-value').value = button.dataset.emotionValue;
    renderEmotion();
  });
});

byId('checkin-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const emotionValue = Number(data.get('emotionValue'));
  if (!Number.isInteger(emotionValue) || emotionValue < 0 || emotionValue > 100) return;
  const comment = String(data.get('comment') ?? '').trim().slice(0, 800);
  const score = Math.round(emotionValue / 25) + 1;
  const date = localDay.format();
  const prior = state.checkins.find((entry) => entry.date === date);
  if (prior) Object.assign(prior, { score, emotionValue, comment });
  else state.checkins.push({ date, score, emotionValue, comment });
  persist('Registro del día guardado.');
  renderProgress();
});

byId('new-chat').addEventListener('click', () => {
  state.activeId = null;
  byId('message').value = '';
  byId('external-consent').checked = false;
  byId('chat-error').hidden = true;
  persist();
  renderChat();
  byId('message').focus();
});

byId('chat-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (waiting || voice.busy || !config?.ready) return;
  const input = byId('message');
  const content = input.value.trim();
  if (!content || content.length > input.maxLength) {
    byId('chat-error').textContent = content
      ? 'Acorta el mensaje a 800 caracteres antes de enviarlo.'
      : 'Escribe un mensaje antes de enviarlo.';
    byId('chat-error').hidden = false;
    input.focus();
    return;
  }
  const externalConsent = byId('external-consent').checked;
  const previous = activeChat();
  const message = { role: 'user', content };
  byId('chat-error').hidden = true;
  waiting = true;
  renderControls();
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ externalConsent, messages: [...(previous?.messages.slice(-8) ?? []), message] }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'El chatbot no pudo responder.');
    const updatedAt = new Date().toISOString();
    const conversation = previous ?? {
      id: crypto.randomUUID(),
      title: content.length > 55 ? content.slice(0, 54) + '…' : content,
      messages: [],
    };
    conversation.updatedAt = updatedAt;
    conversation.messages.push(message, { role: 'assistant', content: result.reply });
    if (!previous) state.conversations.push(conversation);
    state.activeId = conversation.id;
    persist();
    input.value = '';
    renderChat();
    renderHistory();
  } catch (error) {
    byId('chat-error').textContent = error instanceof TypeError ? 'No se pudo conectar con el servidor de prueba. Intenta nuevamente.' : error.message;
    byId('chat-error').hidden = false;
  } finally {
    waiting = false;
    byId('external-consent').checked = false;
    renderControls();
    if (currentView === 'chat') input.focus();
  }
});

async function loadChatConfig() {
  try {
    const response = await fetch('/api/chat/config', { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo leer la configuración.');
    config = await response.json();
    const signIn = byId('chat-sign-in');
    if (config.signInPath) {
      signIn.href = config.signInPath;
      signIn.hidden = false;
    }
    voice.setup(config.voiceReady);
    const consent = byId('external-consent');
    byId('consent-label').hidden = !config.external || !config.ready;
    consent.required = config.external && config.ready;
    byId('provider-name').textContent = config.label;
    byId('chat-mode').textContent = !config.ready
      ? 'El proveedor requiere configuración en el servidor.'
      : config.external
        ? 'Proveedor activo: ' + config.label + '.'
        : 'Demostración local con respuestas de ejemplo.';
  } catch {
    byId('chat-mode').textContent = 'No se pudo cargar el chatbot. Recarga la página para intentar nuevamente.';
  }
  renderControls();
}

const voice = initVoice({ message: byId('message'), controlsChanged: renderControls });
const home = initHome({ state, byId, element, persist, announce, localDay, formatDay, emotionFor, scores });
window.addEventListener('pagehide', () => voice.cancel());
window.addEventListener('hashchange', () => showView(true));
renderProgress();
renderChat();
renderHistory();
showView();
loadChatConfig();
