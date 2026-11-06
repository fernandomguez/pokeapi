# Pokédex

**Explora la Pokédex completa: filtra por tipo, marca favoritos, pagina y busca por nombre o número.**

Práctica con la [PokéAPI](https://pokeapi.co): la pantalla muestra una barra "**Filtrar por: Tipo | Generación | Ordenar | Favoritos**", cada faceta con su desplegable (los 18 tipos, las 9 generaciones por rangos de ID, y el orden por número o A–Z), un interruptor de favoritos que persiste en `localStorage`, un buscador en vivo por nombre parcial o número. Debajo, una rejilla paginada de 24 tarjetas con sprite, número y etiquetas de tipo; al pulsar una tarjeta se abre la ficha del Pokémon con su imagen oficial, tipos con su color, altura y peso. Está hecho en dos versiones sobre la misma idea:

- **Web** — Pokédex con rejilla, paginado, filtros por tipo, favoritos, búsqueda en vivo y ficha individual.
- **Python (CLI)** — consulta de fichas individuales desde la terminal, para practicar peticiones HTTP sin framework.

## Cómo funciona

La web carga la lista de Pokémon en una única petición (`GET /api/v2/pokemon?limit=2000`, unos 1300 registros) y a partir de ahí la rejilla, el paginado, la búsqueda y el filtro de generación son locales, sin peticiones extra. Las listas de cada tipo (para la faceta Tipo) y los tipos de cada tarjeta (para las etiquetas) se piden bajo demanda la primera vez y quedan en memoria. Los sprites salen del repositorio oficial de sprites de PokéAPI, con `loading="lazy"` y una reserva por si alguna forma alternativa no tiene sprite.

La ficha individual (al pulsar una tarjeta) hace su propia petición a `GET /api/v2/pokemon/{id}` y saca del JSON los campos que interesan:

| Campo | Tratamiento |
| --- | --- |
| `sprites.other.official-artwork` | Imagen oficial; si no existe, cae al `front_default` básico |
| `types` | Pastillas de color (uno por tipo, con la paleta estándar de la franquicia) |
| `height`, `weight` | Convertidos de decímetros/hectogramos a metros y kg, con formato español |

Los errores (sin conexión, sin sprite, Pokémon sin ficha) se capturan y se muestran como mensaje en lugar de romper la aplicación. La ficha se cierra con el botón, con un clic fuera o con `Escape`, y las tarjetas responden al teclado (tabulador + Enter).

## La versión web

HTML, CSS y JavaScript planos, sin dependencias ni build: se abre `index.html` y funciona. La lógica está repartida en varios archivos de `js/` (ver Estructura), con `fetch` y `async/await`; el estado se centraliza en un objeto `estado` del que se dibuja la vista y los favoritos se guardan en `localStorage` (`pokedex-favoritos`). Respeta `prefers-reduced-motion`.

## La versión Python

```bash
pip install requests
python api_python.py
```

Pide un nombre por teclado y muestra la ficha y el enlace al artwork oficial. Usa el operador morsa (`:=`), formatea los nombres que vienen con guiones («latigo-cepa» → «Latigo Cepa») y muestra los 5 primeros movimientos.

## Estructura

| Ruta | Contenido |
| --- | --- |
| [`index.html`](index.html) | Estructura de la página |
| [`css/style.css`](css/style.css) | Estilos |
| [`js/datos.js`](js/datos.js) | Constantes: URLs, colores y nombres de tipos, generaciones |
| [`js/favoritos.js`](js/favoritos.js) | Favoritos en `localStorage` |
| [`js/api.js`](js/api.js) | Peticiones a la PokéAPI |
| [`js/filtros.js`](js/filtros.js) | Estado, filtrado y orden |
| [`js/ui.js`](js/ui.js) | Dibujo de la rejilla, chips y paginación |
| [`js/ficha.js`](js/ficha.js) | Ventana con la ficha del Pokémon |
| [`js/main.js`](js/main.js) | Carga inicial y eventos |
| [`api_python.py`](api_python.py) | Versión de consola en Python |

## Datos

Todos los datos vienen de [PokéAPI](https://pokeapi.co), una API gratuita y de código abierto. Las imágenes oficiales pertenecen a Nintendo/Game Freak.
