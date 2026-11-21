import { shiftDay } from './insights.js';

export const statusLabels = { pending: 'Pendiente', confirmed: 'Confirmada', canceled: 'Cancelada', completed: 'Realizada' };
export const fee = 18000;
export function incomeData(seedDay, today, sessions = [], appointments = [], statuses = {}) {
  const samples = [84000, 96000, 72000, 108000, 78000, 102000, 84000, 72000, 120000, 90000, 84000, 96000];
  const totals = new Map();
  for (let i = 0; i < 31; i++) totals.set(shiftDay(seedDay, -i), samples[(31 - i) % samples.length]);
  for (const session of sessions) totals.set(session.date, (totals.get(session.date) ?? 0) + fee);
  const series = Array.from({ length: 12 }, (_, i) => { const date = shiftDay(today, i - 11); return { date, amount: totals.get(date) ?? 0 }; });
  return {
    series,
    today: totals.get(today) ?? 0,
    month: [...totals].filter(([date]) => date.startsWith(today.slice(0, 7)) && date <= today).reduce((sum, [, amount]) => sum + amount, 0),
    pending: appointments.filter(item => ['pending', 'confirmed'].includes(statuses[item.id] ?? item.state)).length * fee,
  };
}

export function absenceStreak(seedDay, today, sessions = []) {
  const attendedDays = new Set(Array.from({ length: 23 }, (_, i) => shiftDay(seedDay, -i - 1)));
  sessions.forEach(item => attendedDays.add(item.date));
  let cursor = attendedDays.has(today) ? today : shiftDay(today, -1);
  let count = 0;
  while (attendedDays.has(cursor)) { count++; cursor = shiftDay(cursor, -1); }
  return count;
}

export function incomeCsv(series) {
  return '\uFEFFFecha;Monto CLP;Tipo\r\n' + series.map(item => `${item.date};${item.amount};Demostracion`).join('\r\n') + '\r\n';
}
