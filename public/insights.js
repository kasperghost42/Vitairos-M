export function shiftDay(day, offset) {
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export const achievements = [
  { id: 'first', title: 'Primer registro', icon: '🌱', category: 'emocion', target: 1, metric: 'records', xp: 20, action: 'progreso', description: 'Guarda tu primer registro emocional.' },
  { id: 'streak', title: 'Racha de 3 días', icon: '🔥', category: 'habitos', target: 3, metric: 'bestStreak', xp: 50, action: 'progreso', description: 'Registra tu emoción durante tres días consecutivos.' },
  { id: 'ten', title: '10 registros de emoción', icon: '🧠', category: 'emocion', target: 10, metric: 'records', xp: 60, action: 'progreso', description: 'Registra cómo te sientes en diez días diferentes.' },
  { id: 'week', title: 'Primera semana completa', icon: '🏁', category: 'habitos', target: 7, metric: 'bestStreak', xp: 120, action: 'progreso', description: 'Completa siete días consecutivos de registro.' },
  { id: 'twenty', title: '20 registros de emoción', icon: '✨', category: 'emocion', target: 20, metric: 'records', xp: 80, action: 'progreso', description: 'Suma veinte días con un registro emocional.' },
  { id: 'tips', title: '10 consejos completados', icon: '💡', category: 'habitos', target: 10, metric: 'tips', xp: 60, action: 'consejos', description: 'Marca como hechos diez consejos diarios. Cada consejo cuenta una vez por día.' },
  { id: 'summary', title: 'Tu resumen preparado', icon: '📣', category: 'comunidad', target: 1, metric: 'summary', xp: 20, action: 'logros', description: 'Copia tu resumen de logros para compartirlo cuando tú quieras.' },
];

export function getInsights(state, today) {
  const dates = [...new Set(state.checkins.map(item => item.date))].sort();
  const days = new Set(dates);
  let bestStreak = 0, run = 0, previous;
  for (const day of dates) {
    run = previous && shiftDay(previous, 1) === day ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    previous = day;
  }
  let streak = 0;
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  while (days.has(cursor)) { streak++; cursor = shiftDay(cursor, -1); }
  const since = shiftDay(today, -6);
  const inWeek = day => day >= since && day <= today;
  const tips = [...new Set(state.completedTips ?? [])];
  const metrics = { records: dates.length, bestStreak, tips: tips.length, summary: state.summaryCopied ? 1 : 0 };
  const earned = achievements.filter(item => metrics[item.metric] >= item.target);
  const xp = earned.reduce((total, item) => total + item.xp, 0);
  return {
    ...metrics, streak, earned, xp, level: Math.floor(xp / 100) + 1,
    weekRecords: dates.filter(inWeek).length,
    weekTips: tips.filter(id => inWeek(id.slice(0, 10))).length,
    weekAppointments: (state.appointments ?? []).filter(item => item.attended && inWeek(item.date)).length,
    notes: state.checkins.filter(item => item.comment?.trim()).length,
  };
}
