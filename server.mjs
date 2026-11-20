import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const pages = new Map([
  ['/', ['index.html', 'text/html']],
  ['/experiencia', ['experiencia.html', 'text/html']],
  ['/styles.css', ['styles.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']],
]);
const port = Number(process.env.PORT ?? 4173);

createServer(async (request, response) => {
  const path = request.url.split('?')[0];
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  if (!pages.has(path)) {
    response.writeHead(404).end('Página no encontrada');
    return;
  }

  const [file, type] = pages.get(path);
  try {
    const content = await readFile(new URL('public/' + file, import.meta.url));
    response.writeHead(200, {
      'Content-Type': type + '; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
    });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) {
    console.error(error);
    response.writeHead(500).end('No se pudo cargar la página');
  }
}).listen(port, '127.0.0.1', () => {
  console.log('VITAIROS-M disponible en http://127.0.0.1:' + port);
});
