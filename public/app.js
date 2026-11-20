const day = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric', month: 'long', weekday: 'long', timeZone: 'UTC',
});
const shortDay = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric', month: 'short', weekday: 'short', timeZone: 'UTC',
});
const santiago = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Santiago',
});
const dateParts = Object.fromEntries(santiago.formatToParts(new Date()).map(({ type, value }) => [type, value]));
const today = Date.UTC(Number(dateParts.year), Number(dateParts.month) - 1, Number(dateParts.day));
const dateAt = (offset) => new Date(today + offset * 86_400_000);

const appointments = [
  { id: 'va', name: 'Valentina Araya', hour: '08:30', offset: 0, state: 'pending', context: 'Compartió que le gustaría revisar cómo organizar su rutina entre sesiones.' },
  { id: 'dn', name: 'Diego Navarro', hour: '09:30', offset: 0, state: 'confirmed' },
  { id: 'im', name: 'Isabel Molina', hour: '10:15', offset: 0, state: 'confirmed', context: 'Pidió retomar los objetivos acordados en la última conversación.' },
  { id: 'mt', name: 'Martín Torres', hour: '11:45', offset: 0, state: 'pending' },
  { id: 'cp', name: 'Clara Paredes', hour: '15:00', offset: 0, state: 'confirmed' },
  { id: 'fr', name: 'Francisca Rojas', hour: '10:00', offset: 2, state: 'confirmed' },
  { id: 'al', name: 'Andrés Lara', hour: '13:00', offset: 2, state: 'pending' },
  { id: 'mj', name: 'Mariana Jara', hour: '11:00', offset: 4, state: 'confirmed' },
];
const labels = { pending: 'Pendiente', confirmed: 'Confirmada', canceled: 'Cancelada' };
const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const hours = ['08:30', '09:30', '10:30', '11:30', '15:00', '16:00', '17:00'];
const validSlots = new Set(days.flatMap((dayName) => hours.map((hour) => dayName + '-' + hour)));
const storageKey = 'vitairos-m-demo-v1';
const byId = (id) => document.getElementById(id);

let state = { statuses: {}, slots: [] };
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && typeof saved === 'object') {
    for (const { id } of appointments) {
      const status = saved.statuses?.[id];
      if (Object.hasOwn(labels, status)) state.statuses[id] = status;
    }
    if (Array.isArray(saved.slots)) {
      state.slots = [...new Set(saved.slots.filter((slot) => validSlots.has(slot)))];
    }
  }
} catch (error) {
  console.warn('No se pudo recuperar el estado local de la demostración.', error);
}

let period = 'today';
let pendingCancel;
let toastTimer;

function announce(message) {
  byId('toast').textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { byId('toast').textContent = ''; }, 4500);
}

function save(message) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    announce(message);
  } catch {
    announce('Cambio aplicado en esta pestaña. El navegador no permitió guardarlo.');
  }
}

function statusOf(appointment) {
  return state.statuses[appointment.id] ?? appointment.state;
}

function render() {
  const totalToday = appointments.filter((item) => item.offset === 0);
  const active = appointments.filter((item) => statusOf(item) !== 'canceled');
  byId('active-count').textContent = active.length;
  byId('today-count').textContent = active.filter((item) => item.offset === 0).length;
  const confirmed = totalToday.filter((item) => statusOf(item) === 'confirmed').length;
  byId('confirmed-count').textContent = confirmed === 1 ? '1 confirmada' : confirmed + ' confirmadas';
  byId('availability-count').textContent = state.slots.length;
  byId('availability-alert').textContent = state.slots.length
    ? 'Puedes revisar o ajustar tus horarios.'
    : 'Aún no has cargado horarios.';
  byId('date-heading').textContent = period === 'today' ? 'Hora' : 'Fecha y hora';

  // All row text comes from the fixed demo data above and the validated status labels.
  byId('appointments').innerHTML = (period === 'today' ? totalToday : appointments).map((item) => {
    const status = statusOf(item);
    const initials = item.name.split(' ').map((word) => word[0]).join('');
    const when = period === 'today' ? item.hour : shortDay.format(dateAt(item.offset)) + ' · ' + item.hour;
    return `<tr>
      <th scope="row"><span class="patient"><span class="avatar" aria-hidden="true">${initials}</span>${item.name}</span></th>
      <td class="time">${when}</td>
      <td><span class="status ${status}">${labels[status]}</span></td>
      <td><div class="row-actions">
        ${status === 'pending' ? `<button class="row-button accept" data-action="accept" data-id="${item.id}" aria-label="Confirmar cita de ${item.name}">Confirmar</button>` : ''}
        ${status !== 'canceled' ? `<button class="row-button decline" data-action="cancel" data-id="${item.id}" aria-label="Cancelar cita de ${item.name}">Cancelar</button>` : ''}
        <button class="row-button" data-action="profile" data-id="${item.id}" aria-label="Abrir ficha de ${item.name}">Ficha</button>
      </div></td>
    </tr>`;
  }).join('');
}

function editAvailability() {
  byId('slots').innerHTML = days.map((dayName) => `<fieldset class="slot-day">
    <legend>${dayName}</legend>
    ${hours.map((hour) => {
      const key = dayName + '-' + hour;
      return `<label class="slot"><input type="checkbox" value="${key}" ${state.slots.includes(key) ? 'checked' : ''}><span>${hour}</span></label>`;
    }).join('')}
  </fieldset>`).join('');
}

function changeStatus(item, status, message) {
  state.statuses[item.id] = status;
  save(message);
  render();
  byId('appointments').querySelector(`[data-action="profile"][data-id="${item.id}"]`).focus();
}

byId('today-label').textContent = day.format(dateAt(0));
byId('license-alert').textContent = 'La vigencia termina en 10 días.';
byId('license-date').textContent = day.format(dateAt(10));

document.querySelectorAll('[data-dialog]').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.dialog === 'availability') editAvailability();
    byId(button.dataset.dialog).showModal();
  });
});

document.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', () => button.closest('dialog').close());
});

document.querySelectorAll('[data-period]').forEach((button) => {
  button.addEventListener('click', () => {
    period = button.dataset.period;
    document.querySelectorAll('[data-period]').forEach((option) => {
      option.setAttribute('aria-pressed', String(option === button));
    });
    render();
  });
});

byId('save-slots').addEventListener('click', () => {
  state.slots = Array.from(byId('slots').querySelectorAll('input:checked'), (input) => input.value);
  save('Disponibilidad guardada.');
  byId('availability').close();
  render();
});

byId('appointments').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const item = appointments.find(({ id }) => id === button.dataset.id);
  if (button.dataset.action === 'accept') {
    changeStatus(item, 'confirmed', 'Cita confirmada.');
  } else if (button.dataset.action === 'cancel') {
    pendingCancel = item;
    byId('cancel-message').textContent = '¿Quieres cancelar la cita de ' + item.name + ' a las ' + item.hour + '?';
    byId('cancel').showModal();
  } else {
    byId('profile-title').textContent = item.name;
    byId('profile-date').textContent = day.format(dateAt(item.offset)) + ' · ' + item.hour;
    byId('profile-state').textContent = labels[statusOf(item)];
    byId('profile-context').textContent = item.context ?? 'Esta persona no ha compartido contexto en la demostración.';
    byId('profile').showModal();
  }
});

byId('confirm-cancel').addEventListener('click', () => {
  byId('cancel').close();
  changeStatus(pendingCancel, 'canceled', 'Cita cancelada.');
});

render();
