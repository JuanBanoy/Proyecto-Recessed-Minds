# Recessed Minds - versión HTML/CSS/JavaScript

Esta carpeta contiene la conversión del frontend de Astro a archivos estáticos puros, más un módulo social integrado después del inicio de sesión.

## Estructura

- `index.html`: página completa sin componentes Astro.
- `css/styles.css`: estilos globales, estilos de la landing y estilos del módulo social.
- `js/app.js`: JavaScript puro para partículas, modal de login/registro, sesión en `localStorage`, toasts, rating de estrellas, comentarios locales, contador de estadísticas y zona social.
- `images/`: imágenes copiadas desde `public/images`.

## Cómo abrirlo

Puedes abrir `index.html` directamente en el navegador.

También puedes servirlo con un servidor local:

```bash
cd Proyecto-Minds-html-css-js
python -m http.server 5500
```

Luego abre:

```text
http://localhost:5500
```

## Inicio de sesión y registro

Esta versión funciona en **modo demo local** para que puedas iniciar sesión y registrarte sin ejecutar backend. Las cuentas se guardan en `localStorage` del navegador.

Cuenta de prueba incluida:

```text
Correo: demo@minds.local
Contraseña: 123456
```

También puedes crear una cuenta desde el formulario `Registrarse` y luego iniciar sesión con ese mismo correo y contraseña.

> Nota técnica: este modo es solo para demo/prototipo. No uses contraseñas reales porque `localStorage` no es un sistema seguro de autenticación.

Si después quieres conectar el backend Express, cambia `AUTH_MODE` de `'local'` a `'backend'` al inicio de `js/app.js` y verifica que `API_URL` apunte al puerto correcto.

## Módulo social agregado

Después de iniciar sesión, la página abre una ventana de **Zona Social**. También queda disponible desde el botón `Zona social` en la navegación.

Incluye:

- Panel de progreso de campaña.
- Estadísticas del jugador.
- Habilidades/rendimiento.
- Foro local para publicar hilos.
- Lista de amigos.
- Agregar amigos por nickname.
- Chat local con amigos.

## Persistencia del módulo social

El módulo social está hecho solo con HTML, CSS y JavaScript puro. Sus datos se guardan en `localStorage` por usuario autenticado. No sincroniza foros, amigos ni mensajes con el backend porque no se entregaron endpoints de backend para esas funciones.

Para convertirlo en una red social real entre jugadores, el backend tendría que agregar endpoints y base de datos para:

- publicaciones del foro,
- respuestas,
- solicitudes de amistad,
- lista de amigos,
- mensajes/chat,
- progreso y estadísticas reales del juego.

## Cambios realizados

- Se eliminó Astro, Preact, imports, slots, directivas `client:load` y componentes `.astro/.jsx`.
- Se reemplazaron los componentes por HTML estático equivalente.
- Se reemplazó el modal de autenticación Preact por JavaScript puro.
- Se agregó una ventana social posterior al login sin frameworks externos.
- Se mantuvieron las imágenes, estilos visuales, navegación, tarjetas, formularios, efectos y secciones principales.
