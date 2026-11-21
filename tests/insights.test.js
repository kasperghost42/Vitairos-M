import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getInsights, shiftDay } from '../public/insights.js';

const today = '2026-11-21';
const empty = () => ({ checkins: [], completedTips: [], appointments: [] });

test('un perfil vacío comienza sin trofeos ni actividad inventada', () => {
  const info = getInsights(empty(), today);
  assert.equal(info.xp, 0);
  assert.equal(info.level, 1);
  assert.equal(info.weekRecords, 0);
  assert.equal(info.earned.length, 0);
});

test('las rachas usan días distintos y admiten continuar desde ayer', () => {
  const state = empty();
  state.checkins = [-3, -2, -1, -1].map(offset => ({date:shiftDay(today, offset), score:1}));
  const info = getInsights(state, today);
  assert.equal(info.streak, 3);
  assert.equal(info.bestStreak, 3);
  assert.equal(info.records, 3);
  assert.ok(info.earned.some(item => item.id === 'streak'));
  assert.equal(getInsights(state, shiftDay(today, 1)).streak, 0);
  assert.equal(getInsights(state, shiftDay(today, 1)).bestStreak, 3);
});

test('los trofeos reconocen participación sin depender de la emoción', () => {
  const state = empty();
  state.checkins = Array.from({length:10}, (_, i) => ({date:shiftDay(today, -i), emotionValue:0}));
  const info = getInsights(state, today);
  assert.deepEqual(info.earned.map(item => item.id), ['first', 'streak', 'ten', 'week']);
  assert.equal(info.xp, 250);
  assert.equal(info.level, 3);
  assert.equal(info.weekRecords, 7);
});

test('el resumen semanal excluye actividad antigua y no duplica consejos', () => {
  const state = empty();
  state.checkins = [{date:today, score:3, comment:'Una nota'}, {date:shiftDay(today,-7),score:4}];
  state.completedTips = [today+':0',today+':0',shiftDay(today,-6)+':1',shiftDay(today,-7)+':0'];
  state.appointments = [{date:today,attended:true},{date:today,attended:false},{date:shiftDay(today,-7),attended:true}];
  const info = getInsights(state, today);
  assert.equal(info.weekRecords, 1);
  assert.equal(info.weekTips, 2);
  assert.equal(info.weekAppointments, 1);
  assert.equal(info.tips, 3);
  assert.equal(info.notes, 1);
});

test('copiar un resumen desbloquea solo su hito y los XP no se duplican', () => {
  const state = {...empty(),summaryCopied:true};
  assert.equal(getInsights(state,today).xp,20);
  assert.equal(getInsights(state,today).xp,20);
  assert.deepEqual(getInsights(state,today).earned.map(item=>item.id),['summary']);
});

test('las fechas cruzan meses y años sin depender de la zona del sistema', () => {
  assert.equal(shiftDay('2027-01-01',-1),'2026-12-31');
  assert.equal(shiftDay('2028-03-01',-1),'2028-02-29');
});
