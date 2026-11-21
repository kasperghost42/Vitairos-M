import { test } from 'node:test';
import assert from 'node:assert/strict';
import { absenceStreak, incomeData, incomeCsv, fee } from '../public/professional-model.js';

const today = '2026-11-21';
test('la racha de muestra avanza una vez por día aunque haya varias sesiones', () => {
  assert.equal(absenceStreak(today, today), 23);
  assert.equal(absenceStreak(today, today, [{date:today},{date:today}]), 24);
  assert.equal(absenceStreak(today, '2026-11-23'), 0);
});
test('las ganancias se actualizan con sesiones realizadas y excluyen citas canceladas de pendientes', () => {
  const appointments = [{id:'a',state:'pending'},{id:'b',state:'confirmed'},{id:'c',state:'canceled'}];
  const initial = incomeData(today,today,[],appointments,{});
  const updated = incomeData(today,today,[{date:today}],appointments,{a:'completed'});
  assert.equal(initial.pending,2*fee);
  assert.equal(updated.pending,fee);
  assert.equal(updated.today,initial.today+fee);
  assert.equal(updated.month,initial.month+fee);
  assert.equal(updated.series.length,12);
  assert.equal(updated.series.at(-1).date,today);
});
test('la gráfica cruza meses y el resumen solo suma el mes seleccionado', () => {
  const data=incomeData('2026-12-02','2026-12-02');
  assert.equal(data.series[0].date,'2026-11-21');
  assert.equal(data.month,data.series.filter(item=>item.date.startsWith('2026-12')).reduce((sum,item)=>sum+item.amount,0));
});
test('el CSV exporta fechas y cantidades sin información personal', () => {
  const csv=incomeCsv(incomeData(today,today).series);
  assert.ok(csv.startsWith('\uFEFFFecha;Monto CLP;Tipo\r\n'));
  assert.equal(csv.trim().split('\r\n').length,13);
  assert.match(csv,/2026-11-21;\d+;Demostracion/);
  assert.ok(!csv.includes('patientId'));
});
