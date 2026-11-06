// Interfaz: todo lo que dibuja en la página (rejilla, tarjetas, chips, paginación).

const input = document.getElementById('pokemonInput');
const resultadoDiv = document.getElementById('resultado');
const paginacionDiv = document.getElementById('paginacion');
const chipsTiposDiv = document.getElementById('chipsTipos');
const chipsGenDiv = document.getElementById('chipsGen');
const chipsOrdenDiv = document.getElementById('chipsOrden');
const facetaTipo = document.getElementById('facetaTipo');
const facetaGen = document.getElementById('facetaGen');
const facetaOrden = document.getElementById('facetaOrden');
const facetaFav = document.getElementById('facetaFav');
const btnQuitarFiltros = document.getElementById('quitarFiltros');

// ---------- Mensajes ----------

function mostrarMensaje(texto) {
    paginacionDiv.innerHTML = '';
    resultadoDiv.innerHTML = `<p class="empty-message">${texto}</p>`;
}

function mostrarError(texto) {
    paginacionDiv.innerHTML = '';
    resultadoDiv.innerHTML = `<div class="error-message">${texto}</div>`;
}

// Error con un botón para volver a intentarlo.
function mostrarErrorConReintento(texto, funcionReintentar) {
    paginacionDiv.innerHTML = '';
    resultadoDiv.innerHTML = `
        <p class="empty-message">${texto}</p>
        <button type="button" id="btnReintentar">↺ Reintentar</button>
    `;
    document.getElementById('btnReintentar').addEventListener('click', funcionReintentar);
}

// ---------- Barra de filtros ----------

// Los tres paneles desplegables (Tipo, Generación, Ordenar): solo uno abierto a la vez.
const PANELES = [
    { boton: facetaTipo, panel: 'panelTipo' },
    { boton: facetaGen, panel: 'panelGen' },
    { boton: facetaOrden, panel: 'panelOrden' },
];

function alternarPanel(panelId) {
    const panelElegido = document.getElementById(panelId);
    const estabaAbierto = !panelElegido.classList.contains('oculto');

    for (const p of PANELES) {
        // Se abre solo el elegido, y si ya estaba abierto se cierran todos.
        const abrir = p.panel === panelId && !estabaAbierto;
        document.getElementById(p.panel).classList.toggle('oculto', !abrir);
        p.boton.setAttribute('aria-expanded', String(abrir));
    }
}

// Pone en cada control (buscador, chips, botones) el valor que tiene el estado.
function reflejarControles() {
    const f = estado.filtros;
    input.value = f.texto;

    chipsTiposDiv.innerHTML = Object.keys(COLORES_TIPO).map((tipo) => `
        <button type="button" class="chip" data-tipo="${tipo}"
                aria-pressed="${f.tipos.includes(tipo)}"
                style="--tipo: ${COLORES_TIPO[tipo]}">
            ${NOMBRES_TIPO[tipo]}
        </button>
    `).join('');

    chipsGenDiv.innerHTML = GENERACIONES.map((g) => `
        <button type="button" class="chip" data-gen="${g.n}"
                aria-pressed="${f.generaciones.includes(g.n)}">
            ${g.nombre}
        </button>
    `).join('');

    chipsOrdenDiv.innerHTML = Object.keys(ORDENES).map((clave) => `
        <button type="button" class="chip" data-orden="${clave}"
                aria-pressed="${f.orden === clave}">
            ${ORDENES[clave]}
        </button>
    `).join('');

    // Textos de los botones de la barra: entre paréntesis, cuántos filtros hay activos.
    const nTipos = f.tipos.length;
    const nGens = f.generaciones.length;
    facetaTipo.innerHTML = `Tipo${nTipos ? ` (${nTipos})` : ''} <span class="flecha" aria-hidden="true">▾</span>`;
    facetaGen.innerHTML = `Generación${nGens ? ` (${nGens})` : ''} <span class="flecha" aria-hidden="true">▾</span>`;
    facetaOrden.innerHTML = `${ORDENES[f.orden]} <span class="flecha" aria-hidden="true">▾</span>`;
    facetaTipo.classList.toggle('chip--on', nTipos > 0);
    facetaGen.classList.toggle('chip--on', nGens > 0);
    facetaFav.setAttribute('aria-pressed', String(f.soloFavoritos));

    // "Quitar filtros" solo se ve si hay algo que quitar.
    const hayFiltros = nTipos > 0 || nGens > 0 || f.soloFavoritos || f.orden !== 'num' || f.texto.trim() !== '';
    btnQuitarFiltros.classList.toggle('oculto', !hayFiltros);
}

// ---------- Rejilla ----------

function renderizar() {
    reflejarControles();

    const lista = listaVisible();
    const total = lista.length;

    if (total === 0) {
        mostrarMensaje(textoSinResultados());
        return;
    }

    // Si hemos quedado fuera de rango (por ejemplo, al quitar un favorito de la última página), se retrocede.
    const totalPaginas = Math.ceil(total / POR_PAGINA);
    if (estado.filtros.pagina >= totalPaginas) {
        estado.filtros.pagina = totalPaginas - 1;
    }

    const inicio = estado.filtros.pagina * POR_PAGINA;
    const paginaActual = lista.slice(inicio, inicio + POR_PAGINA);

    resultadoDiv.innerHTML = `
        <div class="p-grid">
            ${paginaActual.map((p) => tarjeta(p)).join('')}
        </div>
    `;
    activarTarjetas();
    renderPaginacion(total, totalPaginas);
    cargarTiposDeVisibles(paginaActual);
}

function textoSinResultados() {
    if (estado.filtros.soloFavoritos && favoritos.length === 0) {
        return 'Todavía no tienes favoritos: pulsa el corazón de cualquier tarjeta para guardarla.';
    }
    if (estado.filtros.soloFavoritos) {
        return 'Ninguno de tus favoritos coincide con la búsqueda o los filtros activos.';
    }
    return `No se ha encontrado ningún Pokémon para «${estado.filtros.texto.trim()}».`;
}

function tarjeta(p) {
    const activo = esFavorito(p.id);
    const tipos = estado.tiposPorId[p.id] ?? []; // si aún no se conocen, sin etiquetas
    return `
        <div class="p-card" data-id="${p.id}" tabindex="0" role="button"
             aria-label="Abrir la ficha de ${p.name}">
            <button type="button" class="corazon ${activo ? 'corazon--activo' : ''}"
                    aria-pressed="${activo}"
                    aria-label="${activo ? 'Quitar' : 'Guardar'} en favoritos">♥</button>
            <img src="${SPRITES_URL}/${p.id}.png" alt="Sprite de ${p.name}" loading="lazy">
            <span class="nombre">${p.name}</span>
            <span class="num">#${String(p.id).padStart(4, '0')}</span>
            <span class="badges">${tipos.map(etiquetaTipo).join('')}</span>
        </div>
    `;
}

function etiquetaTipo(tipo) {
    return `<span class="badge-tipo" style="background-color: ${COLORES_TIPO[tipo]}">${NOMBRES_TIPO[tipo]}</span>`;
}

// Cambia el aspecto de un corazón según esté activo o no (lo usan la tarjeta y la ficha).
function pintarCorazon(boton, activo) {
    boton.classList.toggle('corazon--activo', activo);
    boton.setAttribute('aria-pressed', String(activo));
    boton.setAttribute('aria-label', `${activo ? 'Quitar' : 'Guardar'} en favoritos`);
}

// Añade los eventos de clic a las tarjetas recién dibujadas.
function activarTarjetas() {
    // Algunas formas alternativas no tienen sprite: si la imagen falla, se quita.
    for (const img of resultadoDiv.querySelectorAll('img')) {
        img.addEventListener('error', () => img.remove());
    }

    for (const card of resultadoDiv.querySelectorAll('.p-card')) {
        const id = Number(card.dataset.id);

        card.addEventListener('click', () => abrirFicha(id));
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                abrirFicha(id);
            }
        });

        const corazon = card.querySelector('.corazon');
        corazon.addEventListener('click', (event) => {
            event.stopPropagation(); // para que el clic no llegue a la tarjeta y abra la ficha
            alternarFavorito(id);
            pintarCorazon(corazon, esFavorito(id));
            if (estado.filtros.soloFavoritos) {
                renderizar(); // la tarjeta debe desaparecer de la lista
            }
        });
    }
}

// Pide a la API los tipos de las tarjetas visibles y va rellenando las etiquetas.
function cargarTiposDeVisibles(pokemons) {
    for (const p of pokemons) {
        if (p.id in estado.tiposPorId) {
            continue; // ya los tenemos
        }
        pedirPokemon(p.id)
            .then((datos) => {
                const tipos = datos.types.map((t) => t.type.name);
                estado.tiposPorId[p.id] = tipos;

                // Si la tarjeta sigue en pantalla, se le añaden las etiquetas.
                const badges = document.querySelector(`.p-card[data-id="${p.id}"] .badges`);
                if (badges) {
                    badges.innerHTML = tipos.map(etiquetaTipo).join('');
                }
            })
            .catch(() => {
                // Si falla, la tarjeta se queda sin etiquetas y no pasa nada más.
            });
    }
}

// ---------- Paginación ----------

function renderPaginacion(total, totalPaginas) {
    const pagina = estado.filtros.pagina;
    const enPrimera = pagina === 0;
    const enUltima = pagina === totalPaginas - 1;

    paginacionDiv.innerHTML = `
        <button type="button" id="pagInicio" aria-label="Primera página" ${enPrimera ? 'disabled' : ''}>&laquo;</button>
        <button type="button" id="pagPrev" aria-label="Página anterior" ${enPrimera ? 'disabled' : ''}>&lsaquo;</button>
        <span class="info">${total} Pokémon, página ${pagina + 1} de ${totalPaginas}</span>
        <button type="button" id="pagNext" aria-label="Página siguiente" ${enUltima ? 'disabled' : ''}>&rsaquo;</button>
        <button type="button" id="pagFin" aria-label="Última página" ${enUltima ? 'disabled' : ''}>&raquo;</button>
    `;

    document.getElementById('pagInicio').addEventListener('click', () => cambiarPagina(0));
    document.getElementById('pagPrev').addEventListener('click', () => cambiarPagina(pagina - 1));
    document.getElementById('pagNext').addEventListener('click', () => cambiarPagina(pagina + 1));
    document.getElementById('pagFin').addEventListener('click', () => cambiarPagina(totalPaginas - 1));
}

function cambiarPagina(numero) {
    estado.filtros.pagina = numero;
    renderizar();
    resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
