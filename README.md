# VITAIROS-M

Prototipo web del panel profesional de VITAIROS-M. La demostración de referencia aporta el flujo de agenda, disponibilidad, fichas y resumen de ingresos. La vista de experiencia describe el enfoque de continuidad en salud mental y consentimiento.

## Inicio local

Requiere Node.js 20 o superior. El proyecto no tiene dependencias externas.

```sh
npm run check
npm run dev
```

Abre [el panel profesional](http://127.0.0.1:4173) o [la vista de experiencia](http://127.0.0.1:4173/experiencia). Puedes cambiar el puerto con la variable de entorno `PORT`.

## Qué puedes probar

- Consulta citas de hoy y de la semana. Confirma una cita pendiente, cancélala con confirmación o consulta su ficha de demostración.
- Selecciona franjas en la disponibilidad semanal y comprueba que se conservan al recargar.
- Consulta el estado de una credencial ficticia y un resumen ilustrativo de ingresos.
- Explora el recorrido y las opciones de participación desde la vista de experiencia.

Los nombres, citas e importes son ficticios. El panel guarda únicamente cambios de estado y franjas de la demo en el navegador. Para recuperar el estado inicial, elimina el almacenamiento del sitio. No se procesan datos clínicos, pagos ni credenciales reales. Los enlaces de participación dirigen al sitio oficial.

## Referencias de diseño y contenido

- [Perfil profesional en video](https://www.youtube.com/watch?v=I_Lp_66HDhw)
- [VITAIROS-M](https://www.vitairos.com/vitairos-m/)
