// Punto de entrada: carga la lista y conecta los eventos de la página.

async function cargarLista() {
    mostrarMensaje('Cargando la lista de Pokémon…');
    try {
        estado.lista = await pedirLista();
        estado.cargado = true;
        renderizar();
    } catch (error) {
        mostrarErrorConReintento('No se ha podido cargar la lista de Pokémon.', cargarLista);
    }
}

// ---------- Búsqueda ----------

function buscar() {
    estado.filtros.texto = input.value;
    estado.filtros.pagina = 0;
    renderizar();
}

input.addEventListener('input', buscar);
document.getElementById('buscarBtn').addEventListener('click', buscar);

// ---------- Filtros ----------

facetaTipo.addEventListener('click', () => alternarPanel('panelTipo'));
facetaGen.addEventListener('click', () => alternarPanel('panelGen'));
facetaOrden.addEventListener('click', () => alternarPanel('panelOrden'));

facetaFav.addEventListener('click', () => {
    estado.filtros.soloFavoritos = !estado.filtros.soloFavoritos;
    estado.filtros.pagina = 0;
    renderizar();
});

btnQuitarFiltros.addEventListener('click', () => {
    quitarFiltros();
    renderizar();
});

// Los chips se vuelven a crear en cada renderizado, así que el clic se escucha en el
// contenedor, que no cambia, y se mira en qué chip se ha pulsado (delegación de eventos).
chipsTiposDiv.addEventListener('click', async (event) => {
    const chip = event.target.closest('.chip');
    if (chip === null) {
        return;
    }
    const tipo = chip.dataset.tipo;

    // La lista de ids de un tipo se pide la primera vez que se elige y se guarda.
    if (!(tipo in estado.idsPorTipo)) {
        mostrarMensaje('Cargando el filtro de tipos…');
        try {
            estado.idsPorTipo[tipo] = await pedirIdsDeTipo(tipo);
        } catch (error) {
            mostrarError('No se ha podido cargar el filtro de tipos. Prueba de nuevo.');
            return;
        }
    }

    alternarEnArray(estado.filtros.tipos, tipo);
    estado.filtros.pagina = 0;
    renderizar();
});

chipsGenDiv.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (chip === null) {
        return;
    }
    alternarEnArray(estado.filtros.generaciones, Number(chip.dataset.gen));
    estado.filtros.pagina = 0;
    renderizar();
});

chipsOrdenDiv.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (chip === null) {
        return;
    }
    estado.filtros.orden = chip.dataset.orden;
    estado.filtros.pagina = 0;
    renderizar();
});

cargarLista();
