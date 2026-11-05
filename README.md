# Pokédex

**Busca cualquier Pokémon por su nombre y mira su ficha al instante.**

Buscador de práctica con la [PokéAPI](https://pokeapi.co): escribes «pikachu», «ditto» o el que quieras y recibes su tarjeta con imagen oficial, tipo, altura y peso. Está hecho en dos versiones sobre la misma idea:

- **Web** — buscador con tarjeta animada y manejo de errores directamente en el navegador.
- **Python (CLI)** — la misma consulta desde la terminal, para practicar peticiones HTTP sin framework.

## Cómo funciona

Ambas versiones llaman al endpoint `GET /api/v2/pokemon/{nombre}` de PokéAPI y sacan del JSON los campos que interesan:

| Campo | Tratamiento |
| --- | --- |
| `name` | Nombre en mayúsculas o capitalizado |
| `sprites.other.official-artwork` | Imagen oficial (150×150 en la web) |
| `types` | Tipos separados por coma (web) o el primero (CLI) |
| `height`, `weight` | Convertidos de decímetros/hectogramos a metros y kg |

Los errores (nombre mal escrito, Pokémon inexistente, sin conexión) se capturan y se muestran como mensaje en lugar de romper la aplicación.

## La versión web

HTML, CSS y JavaScript planos, sin dependencias ni build: se abre `index.html` y funciona. La lógica está en `app.js`, con `fetch` y `async/await`; la plantilla de la tarjeta se genera con template strings y entra con una animación de fundido.

## La versión Python

```bash
pip install requests
python api_python.py
```

Pide un nombre por teclado y muestra la ficha y el enlace al artwork oficial. Usa el operador morsa (`:=`), formatea los nombres que vienen con guiones («latigo-cepa» → «Latigo Cepa») y muestra los 5 primeros movimientos.

## Estructura

| Ruta | Contenido |
| --- | --- |
| [`index.html`](index.html) | Buscador web: estilos y estructura |
| [`app.js`](app.js) | Lógica de la web: consulta y tarjeta |
| [`api_python.py`](api_python.py) | Versión de consola en Python |

## Datos

Todos los datos vienen de [PokéAPI](https://pokeapi.co), una API gratuita y de código abierto. Las imágenes oficiales pertenecen a Nintendo/Game Freak.
