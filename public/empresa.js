const form = document.getElementById('piloto');
const summary = document.getElementById('pilot-summary');
const status = document.getElementById('pilot-status');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  for (const field of ['organization', 'size', 'objective']) {
    document.getElementById('pilot-' + field).textContent = data.get(field);
  }
  summary.hidden = false;
  status.textContent = 'Resumen preparado en esta página. No se ha enviado una solicitud.';
});

form.addEventListener('change', () => {
  if (summary.hidden) return;
  summary.hidden = true;
  status.textContent = 'El alcance cambió. Prepara el resumen actualizado.';
});
