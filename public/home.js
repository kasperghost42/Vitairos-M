import { achievements, getInsights } from './insights.js';

const tips = [
  ['Una pausa para ti', 'Aparta unos minutos de la pantalla y dedica ese momento a algo que disfrutes.'],
  ['Un espacio más amable', 'Ordena un rincón pequeño de tu espacio. No hace falta resolverlo todo hoy.'],
  ['Reconoce un pequeño paso', 'Escribe algo que hayas podido hacer hoy, por pequeño que parezca.'],
  ['Haz espacio en tu día', 'Elige una tarea que pueda esperar y deja un momento libre para ti.'],
  ['Un momento de conexión', 'Si te apetece, dedica un rato a conversar con alguien de confianza.'],
  ['Algo que disfrutas', 'Reserva unos minutos para una canción, una lectura o una actividad que te guste.'],
  ['Prepara tu próxima conversación', 'Anota una pregunta o idea que te gustaría conversar con un profesional.'],
];

export function initHome({ state, byId, element, persist, announce, localDay, formatDay, emotionFor, scores }) {
  let category = 'general';
  const today = () => localDay.format();
  const now = () => today() + 'T' + new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format();
  const dailyTips = () => {
    const index = Math.floor(new Date(today() + 'T12:00:00Z').getTime() / 86400000) % tips.length;
    return [0, 1].map(offset => ({ id: today() + ':' + ((index + offset) % tips.length), content: tips[(index + offset) % tips.length] }));
  };
  function stats(target, values) {
    byId(target).replaceChildren(...values.map(([title, value]) => {
      const row = element('div', '');
      row.append(element('dt', title), element('dd', String(value)));
      return row;
    }));
  }
  function render() {
    const info = getInsights(state, today());
    const current = state.checkins.find(item => item.date === today());
    byId('home-emotion').textContent = current
      ? `Hoy: ${Number.isInteger(current.emotionValue) ? emotionFor(current.emotionValue).emoji + ' ' + emotionFor(current.emotionValue).label : scores[current.score - 1]}. Puedes actualizar tu registro cuando quieras.`
      : 'Tómate un momento para reconocer cómo te sientes.';
    byId('home-tip').textContent = dailyTips()[0].content[1];
    const next = [...state.appointments].filter(item => !item.attended && item.date + 'T' + item.time >= now()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
    byId('home-appointment').textContent = next ? `${formatDay(next.date)} · ${next.time} · ${next.professional} · ${next.mode}` : 'Sin citas próximas anotadas.';
    const attended = state.appointments.filter(item => item.attended);
    const lastSession = [...attended].sort((a, b) => b.date.localeCompare(a.date))[0];
    const values = [['Citas marcadas como asistidas', attended.length], ['Notas personales', info.notes], ['Última cita asistida', lastSession ? formatDay(lastSession.date) : 'Sin citas asistidas']];
    stats('home-stats', values);
    stats('personal-stats', [['Registros emocionales', info.records], ['Racha actual', info.streak + (info.streak === 1 ? ' día' : ' días')], ['Conversaciones guardadas', state.conversations.length], ...values]);
    byId('personal-notes').replaceChildren(...[...state.checkins].filter(item => item.comment?.trim()).sort((a, b) => b.date.localeCompare(a.date)).map(item => {
      const row = element('li', '', 'personal-note');
      row.append(element('strong', formatDay(item.date)), element('p', item.comment));
      return row;
    }));
    byId('empty-notes').hidden = info.notes > 0;
    byId('home-achievements').textContent = info.earned.length ? `${info.earned.length} de ${achievements.length} logros desbloqueados · Nivel ${info.level} · ${info.xp} XP` : 'Aún no tienes logros. Registra tu emoción para dar el primer paso.';
    byId('home-trophies').replaceChildren(...info.earned.slice(0, 4).map(item => {
      const badge = element('span', item.icon);
      badge.setAttribute('role', 'img');
      badge.setAttribute('aria-label', item.title);
      badge.title = item.title;
      return badge;
    }));
    renderTips(info);
    renderAppointments();
    renderAchievements(info);
  }
  function renderTips(info) {
    byId('daily-tips').replaceChildren(...dailyTips().map(({ id, content }) => {
      const done = state.completedTips.includes(id);
      const card = element('article', '', 'card pane daily-tip');
      const button = element('button', done ? 'Completado hoy' : 'Marcar como hecho', 'button ' + (done ? 'secondary' : 'primary'));
      button.type = 'button';
      button.disabled = done;
      button.addEventListener('click', () => {
        if (state.completedTips.includes(id)) return;
        if (!id.startsWith(today() + ':')) { render(); return announce('Ya comenzó un nuevo día. Actualizamos tus consejos.'); }
        state.completedTips.push(id);
        persist('Consejo completado. Un pequeño paso más.');
        render();
      });
      card.append(element('span', '☀', 'home-card-icon gold'), element('h2', content[0]), element('p', content[1]), button);
      return card;
    }));
    byId('tips-summary').textContent = `${info.tips} consejos completados en total · ${info.weekTips} en los últimos 7 días.`;
  }
  function renderAppointments() {
    byId('empty-appointments').hidden = state.appointments.length > 0;
    byId('appointment-list').replaceChildren(...[...state.appointments].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map(item => {
      const row = element('li', '', 'appointment-entry');
      row.append(element('h3', item.professional), element('p', `${formatDay(item.date)} · ${item.time} · ${item.mode}`));
      if (item.attended) row.append(element('span', 'Asistida', 'status confirmed'));
      else if (item.date + 'T' + item.time > now()) row.append(element('span', 'Próxima cita', 'status pending'));
      else {
        const button = element('button', 'Marcar como asistida', 'button secondary');
        button.type = 'button';
        button.addEventListener('click', () => { item.attended = true; persist('Cita marcada como asistida.'); render(); });
        row.append(button);
      }
      return row;
    }));
  }
  function renderAchievements(info) {
    byId('achievement-level').textContent = `Nivel ${info.level}`;
    byId('achievement-xp').textContent = `${info.xp} XP`;
    byId('level-progress').value = info.xp % 100;
    byId('achievement-next-level').textContent = `${100 - info.xp % 100} XP para el nivel ${info.level + 1} · ${info.earned.length}/${achievements.length} logros.`;
    const percent = Math.round(info.weekRecords / 7 * 100);
    byId('weekly-percent').textContent = percent + '%';
    byId('weekly-ring').style.setProperty('--weekly-progress', percent + '%');
    byId('weekly-ring').setAttribute('aria-label', `${info.weekRecords} de 7 días con registro emocional`);
    stats('weekly-stats', [['Registros de emoción', info.weekRecords], ['Consejos completados', info.weekTips], ['Citas asistidas', info.weekAppointments]]);
    byId('weekly-message').textContent = info.streak ? `Tu racha actual es de ${info.streak} ${info.streak === 1 ? 'día' : 'días'}. Puedes seguir a tu ritmo.` : 'Cada día es una nueva oportunidad para dedicarte un momento.';
    document.querySelectorAll('[data-achievement-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.achievementFilter === category)));
    const shown = achievements.filter(item => category === 'general' || item.category === category);
    byId('trophy-list').replaceChildren(...shown.map(item => {
      const earned = info[item.metric] >= item.target;
      const row = element('li', '', 'trophy' + (earned ? ' earned' : ''));
      const icon = element('span', item.icon, 'trophy-icon');
      icon.setAttribute('aria-hidden', 'true');
      row.append(icon, element('strong', item.title), element('small', earned ? 'Desbloqueado' : 'Por desbloquear'));
      return row;
    }));
    const pending = shown.filter(item => info[item.metric] < item.target);
    byId('all-achievements').hidden = pending.length > 0;
    byId('achievement-goals').replaceChildren(...pending.map(item => {
      const card = element('article', '', 'achievement-goal');
      const heading = element('div', '', 'pane-heading');
      heading.append(element('h3', item.title), element('span', '+' + item.xp + ' XP', 'demo-badge'));
      const bar = document.createElement('progress');
      bar.max = item.target;
      bar.value = info[item.metric];
      bar.setAttribute('aria-label', item.title);
      const detail = element('details', '');
      detail.append(element('summary', 'Detalle'), element('p', item.description));
      const action = element('a', item.id === 'summary' ? 'Preparar resumen' : 'Continuar', 'button secondary');
      action.href = item.id === 'summary' ? '#copy-achievements' : '#' + item.action;
      if (item.id === 'summary') action.addEventListener('click', event => { event.preventDefault(); byId('copy-achievements').focus(); });
      card.append(heading, element('p', `${info[item.metric]}/${item.target} completado${item.target === 1 ? '' : 's'}`), bar, detail, action);
      return card;
    }));
  }
  document.querySelectorAll('[data-achievement-filter]').forEach(button => button.addEventListener('click', () => { category = button.dataset.achievementFilter; renderAchievements(getInsights(state, today())); }));
  byId('appointment-form').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const professional = String(data.get('professional') ?? '').trim();
    const date = String(data.get('date') ?? '');
    const time = String(data.get('time') ?? '');
    const mode = data.get('mode');
    if (!professional || professional.length > 80 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !['Videollamada', 'Presencial'].includes(mode)) return;
    state.appointments.push({ id: crypto.randomUUID(), professional, date, time, mode, attended: false });
    persist('Cita de prueba anotada. No se ha realizado una reserva.');
    event.currentTarget.reset();
    render();
  });
  byId('copy-achievements').addEventListener('click', async () => {
    const info = getInsights(state, today());
    const summary = `Mis avances en VITAIROS-M: ${info.records} registros emocionales, ${info.tips} consejos completados y ${info.earned.length} logros desbloqueados. Voy a mi ritmo.`;
    try {
      await navigator.clipboard.writeText(summary);
      state.summaryCopied = true;
      persist('Resumen copiado. Tú decides con quién compartirlo.');
      render();
    } catch { announce('No se pudo copiar el resumen. Revisa el permiso del portapapeles e intenta otra vez.'); }
  });
  return { render };
}
