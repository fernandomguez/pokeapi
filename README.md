# Pokédex

**Explora la Pokédex completa: filtra por tipo, marca favoritos, pagina y busca por nombre o número.**

Práctica con la [PokéAPI](https://pokeapi.co): la pantalla muestra una rejilla con los Pokémon paginados (24 por página, con sprite, número y etiquetas de tipo), 18 chips para filtrar por tipo, un conmutador para quedarse solo con los 1025 oficiales, corazones de favoritos que persisten en `localStorage` y buscador en vivo por nombre parcial o número. Al pulsar una tarjeta se abre la ficha del Pokémon con su imagen oficial, tipos con su color, altura y peso. El estado completo vive en el *hash* de la URL (`#q=bulba&pagina=3&tipos=fuego`): una vista concreta se puede compartir y los botones atrás/adelante funcionan. Está hecho en dos versiones sobre la misma idea:

- **Web** — Pokédex con rejilla, paginado, filtros por tipo, favoritos, búsqueda en vivo y ficha individual.
- **Python (CLI)** — consulta de fichas individuales desde la terminal, para practicar peticiones HTTP sin framework.

## Cómo funciona

La web carga la lista de Pokémon en una única petición (`GET /api/v2/pokemon?limit=2000`, unos 1300 registros) y a partir de ahí la rejilla, el paginado y la búsqueda son locales, sin peticiones extra. Las listas de cada tipo (para los chips de filtro) y los tipos de cada tarjeta (para las etiquetas) se piden bajo demanda la primera vez y quedan en memoria. Los sprites salen del repositorio oficial de sprites de PokéAPI, con `loading="lazy"` y una reserva por si alguna forma alternativa no tiene sprite.

La ficha individual (al pulsar una tarjeta) hace su propia petición a `GET /api/v2/pokemon/{id}` y saca del JSON los campos que interesan:

| Campo | Tratamiento |
| --- | --- |
| `sprites.other.official-artwork` | Imagen oficial; si no existe, cae al `front_default` básico |
| `types` | Pastillas de color (uno por tipo, con la paleta estándar de la franquicia) |
| `height`, `weight` | Convertidos de decímetros/hectogramos a metros y kg, con formato español |

Los errores (sin conexión, sin sprite, Pokémon sin ficha) se capturan y se muestran como mensaje en lugar de romper la aplicación. La ficha se cierra con el botón, con un clic fuera o con `Escape`, y las tarjetas responden al teclado (tabulador + Enter).

## La versión web

HTML, CSS y JavaScript planos, sin dependencias ni build: se abre `index.html` y funciona. La lógica está en `app.js`, con `fetch` y `async/await`; el estado se centraliza en un objeto `estado.filtros` del que se deriva la vista, el filtrado va con un pequeño *debounce* (200 ms) y los favoritos se guardan en `localStorage` (`pokedex-favoritos`). Respeta `prefers-reduced-motion`.

## La versión Python

```bash
pip install requests
python api_python.py
```

Pide un nombre por teclado y muestra la ficha y el enlace al artwork oficial. Usa el operador morsa (`:=`), formatea los nombres que vienen con guiones («latigo-cepa» → «Latigo Cepa») y muestra los 5 primeros movimientos.

## Estructura

| Ruta | Contenido |
| --- | --- |
| [`index.html`](index.html) | Pokédex web: estilos, rejilla, paginación y modal de ficha |
| [`app.js`](app.js) | Lógica de la web: lista, búsqueda, paginado y ficha |
| [`api_python.py`](api_python.py) | Versión de consola en Python |

## Datos

Todos los datos vienen de [PokéAPI](https://pokeapi.co), una API gratuita y de código abierto. Las imágenes oficiales pertenecen a Nintendo/Game Freak.
