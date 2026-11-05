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

const API_URL = 'https://pokeapi.co/api/v2/pokemon';
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

const input = document.getElementById('pokemonInput');
const buscarBtn = document.getElementById('buscarBtn');
const resultadoDiv = document.getElementById('resultado');
const paginacionDiv = document.getElementById('paginacion');
const chipsTiposDiv = document.getElementById('chipsTipos');
const soloOficialesInput = document.getElementById('soloOficiales');
const btnFiltros = document.getElementById('btnFiltros');
const panelFiltros = document.getElementById('panelFiltros');
const filtrosResumen = document.getElementById('filtrosResumen');

const estado = {
    cargado: false,
    filtros: {
        q: '',              // texto de búsqueda
        pagina: 0,
        tipos: [],          // tipos seleccionados (se unen con OR)
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

function sincronizarHash() {
    const params = new URLSearchParams();
    if (estado.filtros.q) params.set('q', estado.filtros.q);
    if (estado.filtros.pagina > 0) params.set('pagina', estado.filtros.pagina + 1);
    if (estado.filtros.tipos.length) params.set('tipos', estado.filtros.tipos.join(','));
    if (estado.filtros.soloFavoritos) params.set('fav', '1');
    if (estado.filtros.incluirFormas) params.set('formas', '1');

    estado.hashActual = `#${params.toString()}`;
    try {
        history.replaceState(null, '', estado.hashActual || location.pathname);
    } catch (error) {
        // Útil solo en http/https: en file:// algunos navegadores lo bloquean, y no es crítico.
        location.hash = estado.hashActual;
    }
}

function estadoDesdeHash() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    const tipos = (params.get('tipos') ?? '').split(',').filter((t) => t in COLORES_TIPO);
    return {
        q: params.get('q') ?? '',
        pagina: Math.max(0, (Number(params.get('pagina')) || 1) - 1),
        tipos,
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
    reflejarControles();
    renderRejilla();
});

// ---------- Lista completa ----------

async function cargarLista() {
    if (estado.cargado) {
        return;
    }

    Object.assign(estado.filtros, estadoDesdeHash());
    reflejarControles();
    mostrarMensaje('Cargando la lista de Pokémon…');

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
    } catch (error) {
        mostrarError('No se ha podido cargar la lista de Pokémon. Comprueba tu conexión y recarga la página.');
    }
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
    actualizar();
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
    actualizar();
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
    actualizar();
}

function alternarFavoritos() {
    estado.filtros.soloFavoritos = !estado.filtros.soloFavoritos;
    estado.filtros.pagina = 0;
    actualizar();
}

// La lista de IDs de un tipo se pide la primera vez que se activa (y otra vez si falla).
async function precargarTipo(tipo) {
    if (estado.tipoListas[tipo] instanceof Set || estado.tipoListas[tipo] === 'cargando') {
        return;
    }
    estado.tipoListas[tipo] = 'cargando';
    try {
        const response = await fetch(`${API_URL}/${tipo}`);
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

function renderChips() {
    chipsTiposDiv.innerHTML = `
        ${Object.keys(COLORES_TIPO).map((tipo) => `
            <button type="button" class="chip" data-tipo="${tipo}"
                    aria-pressed="${String(estado.filtros.tipos.includes(tipo))}"
                    style="--tipo: ${COLORES_TIPO[tipo]}">
                ${NOMBRES_TIPO[tipo]}
            </button>
        `).join('')}
        <button type="button" class="chip chip--favoritos"
                aria-pressed="${String(estado.filtros.soloFavoritos)}">
            ★ Favoritos
        </button>
    `;

    chipsTiposDiv.querySelectorAll('.chip[data-tipo]').forEach((chip) => {
        chip.addEventListener('click', () => alternarTipo(chip.dataset.tipo));
    });
    chipsTiposDiv.querySelector('.chip--favoritos').addEventListener('click', alternarFavoritos);

    actualizarResumenFiltros();
}

// Resumen en el botón del desplegable: cuántos filtros hay activos.
function actualizarResumenFiltros() {
    const n = estado.filtros.tipos.length
        + (estado.filtros.soloFavoritos ? 1 : 0)
        + (estado.filtros.incluirFormas ? 1 : 0);
    filtrosResumen.textContent = n ? `(${n})` : '';
    btnFiltros.classList.toggle('chip--on', n > 0);
}

// Abrir y cerrar el panel de filtros.
btnFiltros.addEventListener('click', () => {
    const oculto = panelFiltros.classList.toggle('oculto');
    btnFiltros.setAttribute('aria-expanded', String(!oculto));
});

function actualizar() {
    sincronizarHash();
    renderRejilla();
}

function reflejarControles() {
    input.value = estado.filtros.q;
    soloOficialesInput.checked = !estado.filtros.incluirFormas;
    renderChips();
}

function renderRejilla() {
    if (!estado.cargado) {
        return;
    }
    renderChips();

    // Al tratar los chips de tipo se piden sus listas; hasta que estén, no se filtra a medias.
    estado.filtros.tipos.forEach(precargarTipo);
    if (estado.filtros.tipos.length && !tiposCargados()) {
        mostrarMensaje('Cargando el filtro de tipos…');
        return;
    }

    const lista = listaVisible();
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
    actualizar();
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
