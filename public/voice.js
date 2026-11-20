const recordingTypes = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'];
const maxRecordingTime = 30_000;

export function initVoice({ message, controlsChanged }) {
  const byId = (id) => document.getElementById(id);
  const panel = byId('voice-panel');
  const toggle = byId('record-voice');
  const cancel = byId('cancel-voice');
  const consent = byId('voice-consent');
  const status = byId('voice-status');
  const supported = Boolean(navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined');
  let active;
  let phase = 'idle';
  let ready = false;
  let locked = false;

  function render() {
    toggle.disabled = locked || !ready || !supported
      || (phase === 'idle' ? !consent.checked : phase !== 'recording');
    toggle.textContent = phase === 'recording' ? 'Detener y transcribir' : 'Grabar voz';
    cancel.hidden = phase === 'idle';
    consent.disabled = locked || phase !== 'idle';
  }

  function setPhase(value, notice) {
    phase = value;
    status.textContent = notice;
    controlsChanged();
  }

  function release(session) {
    clearTimeout(session.timer);
    session.stream?.getTracks().forEach((track) => track.stop());
    session.stream = undefined;
  }

  function finish(session, notice) {
    if (active !== session) return;
    active = undefined;
    session.controller.abort();
    if (session.recorder?.state === 'recording') session.recorder.stop();
    release(session);
    consent.checked = false;
    setPhase('idle', notice);
  }

  function stop(session) {
    if (active !== session || phase !== 'recording') return;
    if (session.recorder.state !== 'recording') {
      finish(session, 'La grabación se interrumpió. Intenta nuevamente.');
      return;
    }
    setPhase('transcribing', 'Transcribiendo con Groq…');
    session.recorder.stop();
    release(session);
  }

  async function transcribe(session) {
    if (active !== session) return;
    try {
      const type = session.recorder.mimeType || session.chunks[0]?.type;
      const audio = new Blob(session.chunks, { type });
      session.chunks = [];
      if (!audio.size) throw new Error('La grabación está vacía. Intenta nuevamente.');
      const response = await fetch('/api/chat/transcription', {
        method: 'POST',
        headers: { 'Content-Type': type, 'X-Audio-Consent': 'true' },
        body: audio,
        signal: session.controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo transcribir la grabación.');
      if (active !== session) return;
      message.value = [message.value.trim(), result.text].filter(Boolean).join('\n');
      const tooLong = message.value.length > message.maxLength;
      finish(session, tooLong
        ? 'Transcripción lista. Acorta el mensaje a 800 caracteres antes de enviarlo.'
        : 'Transcripción lista. Puedes editarla antes de enviar.');
      message.focus();
    } catch (error) {
      finish(session, error instanceof TypeError ? 'No se pudo conectar con el servidor.' : error.message);
    }
  }

  async function record() {
    if (phase !== 'idle' || toggle.disabled) return;
    const session = { chunks: [], controller: new AbortController() };
    active = session;
    setPhase('opening', 'Esperando permiso para usar el micrófono…');
    try {
      session.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (active !== session) return release(session);
      const mimeType = recordingTypes.find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('El navegador no ofrece un formato de audio compatible.');
      const recorder = new MediaRecorder(session.stream, { mimeType });
      session.recorder = recorder;
      recorder.addEventListener('dataavailable', (event) => {
        if (active === session && event.data.size) session.chunks.push(event.data);
      });
      recorder.addEventListener('stop', () => {
        // A disconnected microphone can stop recording before the user confirms upload.
        if (phase === 'transcribing') void transcribe(session);
        else finish(session, 'La grabación se interrumpió. Intenta nuevamente.');
      });
      recorder.addEventListener('error', () => finish(session, 'No se pudo grabar el audio.'));
      recorder.start();
      session.timer = setTimeout(() => stop(session), maxRecordingTime);
      setPhase('recording', 'Grabando. Pulsa Detener y transcribir cuando termines.');
      toggle.focus();
    } catch (error) {
      const notice = error.name === 'NotAllowedError' ? 'No se concedió permiso para usar el micrófono.'
        : error.name === 'NotFoundError' ? 'No se encontró un micrófono.'
          : 'No se pudo iniciar la grabación en este navegador.';
      finish(session, notice);
    }
  }

  consent.addEventListener('change', render);
  toggle.addEventListener('click', () => {
    if (phase === 'recording') stop(active);
    else void record();
  });
  cancel.addEventListener('click', () => {
    if (active) finish(active, 'Grabación o transcripción cancelada.');
    consent.focus();
  });

  return {
    get busy() { return phase !== 'idle'; },
    setup(available) {
      ready = available;
      panel.hidden = !ready;
      consent.hidden = !supported;
      if (ready && !supported) status.textContent = 'El micrófono no está disponible en este navegador.';
      render();
    },
    lock(value) {
      locked = value;
      render();
    },
    cancel() {
      if (active) finish(active, 'Grabación o transcripción cancelada.');
      else {
        consent.checked = false;
        render();
      }
    },
  };
}
