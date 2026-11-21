import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import { handleChat, sendChatConfig } from './chat.mjs';
import { handleTranscription } from './transcription.mjs';

try {
  loadEnvFile();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const pages = new Map([
  ['/', ['index.html', 'text/html']],
  ['/experiencia', ['index.html', 'text/html']],
  ['/panel', ['panel.html', 'text/html']],
  ['/persona', ['persona.html', 'text/html']],
  ['/styles.css', ['styles.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/professional-model.js', ['professional-model.js', 'text/javascript']],
  ['/persona.js', ['persona.js', 'text/javascript']],
  ['/insights.js', ['insights.js', 'text/javascript']],
  ['/home.js', ['home.js', 'text/javascript']],
  ['/voice.js', ['voice.js', 'text/javascript']],
  ['/favicon.ico', ['favicon.ico', 'image/x-icon']],
  ['/vitairos-m-logo.png', ['vitairos-m-logo.png', 'image/png']],
]);
const port = Number(process.env.PORT ?? 4173);

createServer(async (request, response) => {
  const path = request.url.split('?')[0];
  if (!/^(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(request.headers.host ?? '')) {
    response.writeHead(403).end();
    return;
  }
  if (path === '/api/chat' || path === '/api/chat/config' || path === '/api/chat/transcription') {
    const method = path === '/api/chat/config' ? 'GET' : 'POST';
    if (request.method !== method) {
      response.writeHead(405, { Allow: method }).end();
      return;
    }
    try {
      if (path === '/api/chat') await handleChat(request, response);
      else if (path === '/api/chat/transcription') await handleTranscription(request, response);
      else sendChatConfig(response);
    } catch {
      if (!response.headersSent) response.writeHead(500).end();
    }
    return;
  }
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
      'Content-Type': type.startsWith('text/') ? type + '; charset=utf-8' : type,
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
