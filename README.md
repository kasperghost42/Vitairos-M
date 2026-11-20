# VITAIROS-M

Prototipo local de continuidad en salud mental con una portada informativa y dos espacios de prueba. Usa únicamente datos ficticios.

## Inicio local

Requiere Node.js 20.12 o superior. El proyecto no tiene dependencias externas.

```sh
npm run check
npm run dev
```

- [Portada](http://localhost:4173/) con la brecha entre sesiones, el recorrido, las perspectivas, la seguridad y el acceso anticipado.
- [Panel profesional](http://localhost:4173/panel) con agenda, disponibilidad, fichas e ingresos ficticios.
- [Espacio personal](http://localhost:4173/persona) con inicio, registros diarios, chatbot, historial y acceso al canal oficial de participación.

El perfil personal es local al navegador. Los registros de bienestar y los chats se recuperan al recargar en el mismo navegador y origen. Para probar la continuidad, crea dos chats, abre el historial y pulsa **Continuar** en el primero. Puedes eliminar conversaciones desde el historial.

## Activar un proveedor de chat

El chat inicia en modo `demo`, con respuestas de ejemplo generadas localmente. Para probar una API, copia `.env.example` a `.env` en la raíz del proyecto e indica el proveedor y la clave. Git ignora `.env`.

**Groq**

Crea una clave en [Groq Cloud](https://console.groq.com/keys).

```dotenv
CHAT_PROVIDER=groq
GROQ_API_KEY=tu_clave_local
# CHAT_MODEL=openai/gpt-oss-20b
```

**Mistral**

Crea una clave en [Mistral Studio](https://console.mistral.ai/).

```dotenv
CHAT_PROVIDER=mistral
MISTRAL_API_KEY=tu_clave_local
# CHAT_MODEL=mistral-small-latest
```

Reinicia `npm run dev` tras editar `.env`. El nombre del proveedor debe aparecer en el chatbot. Cada envío requiere autorizar la transmisión del mensaje y de hasta ocho mensajes recientes de esa conversación. Los registros de progreso nunca forman parte de la solicitud. La clave se utiliza en el servidor y no llega al navegador.

Con Groq activo, el chatbot permite dictar mensajes. Autoriza el audio de prueba y pulsa **Grabar voz**. Usa **Detener y transcribir** cuando termines, o **Cancelar dictado** para descartar la grabación. La grabación se detiene a los 30 segundos y Groq la transcribe en español con Whisper. Revisa el texto antes de enviarlo al chat. La aplicación procesa el audio en memoria y guarda únicamente texto en el historial. Usa un navegador con acceso al micrófono en localhost.

El prototipo está pensado para pruebas en localhost. Antes de usar cuentas o datos reales harían falta autenticación, almacenamiento seguro y revisión clínica y de privacidad.

## Referencias

- [VITAIROS-M](https://www.vitairos.com/vitairos-m/)
- [Demostración del perfil profesional](https://www.youtube.com/watch?v=I_Lp_66HDhw)
- [API de Groq](https://console.groq.com/docs/api-reference)
- [API de Mistral](https://docs.mistral.ai/api/endpoint/chat)
