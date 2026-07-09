# MetHub — Explorador de la Colección del Met Museum

Aplicación web de una sola página (SPA) construida en HTML, CSS y JavaScript
vanilla que consume la [Open Access API](https://metmuseum.github.io/) del
Metropolitan Museum of Art para explorar su colección de más de 470.000 obras.

---

## Integrante

- **[Tu nombre completo]** — desarrollo completo del proyecto (arquitectura,
  las seis vistas, componentes globales y estilos).

> Este proyecto se desarrolló de forma individual, no en pareja.

---

## Cómo ejecutar el proyecto

No requiere instalación ni servidor. Basta con:

1. Descargar o clonar el repositorio.
2. Abrir el archivo `index.html` directamente en el navegador (doble clic,
   o clic derecho → "Abrir con" → tu navegador).

**Requisitos:** conexión a internet (la app consume la API del Met Museum en
vivo) y un navegador moderno (Chrome, Edge, Firefox o Vivaldi recientes).
No se necesita Node, npm, ni ningún framework instalado.

---

## Estructura del proyecto

```
methub/
├── index.html                  Contenedor único de la SPA
├── css/                        Estilos separados por responsabilidad
│   ├── tokens.css              Variables de diseño (colores, tipografías)
│   ├── base.css                Reset y estilos base
│   ├── layout.css              Contenedor principal
│   ├── navbar.css
│   ├── hero.css
│   ├── stats.css
│   ├── gallery.css             Tarjetas de obra (reutilizadas en 3 vistas)
│   ├── states.css              Loading / error / botones
│   ├── placeholder.css
│   ├── footer.css
│   ├── explore.css
│   ├── departments.css
│   ├── detail.css
│   ├── compare.css
│   └── artist.css
└── js/
    ├── core/                   Piezas de infraestructura, sin lógica de UI
    │   ├── ApiClient.js        Cliente HTTP genérico (timeout + cancelación)
    │   ├── MetService.js       Reglas de negocio de la API del Met
    │   ├── Router.js           Router de hash con :params y ?query
    │   └── View.js             Clase base abstracta de la que heredan todas las vistas
    ├── components/             Custom Elements reutilizables en toda la app
    │   ├── NavBar.js
    │   ├── LoadingState.js
    │   └── ErrorState.js
    ├── views/                  Una clase por vista, extiende View
    │   ├── HomeView.js
    │   ├── ExploreView.js
    │   ├── DetailView.js
    │   ├── DepartmentsView.js
    │   ├── ArtistView.js
    │   └── CompareView.js
    └── App.js                  Bootstrap: crea las dependencias y arranca el router
```

---

## Componentes implementados

### Núcleo (`js/core/`)

| Componente | Descripción |
|---|---|
| `ApiClient` | Cliente HTTP genérico. Maneja timeout (`AbortController`, 10s) y cancelación externa. No sabe nada del Met Museum — es reutilizable para cualquier API REST. |
| `MetService` | Encapsula todas las reglas de la API del Met (`getDepartments`, `search`, `getObject`, `resolveIds`). Recibe un `ApiClient` inyectado por constructor. |
| `Router` | Router de hash (`#vista/:param?query=valor`). Soporta parámetros de ruta y query params, y respeta los botones Atrás/Adelante del navegador. |
| `View` | Clase base abstracta. Define el ciclo de vida `mount()` / `unmount()` (cancela peticiones pendientes al cambiar de vista) y helpers compartidos (`showLoading`, `showError`, `buildPlaceholder`). |

### Componentes globales (`js/components/`)

| Componente | Descripción |
|---|---|
| `<nav-bar>` | Barra de navegación superior, fija al hacer scroll. Resalta automáticamente el enlace de la vista activa. |
| `<loading-state message="...">` | Indicador de carga reutilizable en todas las peticiones asíncronas. |
| `<error-state message="..." retry>` | Indicador de error con botón opcional de "Reintentar" que emite un evento personalizado. |

### Vistas (`js/views/`)

| Vista | Ruta | Descripción |
|---|---|---|
| `HomeView` | `#home` | Hero de bienvenida, estadísticas generales (departamentos y obras destacadas) y galería de 8–10 obras destacadas. |
| `ExploreView` | `#explore` | Búsqueda por texto, filtros (departamento, rango de años, destacadas, con imagen), panel de agregados en vivo (calculado sobre la página actual) y galería paginada de 12 obras. |
| `DetailView` | `#detail/:id` | Ficha completa de una obra: imagen principal, galería de imágenes adicionales, datos técnicos, tags y enlaces a artista/comparador. |
| `DepartmentsView` | `#departments` | Catálogo de los departamentos curatoriales del museo; cada tarjeta navega a `#explore` con ese departamento preaplicado. |
| `ArtistView` | `#artist/:name` | Obras asociadas a un artista, paginadas, con su biografía si la API la provee. |
| `CompareView` | `#compare` | Comparador de dos obras lado a lado con buscador interno por panel (debounce 400ms) y tabla comparativa con diferencias resaltadas. |

---

## Capturas de pantalla

> Reemplaza estas imágenes de ejemplo por tus propias capturas. Crea una
> carpeta `docs/screenshots/` en la raíz del proyecto y guarda ahí los
> archivos con estos nombres (o ajusta las rutas de abajo si usas otros).

| Vista | Captura |
|---|---|
| Página Principal (`#home`) | ![Home](docs/screenshots/home.png) |
| Explorar (`#explore`) | ![Explorar](docs/screenshots/explore.png) |
| Detalle de Obra (`#detail/:id`) | ![Detalle](docs/screenshots/detail.png) |
| Departamentos (`#departments`) | ![Departamentos](docs/screenshots/departments.png) |
| Obras del Artista (`#artist/:name`) | ![Artista](docs/screenshots/artist.png) |
| Comparador (`#compare`) | ![Comparador](docs/screenshots/compare.png) |

---

## Decisiones técnicas relevantes

- **Inyección de dependencias en vez de globals dispersos.** `App` crea
  `ApiClient` y `MetService` una única vez y los inyecta a cada `View` por
  constructor. Ninguna vista instancia su propio cliente HTTP, lo que
  facilita cambiar la URL base o mockear la API sin tocar las vistas.

- **Cancelación de peticiones al cambiar de vista.** Cada `View` recibe un
  `AbortController` propio en `mount()` y lo aborta en `unmount()`. Esto
  evita el bug clásico de "una respuesta vieja llega tarde y pisa el
  contenido de la vista nueva" cuando el usuario navega rápido entre rutas.

- **`Promise.allSettled` para toda resolución masiva de IDs.** El endpoint
  `/search` de la API solo devuelve `objectID`s; cada uno se resuelve por
  separado con `GET /objects/:id`. Se implementó una sola vez en
  `MetService.resolveIds()` y la reutilizan `HomeView`, `ExploreView`,
  `ArtistView` y `CompareView`. Los rechazos individuales no rompen la
  vista: se cuentan y se muestran como una nota discreta.

- **Agregados calculados solo sobre la página visible.** El panel de
  agregados de `#explore` (departamento dominante, siglo más frecuente,
  cultura más frecuente) se calcula sobre las 12 obras ya resueltas de la
  página actual, no sobre el total del `search` — la API no permite traer
  todos los objetos completos a la vez. Esta limitación se indica
  explícitamente en la interfaz.

- **Preservación de estado al navegar "hacia atrás".** `ExploreView`
  distingue una entrada "fresca" (primera vez, o un departamento distinto
  desde `#departments`) de un regreso desde `#detail/:id`. En el segundo
  caso conserva los filtros y la página en la que estaba el usuario, en
  vez de reiniciar la búsqueda.

- **Router de hash con query params propios.** Se extendió el patrón
  estándar de router de hash para soportar `?clave=valor` además de
  `:parametros` de ruta (por ejemplo `#explore?departmentId=11`), necesario
  para pasar el departamento seleccionado desde `#departments` y la obra
  preseleccionada desde `#detail` hacia `#compare`.

- **Búsqueda con "token" en vez de cancelar la petición.** En el buscador
  interno del comparador (`CompareView`), cada panel lleva un contador
  (`searchToken`) que se incrementa en cada nueva búsqueda; si llega una
  respuesta cuyo token ya no es el vigente, se descarta. Esto resuelve el
  mismo problema de respuestas obsoletas que el `AbortController`, pero a
  nivel de un componente interno de la vista (no toda la vista se
  desmonta al escribir en el buscador).

- **CSS separado por responsabilidad, no por vista.** En vez de un único
  `styles.css`, cada archivo cubre una sola preocupación (tokens, base,
  navbar, galería, estados...). Los estilos específicos de una vista
  compleja (`explore.css`, `compare.css`, etc.) sí se separaron por vista
  para no inflar los archivos compartidos.

- **Sin `innerHTML` para datos externos.** Todo el contenido que proviene
  de la API se construye con `createElement` / `textContent` / `append`,
  cumpliendo el requerimiento de no inyectar HTML de fuentes externas
  directamente.

- **Identidad visual: recreación de Windows 7 con [7.css](https://khang-nd.github.io/7.css/).**
  Toda la app vive dentro de una única "ventana" (`.window.glass.active`)
  con barra de título dinámica (cambia según la ruta activa) y barra de
  estado persistente (hace de footer). La navegación es una taskbar fija
  abajo. Esto es puramente una capa visual: ningún archivo de `js/core/`
  cambió para lograrlo, solo el marcado que construye cada `View` y el CSS.
  Detalles de la reinterpretación por vista:
  - Galerías de obras (`Home`, `Explore`, `Artist`) → vista de íconos estilo
    Explorador de Windows (miniatura + etiqueta).
  - Departamentos → "carpetas" con la misma vista de íconos.
  - Filtros y agregados de `Explore` → GroupBox (`<fieldset><legend>`).
  - Detalle de obra → ventana anidada de "Propiedades" con pestañas
    (General / Etiquetas), usando el componente Tabs de 7.css.
  - Comparador → cada obra seleccionada vive en su propia ventana con
    barra de título ("Obra A" / "Obra B"); los resultados de búsqueda usan
    el componente ListBox nativo; la tabla de diferencias usa la clase
    `.highlighted` que 7.css ya trae para resaltar filas.
  - Loading/Error → barra de progreso "marquee" nativa de 7.css.

---

## Fuente de datos

Datos provistos por la [Open Access API](https://metmuseum.github.io/) del
Metropolitan Museum of Art. Esta aplicación es un proyecto académico y no
está afiliada al museo.
