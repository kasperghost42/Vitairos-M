import { shiftDay } from './insights.js';
import { absenceStreak, incomeData, incomeCsv, statusLabels as labels } from './professional-model.js';

const longDate = new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeZone: 'UTC' });
const shortDate = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const localDay = new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Santiago' });
const money = value => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
const today = () => localDay.format();
const format = (date, short = false) => (short ? shortDate : longDate).format(new Date(date + 'T12:00:00Z'));
const byId = id => document.getElementById(id);
const element = (tag, text = '', className) => { const item = document.createElement(tag); item.textContent = text; if (className) item.className = className; return item; };
const fixtures = [
  { id: 'va', name: 'Valentina Araya', age: 29, hour: '08:30', offset: 0, state: 'pending', emotion: '😐 Neutral', goals: ['Organizar una rutina personal', 'Preparar preguntas entre sesiones'], context: 'Compartió que le gustaría revisar cómo organizar su rutina entre sesiones.' },
  { id: 'dn', name: 'Diego Navarro', age: 32, hour: '09:30', offset: 0, state: 'confirmed' },
  { id: 'im', name: 'Isabel Molina', age: 35, hour: '10:15', offset: 0, state: 'confirmed', emotion: '😊 Feliz', goals: ['Revisar los objetivos acordados', 'Reconocer los avances personales'], context: 'Pidió retomar los objetivos acordados en la última conversación.' },
  { id: 'mt', name: 'Martín Torres', age: 27, hour: '11:45', offset: 0, state: 'pending' },
  { id: 'cp', name: 'Clara Paredes', age: 40, hour: '15:00', offset: 0, state: 'confirmed' },
  { id: 'fr', name: 'Francisca Rojas', age: 24, hour: '10:00', offset: 2, state: 'confirmed' },
  { id: 'al', name: 'Andrés Lara', age: 38, hour: '13:00', offset: 2, state: 'pending' },
  { id: 'mj', name: 'Mariana Jara', age: 31, hour: '11:00', offset: 4, state: 'confirmed' },
];
const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const hours = ['08:30', '09:30', '10:30', '11:30', '15:00', '16:00', '17:00'];
const validSlots = new Set(days.flatMap(name => hours.map(hour => name + '-' + hour)));
const storageKey = 'vitairos-m-demo-v1';
const state = { seedDay: today(), statuses: {}, slots: [], notes: {}, sessions: [], license: { number: 'DEMO-CM-2026', expiry: shiftDay(today(), 10) } };
const isDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + 'T12:00:00Z'));
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (isDate(saved?.seedDay)) state.seedDay = saved.seedDay;
  for (const { id } of fixtures) {
    if (Object.hasOwn(labels, saved?.statuses?.[id])) state.statuses[id] = saved.statuses[id];
    if (typeof saved?.notes?.[id] === 'string') state.notes[id] = saved.notes[id].slice(0, 1200);
  }
  if (Array.isArray(saved?.slots)) state.slots = [...new Set(saved.slots.filter(slot => validSlots.has(slot)))];
  if (Array.isArray(saved?.sessions)) state.sessions = saved.sessions.filter(item => fixtures.some(person => person.id === item?.patientId) && isDate(item.date) && typeof item.note === 'string').map(item => ({ ...item, note: item.note.slice(0, 1200) }));
  if (isDate(saved?.license?.expiry) && typeof saved.license.number === 'string') state.license = { number: saved.license.number.slice(0, 40), expiry: saved.license.expiry };
} catch { console.warn('No se pudo recuperar el estado local de la demostración.'); }
const appointments = fixtures.map(item => ({ ...item, date: shiftDay(state.seedDay, item.offset) }));
let period = 'today', selectedPatient, pendingCancel, activeSession, toastTimer;
const dialogOpeners = new WeakMap();
function showDialog(id) { const dialog = byId(id); dialogOpeners.set(dialog, document.activeElement); dialog.showModal(); }
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', () => {
  if (document.querySelector('dialog[open]')) return;
  const opener = dialogOpeners.get(dialog);
  const canRestore = opener?.isConnected && opener.getClientRects().length && !opener.closest('dialog:not([open])');
  (canRestore ? opener : byId('title')).focus({ preventScroll: true });
}));
function announce(message) { byId('toast').textContent = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => { byId('toast').textContent = ''; }, 4500); }
function save(message) { try { localStorage.setItem(storageKey, JSON.stringify(state)); if (message) announce(message); } catch { announce('Cambio aplicado en esta pestaña. El navegador no permitió guardarlo.'); } }
const statusOf = item => state.statuses[item.id] ?? item.state;
function actionButton(title, action, item, className = 'row-button') {
  const button = element('button', title, className); button.type = 'button'; button.setAttribute('aria-label', title + ': ' + item.name); button.addEventListener('click', () => action(item)); return button;
}
function actionsFor(item) {
  const actions = element('div', '', 'row-actions'), status = statusOf(item);
  if (status === 'pending') actions.append(actionButton('Confirmar', person => { state.statuses[person.id] = 'confirmed'; save('Cita de prueba confirmada.'); render(); }, item, 'row-button accept'));
  if (status === 'confirmed' || status === 'pending') actions.append(actionButton('Cancelar', requestCancellation, item, 'row-button decline'));
  actions.append(actionButton('Abrir ficha', openProfile, item)); return actions;
}
function render() {
  const active = appointments.filter(item => ['pending', 'confirmed'].includes(statusOf(item)) && item.date >= today() && item.date <= shiftDay(today(), 6));
  const todayItems = appointments.filter(item => item.date === today());
  byId('today-label').textContent = format(today());
  byId('active-count').textContent = new Set(active.map(item => item.id)).size;
  byId('today-count').textContent = todayItems.filter(item => statusOf(item) !== 'canceled').length;
  byId('confirmed-count').textContent = todayItems.filter(item => statusOf(item) === 'confirmed').length + ' confirmadas';
  byId('availability-count').textContent = state.slots.length;
  byId('attendance-streak').textContent = absenceStreak(state.seedDay, today(), state.sessions) + ' días';
  byId('availability-alert').textContent = state.slots.length ? `${state.slots.length} franjas cargadas. Puedes revisar o ajustar tus horarios.` : 'Aún no has cargado horarios.';
  const remaining = Math.round((Date.parse(state.license.expiry) - Date.parse(today())) / 86400000);
  byId('license-notice').className = 'notice ' + (remaining > 14 ? 'mint' : 'gold');
  byId('license-alert-title').textContent = remaining > 14 ? 'Credencial de prueba al día' : 'Credencial profesional';
  byId('license-alert').textContent = remaining < 0 ? 'La credencial de prueba está vencida.' : remaining === 0 ? 'La vigencia de prueba termina hoy.' : `La vigencia de prueba termina en ${remaining} días.`;
  byId('license-date').textContent = format(state.license.expiry);
  byId('date-heading').textContent = period === 'today' ? 'Hora' : 'Fecha y hora';
  const shown = period === 'today' ? todayItems : appointments.filter(item => item.date >= today() && item.date <= shiftDay(today(), 6));
  byId('appointments').replaceChildren(...shown.map(item => {
    const row = element('tr'), person = element('th'), name = element('span', '', 'patient'); person.scope = 'row';
    const avatar = element('span', item.name.split(' ').map(word => word[0]).join(''), 'avatar'); avatar.setAttribute('aria-hidden', 'true'); name.append(avatar, document.createTextNode(item.name)); person.append(name);
    const status = element('td'); status.append(element('span', labels[statusOf(item)], 'status ' + statusOf(item)));
    const actions = element('td'); actions.append(actionsFor(item));
    row.append(person, element('td', period === 'today' ? item.hour : format(item.date, true) + ' · ' + item.hour, 'time'), status, actions); return row;
  }));
  if (!shown.length) { const row = element('tr'), cell = element('td', 'No hay citas en este período.'); cell.colSpan = 4; row.append(cell); byId('appointments').append(row); }
  renderFullAgenda(); renderIncome();
}
function editAvailability() {
  byId('slots').replaceChildren(...days.map(name => {
    const group = element('fieldset', '', 'slot-day'); group.append(element('legend', name));
    for (const hour of hours) { const label = element('label', '', 'slot'), input = document.createElement('input'); input.type = 'checkbox'; input.value = name + '-' + hour; input.checked = state.slots.includes(input.value); input.setAttribute('aria-label', name + ' ' + hour); label.append(input, element('span', hour)); group.append(label); } return group;
  }));
}
function openProfile(item) {
  if (byId('full-agenda').open) byId('full-agenda').close(); selectedPatient = item;
  byId('profile-title').textContent = 'Ficha: ' + item.name;
  byId('profile-age').textContent = item.age + ' años';
  byId('profile-emotion').textContent = item.context ? item.emotion : 'No compartido';
  byId('profile-date').textContent = format(item.date) + ' · ' + item.hour;
  byId('profile-state').textContent = labels[statusOf(item)];
  byId('profile-context').textContent = item.context ?? 'Esta persona no ha compartido contexto en la demostración.';
  byId('profile-goals').replaceChildren(...(item.context ? item.goals : ['Sin objetivos compartidos.']).map(text => element('li', text)));
  byId('profile-note').value = state.notes[item.id] ?? '';
  byId('start-session').disabled = statusOf(item) !== 'confirmed' || item.date > today();
  byId('start-session').textContent = statusOf(item) === 'completed' ? 'Sesión realizada' : statusOf(item) === 'pending' ? 'Confirma la cita para iniciar' : item.date > today() ? 'Disponible el ' + format(item.date, true) : 'Iniciar sesión de prueba';
  byId('profile-cancel').hidden = !['pending', 'confirmed'].includes(statusOf(item));
  byId('patient-history').hidden = true; byId('show-patient-history').setAttribute('aria-expanded', 'false'); renderPatientHistory();
  if (!byId('profile').open) showDialog('profile');
}
function renderPatientHistory() {
  if (!selectedPatient) return;
  const history = [...state.sessions.filter(item => item.patientId === selectedPatient.id), { date: shiftDay(state.seedDay, -7), note: 'Sesión ficticia: revisión de los objetivos personales.' }, { date: shiftDay(state.seedDay, -14), note: 'Sesión ficticia: primera conversación de este ejemplo.' }].sort((a, b) => b.date.localeCompare(a.date));
  byId('patient-history-list').replaceChildren(...history.map(item => { const row = element('li', '', 'personal-note'); row.append(element('strong', format(item.date)), element('p', item.note)); return row; }));
}
function requestCancellation(item) {
  if (!item || !['pending', 'confirmed'].includes(statusOf(item))) return;
  if (byId('profile').open) byId('profile').close(); if (byId('full-agenda').open) byId('full-agenda').close(); pendingCancel = item;
  byId('cancel-message').textContent = `¿Quieres cancelar la cita de prueba de ${item.name}, el ${format(item.date)} a las ${item.hour}?`; showDialog('cancel');
}
function renderFullAgenda() {
  const query = byId('agenda-search').value.trim().toLocaleLowerCase('es'), status = byId('agenda-status').value;
  const shown = appointments.filter(item => item.name.toLocaleLowerCase('es').includes(query) && (status === 'all' || statusOf(item) === status));
  byId('full-agenda-list').replaceChildren(...shown.map(item => { const row = element('li', '', 'full-agenda-entry'), info = element('div'); info.append(element('h3', item.name), element('p', format(item.date) + ' · ' + item.hour), element('span', labels[statusOf(item)], 'status ' + statusOf(item))); row.append(info, actionsFor(item)); return row; }));
  byId('agenda-no-results').hidden = shown.length > 0;
}
function statRows(target, values) { byId(target).replaceChildren(...values.map(([label, value]) => { const row = element('div'); row.append(element('dt', label), element('dd', money(value))); return row; })); }
function renderIncome() {
  const data = incomeData(state.seedDay, today(), state.sessions, appointments, state.statuses), max = Math.max(150000, ...data.series.map(item => item.amount));
  const points = data.series.map((item, i) => [64 + i * 64, 224 - item.amount / max * 184]);
  const path = points.map(([x, y], i) => (i ? 'L' : 'M') + x + ',' + y).join(' '), goalY = 224 - 90000 / max * 184;
  const ticks = [0, .5, 1].map(ratio => `<line x1="64" x2="768" y1="${224 - ratio * 184}" y2="${224 - ratio * 184}" stroke="#dcebed"/><text x="53" y="${229 - ratio * 184}" text-anchor="end">${Math.round(max * ratio / 1000)} mil</text>`).join('');
  // SVG markup contains only numeric calculations and validated ISO dates, never notes or names.
  byId('professional-income-chart').innerHTML = `<svg viewBox="0 0 800 270" role="img" aria-labelledby="income-chart-title income-chart-description"><title id="income-chart-title">Ganancias simuladas de los últimos 12 días</title><desc id="income-chart-description">Montos diarios en pesos chilenos y línea de objetivo de 90 mil pesos. Los valores están disponibles en la tabla de datos.</desc><defs><linearGradient id="income-wash" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#56b8c6" stop-opacity=".35"/><stop offset="1" stop-color="#56b8c6" stop-opacity=".04"/></linearGradient></defs>${ticks}<path d="${path} L768,224 L64,224 Z" fill="url(#income-wash)"/><line x1="64" x2="768" y1="${goalY}" y2="${goalY}" stroke="#398e80" stroke-dasharray="6 6"/><path d="${path}" fill="none" stroke="#178ba2" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${points.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4" fill="#178ba2"><title>${data.series[i].date}: ${data.series[i].amount} CLP</title></circle>`).join('')}${data.series.filter((_, i) => i % 2 === 0 || i === 11).map(item => `<text x="${64 + data.series.indexOf(item) * 64}" y="252" text-anchor="middle">${item.date.slice(8)}/${item.date.slice(5, 7)}</text>`).join('')}</svg>`;
  const values = [['Hoy', data.today], ['Este mes', data.month], ['Pendiente', data.pending]]; statRows('income-totals', values); statRows('earnings-details', values);
  byId('income-data').replaceChildren(...data.series.map(item => { const row = element('tr'); row.append(element('td', format(item.date, true)), element('td', money(item.amount))); return row; }));
}
document.querySelectorAll('[data-dialog]').forEach(button => button.addEventListener('click', () => {
  const id = button.dataset.dialog;
  if (id === 'availability') editAvailability();
  if (id === 'license') { byId('license-number').value = state.license.number; byId('license-expiry').value = state.license.expiry; }
  if (id === 'full-agenda') { byId('agenda-search').value = ''; byId('agenda-status').value = 'all'; renderFullAgenda(); }
  showDialog(id);
}));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
document.querySelectorAll('[data-period]').forEach(button => button.addEventListener('click', () => { period = button.dataset.period; document.querySelectorAll('[data-period]').forEach(option => option.setAttribute('aria-pressed', String(option === button))); render(); }));
byId('save-slots').addEventListener('click', () => { state.slots = Array.from(byId('slots').querySelectorAll('input:checked'), input => input.value); save('Disponibilidad guardada.'); byId('availability').close(); render(); });
byId('license-form').addEventListener('submit', event => { event.preventDefault(); const number = byId('license-number').value.trim(), expiry = byId('license-expiry').value; if (!number || number.length > 40 || !isDate(expiry)) return; state.license = { number, expiry }; save('Credencial de prueba actualizada.'); byId('license').close(); render(); });
byId('confirm-cancel').addEventListener('click', () => { if (!pendingCancel) return; state.statuses[pendingCancel.id] = 'canceled'; byId('cancel').close(); save('Cita de prueba cancelada.'); render(); pendingCancel = null; });
byId('profile-cancel').addEventListener('click', () => requestCancellation(selectedPatient));
byId('profile-note-form').addEventListener('submit', event => { event.preventDefault(); if (!selectedPatient) return; state.notes[selectedPatient.id] = byId('profile-note').value.trim().slice(0, 1200); save('Nota de prueba guardada.'); });
byId('show-patient-history').addEventListener('click', () => { const section = byId('patient-history'); section.hidden = !section.hidden; byId('show-patient-history').setAttribute('aria-expanded', String(!section.hidden)); });
byId('start-session').addEventListener('click', () => { if (!selectedPatient || statusOf(selectedPatient) !== 'confirmed' || selectedPatient.date > today()) return; activeSession = selectedPatient; byId('profile').close(); byId('session-person').textContent = activeSession.name + ' · Demostración'; byId('session-note').value = ''; showDialog('session'); });
byId('session-form').addEventListener('submit', event => { event.preventDefault(); const note = byId('session-note').value.trim(); if (!activeSession || statusOf(activeSession) !== 'confirmed' || !note || note.length > 1200) return; state.sessions.push({ id: crypto.randomUUID(), patientId: activeSession.id, date: today(), note }); state.statuses[activeSession.id] = 'completed'; save('Sesión de prueba guardada en el historial.'); byId('session').close(); render(); activeSession = null; });
byId('agenda-search').addEventListener('input', renderFullAgenda);
byId('agenda-status').addEventListener('change', renderFullAgenda);
byId('download-income').addEventListener('click', () => { const data = incomeData(state.seedDay, today(), state.sessions, appointments, state.statuses), url = URL.createObjectURL(new Blob([incomeCsv(data.series)], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'vitairos-ganancias-demo-' + today() + '.csv'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
save(); render();
