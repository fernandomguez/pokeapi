// Pokédex con paginado, filtros por tipo, favoritos y búsqueda sobre la PokéAPI.
//
// Estrategia de red:
//   1. La lista completa de Pokémon se trae UNA vez al cargar (?limit=2000, ~1300 registros).
//   2. Rejilla, paginado, búsqueda y favoritos: todo local.
//   3. Los tipos de cada tarjeta y las listas de tipo se piden solo la primera vez y quedan en memoria.
//   4. La ficha individual hace su propia petición al abrirse.
//
// El estado (búsqueda, página, tipos, favoritos, incluir formas) vive en el hash de la URL,
// así que una búsqueda resultada se puede compartir y atrás/adelante del navegador funcionan.

const APP_VERSION = '7 · reintentos automáticos y aviso QUIC (2026-11-05)';
console.info(`Pokédex · app.js con commit actual · ${APP_VERSION}`);

const API_URL = 'https://pokeapi.co/api/v2/pokemon';
const TIPOS_URL = 'https://pokeapi.co/api/v2/type'; // ¡endpoint aparte! /pokemon/{tipo} da 404
const SPRITES_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const POR_PAGINA = 24;
const ID_ULTIMO_OFICIAL = 1025; // Los IDs mayores son formas alternativas, regionales, etc.

const COLORES_TIPO = {
    normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
    grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
    ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
    rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
    steel: '#B7B7CE', fairy: '#D685AD',
};

const NOMBRES_TIPO = {
    normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico',
    grass: 'Planta', ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno',
    ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho',
    rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro',
    steel: 'Acero', fairy: 'Hada',
};

// Rangos de IDs oficiales por generación (solo válido para IDs 1–1025).
const GENERACIONES = [
    { n: 1, nombre: '1 · Kanto',   rango: [1, 151] },
    { n: 2, nombre: '2 · Johto',   rango: [152, 251] },
    { n: 3, nombre: '3 · Hoenn',   rango: [252, 386] },
    { n: 4, nombre: '4 · Sinnoh',  rango: [387, 493] },
    { n: 5, nombre: '5 · Unova',   rango: [494, 649] },
    { n: 6, nombre: '6 · Kalos',   rango: [650, 721] },
    { n: 7, nombre: '7 · Alola',   rango: [722, 809] },
    { n: 8, nombre: '8 · Galar',   rango: [810, 905] },
    { n: 9, nombre: '9 · Paldea',  rango: [906, 1025] },
];

const ORDENES = {
    'num': 'Número ↑',
    'num-desc': 'Número ↓',
    'az': 'A–Z',
};

const input = document.getElementById('pokemonInput');
const buscarBtn = document.getElementById('buscarBtn');
const resultadoDiv = document.getElementById('resultado');
const paginacionDiv = document.getElementById('paginacion');
const chipsTiposDiv = document.getElementById('chipsTipos');
const chipsGenDiv = document.getElementById('chipsGen');
const chipsOrdenDiv = document.getElementById('chipsOrden');
const soloOficialesInput = document.getElementById('soloOficiales');
const facetaTipo = document.getElementById('facetaTipo');
const facetaGen = document.getElementById('facetaGen');
const facetaOrden = document.getElementById('facetaOrden');
const facetaFav = document.getElementById('facetaFav');
const btnQuitarFiltros = document.getElementById('quitarFiltros');

const estado = {
    cargado: false,
    filtros: {
        q: '',              // texto de búsqueda
        pagina: 0,
        tipos: [],          // tipos seleccionados (se unen con OR)
        generaciones: [],   // generaciones seleccionadas (OR; solo IDs oficiales)
        orden: 'num',       // 'num' | 'num-desc' | 'az'
        soloFavoritos: false,
        incluirFormas: false,
    },
    lista: [],              // [{ id, name }]
    tipoListas: {},         // tipo → Set de ids | 'error'
    tiposPorId: {},         // id → [tipos] (para las etiquetas de la rejilla)
    favoritos: getFavoritosGuardados(),
    hashActual: '',
};

// ---------- Utilidades de favoritos (localStorage) ----------

function getFavoritosGuardados() {
    try {
        return new Set(JSON.parse(localStorage.getItem('pokedex-favoritos') ?? '[]'));
    } catch (error) {
        return new Set();
    }
}

function guardarFavoritos() {
    localStorage.setItem('pokedex-favoritos', JSON.stringify([...estado.favoritos]));
}

function alternarFavorito(id) {
    if (estado.favoritos.has(id)) {
        estado.favoritos.delete(id);
    } else {
        estado.favoritos.add(id);
    }
    guardarFavoritos();
}

// ---------- Estado <-> hash de la URL ----------

function hashDesdeEstado() {
    const params = new URLSearchParams();
    if (estado.filtros.q) params.set('q', estado.filtros.q);
    if (estado.filtros.pagina > 0) params.set('pagina', estado.filtros.pagina + 1);
    if (estado.filtros.tipos.length) params.set('tipos', estado.filtros.tipos.join(','));
    if (estado.filtros.generaciones.length) params.set('gen', estado.filtros.generaciones.join(','));
    if (estado.filtros.orden !== 'num') params.set('orden', estado.filtros.orden);
    if (estado.filtros.soloFavoritos) params.set('fav', '1');
    if (estado.filtros.incluirFormas) params.set('formas', '1');
    return params.toString();
}

let ultimoHashHistorial = location?.hash || ''; // último hash con entrada propia en el historial

function sincronizarHistorial(alHistorial) {
    const hash = `#${hashDesdeEstado()}`;
    estado.hashActual = hash;

    if (alHistorial) {
        // Acción del usuario (aplicar o quitar un filtro, buscar, paginar): entrada nueva.
        // Sin replace previo: el replace machacaría la entrada "anterior" y el botón Atrás no desharía nada.
        if (hash !== ultimoHashHistorial) {
            try {
                history.pushState(null, '', hash === '#' ? location.pathname : hash);
                ultimoHashHistorial = hash;
            } catch (error) {
                /* en file:// algunos navegadores lo bloquean, no es crítico */
            }
        }
    } else {
        // Cambios menores: se reemplaza la entrada actual (no queda rastro en el historial).
        try {
            history.replaceState(null, '', hash === '#' ? location.pathname : hash);
        } catch (error) {
            location.hash = hash; // en file://
        }
    }
}

function estadoDesdeHash() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    const tipos = (params.get('tipos') ?? '').split(',').filter((t) => t in COLORES_TIPO);
    const generaciones = (params.get('gen') ?? '')
        .split(',')
        .map(Number)
        .filter((n) => GENERACIONES.some((g) => g.n === n));
    const orden = params.get('orden');
    return {
        q: params.get('q') ?? '',
        pagina: Math.max(0, (Number(params.get('pagina')) || 1) - 1),
        tipos,
        generaciones,
        orden: orden in ORDENES ? orden : 'num',
        soloFavoritos: params.get('fav') === '1',
        incluirFormas: params.get('formas') === '1',
    };
}

window.addEventListener('hashchange', () => {
    if (location.hash === estado.hashActual) {
        return; // hash puesto por nosotros
    }
    Object.assign(estado.filtros, estadoDesdeHash());
    estado.hashActual = location.hash;
    ultimoHashHistorial = location.hash;
    reflejarControles();
    renderRejilla();
});

// ---------- Lista completa ----------

// Pantalla informativa (y con botón de reintento) para los estados del comienzo.
function pantalla(texto, conReintentar) {
    paginacionDiv.innerHTML = '';
    resultadoDiv.innerHTML = `
        <p class="empty-message">${texto}</p>
        ${conReintentar ? '<button type="button" id="btnReintentar">↺ Reintentar</button>' : ''}
    `;
    resultadoDiv.querySelector('#btnReintentar')?.addEventListener('click', () => cargarLista(true));
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function cargarLista(forzar = false) {
    if (estado.cargado && !forzar) {
        return;
    }
    estado.cargado = false;

    Object.assign(estado.filtros, estadoDesdeHash());
    reflejarControles();

    // Reintenta solo: cortes momentos de red (o QUIC bloqueado que entra y sale) se recuperan sin recargar.
    const INTENTOS = 3;
    for (let intento = 1; intento <= INTENTOS; intento++) {
        pantalla(intento === 1
            ? 'Cargando la lista de Pokémon…'
            : `Sin respuesta de la API · reintentando automáticamente (${intento - 1} de ${INTENTOS - 1})…`);
        try {
            // La PokéAPI tiene ~1302 Pokémon (los 1025 oficiales + formas);
            // con limit alto basta una única petición para todo.
            const response = await fetch(`${API_URL}?limit=2000`);
            if (!response.ok) {
                throw new Error('La API no responde');
            }

            const datos = await response.json();
            estado.lista = datos.results.map((r) => {
                const id = Number(r.url.split('/').filter(Boolean).pop());
                return { id, name: r.name };
            }).sort((a, b) => a.id - b.id);
            estado.cargado = true;
            renderRejilla();
            return;
        } catch (error) {
            if (intento < INTENTOS) {
                await esperar(1500 * intento);
            }
        }
    }

    pantalla('No se ha podido cargar la lista de Pokémon tras reintentar. '
        + 'Tu red puede estar bloqueando la conexión a la API (QUIC): prueba en otro navegador '
        + 'o desactiva QUIC en chrome://flags.', true);
}

function mostrarMensaje(texto) {
    paginacionDiv.innerHTML = '';
    resultadoDiv.innerHTML = `<p class="empty-message">${texto}</p>`;
}

function mostrarError(texto) {
    paginacionDiv.innerHTML = '';
    resultadoDiv.innerHTML = `<div class="error-message">${texto}</div>`;
}

// ---------- Búsqueda ----------

let temporizadorBusqueda;

function buscarAhora() {
    clearTimeout(temporizadorBusqueda);
    estado.filtros.q = input.value;
    estado.filtros.pagina = 0;
    actualizar(true);
}

input.addEventListener('input', () => {
    // El filtrado es local: solo esperamos a dejar de escribir.
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(buscarAhora, 200);
});

input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        buscarAhora();
    }
});

buscarBtn.addEventListener('click', buscarAhora);

// ---------- Conmutadores ----------

soloOficialesInput.addEventListener('change', () => {
    estado.filtros.incluirFormas = !soloOficialesInput.checked;
    estado.filtros.pagina = 0;
    actualizar(true);
});

function alternarTipo(tipo) {
    const activos = estado.filtros.tipos;
    if (activos.includes(tipo)) {
        activos.splice(activos.indexOf(tipo), 1);
    } else {
        activos.push(tipo);
        precargarTipo(tipo);
    }
    estado.filtros.pagina = 0;
    actualizar(true);
}

function alternarFavoritos() {
    estado.filtros.soloFavoritos = !estado.filtros.soloFavoritos;
    estado.filtros.pagina = 0;
    actualizar(true);
}

function alternarGeneracion(n) {
    const activas = estado.filtros.generaciones;
    activas.includes(n)
        ? activas.splice(activas.indexOf(n), 1)
        : activas.push(n);
    estado.filtros.pagina = 0;
    actualizar(true);
}

function alternarOrden(clave) {
    estado.filtros.orden = clave;
    estado.filtros.pagina = 0;
    actualizar(true);
}

// Ordena copia para no reordenar la lista maestra.
function ordenar(lista) {
    const copia = [...lista];
    switch (estado.filtros.orden) {
        case 'az':
            return copia.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        case 'num-desc':
            return copia.sort((a, b) => b.id - a.id);
        default:
            return copia.sort((a, b) => a.id - b.id);
    }
}

// La lista de IDs de un tipo se pide la primera vez que se activa (y otra vez si falla).
async function precargarTipo(tipo) {
    if (estado.tipoListas[tipo] instanceof Set || estado.tipoListas[tipo] === 'cargando') {
        return;
    }
    estado.tipoListas[tipo] = 'cargando';
    try {
        const response = await fetch(`${TIPOS_URL}/${tipo}`);
        if (!response.ok) {
            throw new Error('error');
        }
        const datos = await response.json();
        estado.tipoListas[tipo] = new Set(datos.pokemon.map((p) =>
            Number(p.pokemon.url.split('/').filter(Boolean).pop())));
        renderRejilla();
    } catch (error) {
        estado.tipoListas[tipo] = 'error';
        renderRejilla();
    }
}

function tiposCargados() {
    return estado.filtros.tipos.every((tipo) => estado.tipoListas[tipo] instanceof Set);
}

// ---------- Rejilla ----------

function listaVisible() {
    let lista = estado.lista;

    if (!estado.filtros.incluirFormas) {
        lista = lista.filter((p) => p.id <= ID_ULTIMO_OFICIAL);
    }
    // Por generación: solo IDs oficiales (los de las formas no mapean de forma fiable a ninguna gen).
    if (estado.filtros.generaciones.length) {
        lista = lista.filter((p) => estado.filtros.generaciones.some((n) => {
            const g = GENERACIONES.find((x) => x.n === n);
            return g && p.id >= g.rango[0] && p.id <= g.rango[1];
        }));
    }
    if (estado.filtros.soloFavoritos) {
        lista = lista.filter((p) => estado.favoritos.has(p.id));
    }
    if (estado.filtros.tipos.length && tiposCargados()) {
        lista = lista.filter((p) =>
            estado.filtros.tipos.some((tipo) => estado.tipoListas[tipo].has(p.id)));
    }

    const q = estado.filtros.q.trim().toLowerCase();
    if (q) {
        // Busca por nombre parcial o por número exacto (con o sin #).
        const numero = Number(q.replace('#', ''));
        lista = lista.filter((p) => p.name.includes(q) || p.id === numero);
    }

    return lista;
}

// ---------- Barra de facetas: Tipo | Generación | Ordenar | Favoritos ----------

const PANELES = [
    { boton: facetaTipo, panel: 'panelTipo' },
    { boton: facetaGen, panel: 'panelGen' },
    { boton: facetaOrden, panel: 'panelOrden' },
];

function abrirPanel(panelId) {
    PANELES.forEach(({ boton, panel }) => {
        const abierto = panel === panelId;
        document.getElementById(panel).classList.toggle('oculto', !abierto);
        boton.setAttribute('aria-expanded', String(abierto));
    });
}

function alternarPanel(panelId) {
    const estabaAbierto = !document.getElementById(panelId).classList.contains('oculto');
    if (estabaAbierto) {
        abrirPanel(null); // cierra todos
    } else {
        abrirPanel(panelId); // abre solo este
    }
}

facetaTipo.addEventListener('click', () => alternarPanel('panelTipo'));
facetaGen.addEventListener('click', () => alternarPanel('panelGen'));
facetaOrden.addEventListener('click', () => alternarPanel('panelOrden'));
facetaFav.addEventListener('click', alternarFavoritos);
btnQuitarFiltros.addEventListener('click', quitarFiltros);

// Resetea por completo la barra: tipos, generación, orden, favoritos, formas y búsqueda.
function quitarFiltros() {
    estado.filtros.tipos = [];
    estado.filtros.generaciones = [];
    estado.filtros.orden = 'num';
    estado.filtros.soloFavoritos = false;
    estado.filtros.incluirFormas = false;
    estado.filtros.q = '';
    estado.filtros.pagina = 0;
    actualizar(true);
}

// Etiquetas y resaltados de la barra: cuenta activos en cada faceta.
function actualizarBarra() {
    const nTipos = estado.filtros.tipos.length;
    const nGens = estado.filtros.generaciones.length;
    facetaTipo.innerHTML = `Tipo${nTipos ? ` (${nTipos})` : ''} <span class="flecha" aria-hidden="true">▾</span>`;
    facetaGen.innerHTML = `Generación${nGens ? ` (${nGens})` : ''} <span class="flecha" aria-hidden="true">▾</span>`;
    facetaOrden.innerHTML = `${ORDENES[estado.filtros.orden]} <span class="flecha" aria-hidden="true">▾</span>`;
    facetaFav.setAttribute('aria-pressed', String(estado.filtros.soloFavoritos));
    facetaTipo.classList.toggle('chip--on', nTipos > 0);
    facetaGen.classList.toggle('chip--on', nGens > 0);

    // El botón de quitar filtros solo aparece cuando hay algo que quitar.
    const algoActivo = Boolean(nTipos || nGens || estado.filtros.soloFavoritos
        || estado.filtros.incluirFormas || estado.filtros.orden !== 'num' || estado.filtros.q.trim());
    btnQuitarFiltros.classList.toggle('oculto', !algoActivo);
}

function renderChipsTipos() {
    chipsTiposDiv.innerHTML = `
        ${Object.keys(COLORES_TIPO).map((tipo) => `
            <button type="button" class="chip" data-tipo="${tipo}"
                    aria-pressed="${String(estado.filtros.tipos.includes(tipo))}"
                    style="--tipo: ${COLORES_TIPO[tipo]}">
                ${NOMBRES_TIPO[tipo]}
            </button>
        `).join('')}
    `;

    chipsTiposDiv.querySelectorAll('.chip').forEach((chip) => {
        chip.addEventListener('click', () => alternarTipo(chip.dataset.tipo));
    });
}

function renderGeneraciones() {
    chipsGenDiv.innerHTML = GENERACIONES.map((g) => `
        <button type="button" class="chip" data-gen="${g.n}"
                aria-pressed="${String(estado.filtros.generaciones.includes(g.n))}"
                style="--tipo: var(--primary-color)">
            ${g.nombre}
        </button>
    `).join('');

    chipsGenDiv.querySelectorAll('.chip').forEach((chip) => {
        chip.addEventListener('click', () => alternarGeneracion(Number(chip.dataset.gen)));
    });
}

function renderOrdenes() {
    chipsOrdenDiv.innerHTML = Object.keys(ORDENES).map((clave) => `
        <button type="button" class="chip" data-orden="${clave}"
                aria-pressed="${String(estado.filtros.orden === clave)}"
                style="--tipo: var(--primary-color)">
            ${ORDENES[clave]}
        </button>
    `).join('');

    chipsOrdenDiv.querySelectorAll('.chip').forEach((chip) => {
        chip.addEventListener('click', () => alternarOrden(chip.dataset.orden));
    });
}

function actualizar(alHistorial = false) {
    sincronizarHistorial(alHistorial);
    renderRejilla();
}

function reflejarControles() {
    input.value = estado.filtros.q;
    soloOficialesInput.checked = !estado.filtros.incluirFormas;
    renderChipsTipos();
    renderGeneraciones();
    renderOrdenes();
    actualizarBarra();
}

function renderRejilla() {
    if (!estado.cargado) {
        return;
    }
    reflejarControles();

    // Al tratar los chips de tipo se piden sus listas; hasta que estén, no se filtra a medias.
    estado.filtros.tipos.forEach(precargarTipo);
    if (estado.filtros.tipos.length && !tiposCargados()) {
        const fallidos = estado.filtros.tipos.filter((t) => estado.tipoListas[t] === 'error');
        if (fallidos.length) {
            paginacionDiv.innerHTML = '';
            resultadoDiv.innerHTML = `
                <p class="empty-message">No se ha podido cargar el filtro de tipos.</p>
                <button type="button" id="btnReintentarTipos">↺ Reintentar</button>
            `;
            resultadoDiv.querySelector('#btnReintentarTipos')?.addEventListener('click', () => {
                fallidos.forEach((t) => { delete estado.tipoListas[t]; });
                estado.filtros.tipos.forEach(precargarTipo);
            });
            return;
        }
        mostrarMensaje('Cargando el filtro de tipos…');
        return;
    }

    const lista = ordenar(listaVisible());
    const total = lista.length;

    if (total === 0) {
        let motivo;
        if (estado.filtros.soloFavoritos && !estado.favoritos.size) {
            motivo = 'Todavía no tienes favoritos: pulsa el corazón de cualquier tarjeta para guardarla.';
        } else if (estado.filtros.soloFavoritos) {
            motivo = 'Ninguno de tus favoritos coincide con la búsqueda o los filtros activos.';
        } else {
            motivo = `No se ha encontrado ningún Pokémon para «${estado.filtros.q.trim()}».`;
        }
        mostrarMensaje(motivo);
        return;
    }

    const totalPaginas = Math.ceil(total / POR_PAGINA);
    if (estado.filtros.pagina >= totalPaginas) {
        estado.filtros.pagina = totalPaginas - 1;
    }

    const inicio = estado.filtros.pagina * POR_PAGINA;
    const paginados = lista.slice(inicio, inicio + POR_PAGINA);

    resultadoDiv.innerHTML = `
        <div class="p-grid">
            ${paginados.map((p) => tarjeta(p)).join('')}
        </div>
    `;

    activarTarjetas(resultadoDiv);
    renderPaginacion(total, totalPaginas);
    // Cargamos los tipos de los visibles para pintar las etiquetas.
    cargarTiposDeVisibles(paginados.map((p) => p.id));
}

function tarjeta(p) {
    const esFavorito = estado.favoritos.has(p.id);
    const tipos = estado.tiposPorId[p.id];
    const badges = Array.isArray(tipos)
        ? tipos.map((tipo) => escudoTipo(tipo)).join('')
        : '';
    return `
        <div class="p-card" data-id="${p.id}" data-name="${p.name}"
             tabindex="0" role="button" aria-label="Abrir la ficha de ${p.name}">
            <button type="button" class="corazon ${esFavorito ? 'corazon--activo' : ''}"
                    aria-pressed="${String(esFavorito)}"
                    aria-label="${esFavorito ? 'Quitar' : 'Guardar'} en favoritos">♥</button>
            <img src="${SPRITES_URL}/${p.id}.png" alt="Sprite de ${p.name}" loading="lazy">
            <span class="nombre">${p.name}</span>
            <span class="num">#${String(p.id).padStart(4, '0')}</span>
            <span class="badges">${badges}</span>
        </div>
    `;
}

function escudoTipo(tipo) {
    return `<span class="badge-tipo" style="background-color: ${COLORES_TIPO[tipo] ?? '#777'}">${NOMBRES_TIPO[tipo] ?? tipo}</span>`;
}

function activarTarjetas(raiz) {
    // Algunas formas alternativas (IDs altos) no tienen sprite: se oculta la imagen y no se rompe nada.
    raiz.querySelectorAll('img').forEach((img) => {
        img.addEventListener('error', () => img.remove(), { once: true });
    });

    raiz.querySelectorAll('.p-card').forEach((card) => {
        const abrir = () => abrirFicha(Number(card.dataset.id));

        card.addEventListener('click', abrir);
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                abrir();
            }
        });

        // El corazón no debe abrir la ficha: se aísla su clic.
        const corazon = card.querySelector('.corazon');
        corazon.addEventListener('click', (event) => {
            event.stopPropagation();
            const id = Number(card.dataset.id);
            alternarFavorito(id);
            const activo = estado.favoritos.has(id);
            corazon.classList.toggle('corazon--activo', activo);
            corazon.setAttribute('aria-pressed', String(activo));
            corazon.setAttribute('aria-label', `${activo ? 'Quitar' : 'Guardar'} en favoritos`);
            if (estado.filtros.soloFavoritos) {
                renderRejilla();
            }
        });
    });
}

// ---------- Tipos de los visibles (etiquetas de la rejilla) ----------

async function cargarTiposDeVisibles(ids) {
    const pendientes = ids.filter((id) => !(id in estado.tiposPorId));
    await Promise.allSettled(pendientes.map(async (id) => {
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) {
            throw new Error('error');
        }
        const datos = await response.json();
        const tipos = datos.types?.map((t) => t.type.name) ?? [];
        estado.tiposPorId[id] = tipos;

        // Sin recargar la página: se añaden las etiquetas a su tarjeta si sigue en pantalla.
        const badges = resultadoDiv.querySelector(`.p-card[data-id="${id}"] .badges`);
        if (badges) {
            badges.innerHTML = tipos.map((t) => escudoTipo(t)).join('');
        }
    }));
}

// ---------- Paginado ----------

function renderPaginacion(total, totalPaginas) {
    const pag = estado.filtros.pagina;
    paginacionDiv.innerHTML = `
        <button type="button" id="pagInicio" aria-label="Primera página" ${pag === 0 ? 'disabled' : ''}>&laquo;</button>
        <button type="button" id="pagPrev" aria-label="Página anterior" ${pag === 0 ? 'disabled' : ''}>&lsaquo;</button>
        <span class="info">${total} Pokémon · Página ${pag + 1} de ${totalPaginas}</span>
        <button type="button" id="pagNext" aria-label="Página siguiente" ${pag >= totalPaginas - 1 ? 'disabled' : ''}>&rsaquo;</button>
        <button type="button" id="pagFin" aria-label="Última página" ${pag >= totalPaginas - 1 ? 'disabled' : ''}>&raquo;</button>
    `;

    document.getElementById('pagInicio').addEventListener('click', () => cambiarPagina(0));
    document.getElementById('pagPrev').addEventListener('click', () => cambiarPagina(pag - 1));
    document.getElementById('pagNext').addEventListener('click', () => cambiarPagina(pag + 1));
    document.getElementById('pagFin').addEventListener('click', () => cambiarPagina(totalPaginas - 1));
}

function cambiarPagina(numero) {
    estado.filtros.pagina = numero;
    actualizar(true);
    // Scroll suave al principio de la rejilla para no perderse entre páginas.
    resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- Ficha individual ----------

async function abrirFicha(id) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal__card" role="dialog" aria-modal="true">
            <button type="button" class="modal__cerrar" aria-label="Cerrar">✕</button>
            <p class="empty-message">Cargando ficha…</p>
        </div>
    `;
    document.body.appendChild(modal);
    cerrarConModal(modal);

    try {
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) {
            throw new Error('Pokémon no encontrado');
        }

        const datos = await response.json();
        const nombre = datos.name.toUpperCase();
        const altura = (datos.height / 10).toLocaleString('es-ES');
        const peso = (datos.weight / 10).toLocaleString('es-ES');
        const imagenes = datos.sprites?.other ?? {};
        const imagen = imagenes['official-artwork']?.front_default ?? datos.sprites?.front_default;
        const tipos = datos.types?.map((t) => t.type.name) ?? [];

        // La ficha también alimenta la caché de tipos de la rejilla.
        estado.tiposPorId[id] = tipos;

        const activo = estado.favoritos.has(id);
        modal.querySelector('.modal__card').innerHTML = `
            <button type="button" class="modal__cerrar" aria-label="Cerrar">✕</button>
            <img src="${imagen}" alt="${nombre}">
            <div class="modal__titulo">
                <h2>${nombre}</h2>
                <button type="button" class="corazon corazon--modal ${activo ? 'corazon--activo' : ''}"
                        aria-pressed="${String(activo)}"
                        aria-label="${activo ? 'Quitar' : 'Guardar'} en favoritos">♥</button>
            </div>
            <div class="tipos">
                ${tipos.map((tipo) => `
                    <span class="tipo" style="background-color: ${COLORES_TIPO[tipo] ?? '#777'}">${NOMBRES_TIPO[tipo] ?? tipo}</span>
                `).join('')}
            </div>
            <div class="pokemon-info">
                <span><strong>Altura:</strong> ${altura} m</span>
                <span><strong>Peso:</strong> ${peso} kg</span>
            </div>
        `;

        // El innerHTML ha sustituido el botón de cerrar: devolvemos el foco a él.
        modal.querySelector('.modal__cerrar').focus();

        const corazon = modal.querySelector('.corazon--modal');
        corazon.addEventListener('click', () => {
            alternarFavorito(id);
            const ahoraActivo = estado.favoritos.has(id);
            corazon.classList.toggle('corazon--activo', ahoraActivo);
            corazon.setAttribute('aria-pressed', String(ahoraActivo));
            corazon.setAttribute('aria-label', `${ahoraActivo ? 'Quitar' : 'Guardar'} en favoritos`);

            // La tarjeta del grid comparte estado: sincronizamos su corazón
            // para que al salir de la ficha lo vea marcado o desmarcado.
            const corazonTarjeta = document.querySelector(`.p-card[data-id="${id}"] .corazon`);
            if (corazonTarjeta) {
                corazonTarjeta.classList.toggle('corazon--activo', ahoraActivo);
                corazonTarjeta.setAttribute('aria-pressed', String(ahoraActivo));
                corazonTarjeta.setAttribute('aria-label', `${ahoraActivo ? 'Quitar' : 'Guardar'} en favoritos`);
            }
            // Con el filtro de favoritos activo, la tarjeta debe aparecer
            // o desaparecer del grid según el nuevo estado.
            if (estado.filtros.soloFavoritos) {
                renderRejilla();
            }
        });
    } catch (error) {
        modal.querySelector('.modal__card').innerHTML = `
            <button type="button" class="modal__cerrar" aria-label="Cerrar">✕</button>
            <div class="error-message">No se ha podido cargar la ficha.</div>
        `;
    }
}

function cerrarConModal(modal) {
    const cerrar = () => {
        document.removeEventListener('keydown', conEscape);
        modal.remove();
    };
    const conEscape = (event) => {
        if (event.key === 'Escape') {
            cerrar();
        }
    };
    modal.addEventListener('click', (event) => {
        if (event.target === modal || event.target.closest('.modal__cerrar')) {
            cerrar();
        }
    });
    // El listener vive en document: Escape cierra la ficha aunque el foco no esté dentro del modal.
    document.addEventListener('keydown', conEscape);
    modal.querySelector('.modal__cerrar').focus();
}

cargarLista();
