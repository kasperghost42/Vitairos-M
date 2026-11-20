const formats = new Map([
  ['audio/webm', 'webm'],
  ['audio/mp4', 'm4a'],
  ['audio/ogg', 'ogg'],
  ['audio/wav', 'wav'],
]);
const maxBytes = 4 * 1024 * 1024;

export function transcriptionReady() {
  return process.env.CHAT_PROVIDER === 'groq' && Boolean(process.env.GROQ_API_KEY?.trim());
}

export async function handleTranscription(request, response) {
  const send = (status, body) => response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  }).end(JSON.stringify(body));

  if (request.headers.origin !== 'http://' + request.headers.host) {
    return send(403, { error: 'Origen no permitido.' });
  }
  if (request.headers['x-audio-consent'] !== 'true') {
    return send(400, { error: 'Autoriza el envío del audio de prueba a Groq.' });
  }
  if (!transcriptionReady()) {
    return send(503, { error: 'Activa Groq en el servidor para usar el micrófono.' });
  }
  const type = request.headers['content-type']?.split(';')[0].trim().toLowerCase();
  const extension = formats.get(type);
  if (!extension) return send(415, { error: 'Formato de audio no compatible.' });
  if (Number(request.headers['content-length']) > maxBytes) {
    response.shouldKeepAlive = false;
    return send(413, { error: 'La grabación supera 4 MB. Prueba con una más breve.' });
  }

  const chunks = [];
  let bytes = 0;
  // Keep the connection writable if a chunked request exceeds the limit.
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    bytes += chunk.length;
    if (bytes > maxBytes) {
      response.shouldKeepAlive = false;
      request.resume();
      return send(413, { error: 'La grabación supera 4 MB. Prueba con una más breve.' });
    }
    chunks.push(chunk);
  }
  if (!bytes) return send(400, { error: 'La grabación está vacía.' });

  const form = new FormData();
  form.set('file', new Blob(chunks, { type }), 'grabacion.' + extension);
  form.set('model', 'whisper-large-v3-turbo');
  form.set('language', 'es');
  form.set('response_format', 'json');

  const controller = new AbortController();
  const abortOnClose = () => controller.abort();
  response.once('close', abortOnClose);
  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.GROQ_API_KEY.trim() },
      body: form,
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]),
    });
    if (upstream.status === 429) {
      return send(429, { error: 'Groq alcanzó su límite temporal. Intenta más tarde.' });
    }
    if (!upstream.ok) return send(502, { error: 'Groq rechazó el audio. Intenta con otra grabación.' });
    const result = await upstream.json();
    const text = typeof result.text === 'string' ? result.text.trim() : '';
    if (!text) return send(422, { error: 'No se detectó texto. Intenta hablar más cerca del micrófono.' });
    return send(200, { text });
  } catch {
    if (!controller.signal.aborted) {
      return send(502, { error: 'No se pudo completar la transcripción. Intenta nuevamente.' });
    }
  } finally {
    response.off('close', abortOnClose);
  }
}
