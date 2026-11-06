// Ficha de un Pokémon: ventana (modal) que se abre al pulsar una tarjeta.

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
    prepararCierre(modal);

    try {
        const datos = await pedirPokemon(id);

        const nombre = datos.name.toUpperCase();
        const altura = (datos.height / 10).toLocaleString('es-ES'); // la API da decímetros
        const peso = (datos.weight / 10).toLocaleString('es-ES');   // y hectogramos
        const imagen = datos.sprites.other['official-artwork'].front_default ?? datos.sprites.front_default;
        const tipos = datos.types.map((t) => t.type.name);
        estado.tiposPorId[id] = tipos; // aprovechamos para las etiquetas de la rejilla

        const activo = esFavorito(id);
        modal.querySelector('.modal__card').innerHTML = `
            <button type="button" class="modal__cerrar" aria-label="Cerrar">✕</button>
            <img src="${imagen}" alt="${nombre}">
            <div class="modal__titulo">
                <h2>${nombre}</h2>
                <button type="button" class="corazon corazon--modal ${activo ? 'corazon--activo' : ''}"
                        aria-pressed="${activo}"
                        aria-label="${activo ? 'Quitar' : 'Guardar'} en favoritos">♥</button>
            </div>
            <div class="tipos">
                ${tipos.map((tipo) => `
                    <span class="tipo" style="background-color: ${COLORES_TIPO[tipo]}">${NOMBRES_TIPO[tipo]}</span>
                `).join('')}
            </div>
            <div class="pokemon-info">
                <span><strong>Altura:</strong> ${altura} m</span>
                <span><strong>Peso:</strong> ${peso} kg</span>
            </div>
        `;
        modal.querySelector('.modal__cerrar').focus();

        const corazon = modal.querySelector('.corazon--modal');
        corazon.addEventListener('click', () => {
            alternarFavorito(id);
            pintarCorazon(corazon, esFavorito(id));

            // El corazón de la tarjeta de detrás debe mostrar lo mismo.
            const corazonTarjeta = document.querySelector(`.p-card[data-id="${id}"] .corazon`);
            if (corazonTarjeta) {
                pintarCorazon(corazonTarjeta, esFavorito(id));
            }
            if (estado.filtros.soloFavoritos) {
                renderizar();
            }
        });
    } catch (error) {
        modal.querySelector('.modal__card').innerHTML = `
            <button type="button" class="modal__cerrar" aria-label="Cerrar">✕</button>
            <div class="error-message">No se ha podido cargar la ficha.</div>
        `;
    }
}

// La ficha se cierra con el botón ✕, haciendo clic fuera de ella o con la tecla Escape.
function prepararCierre(modal) {
    function cerrar() {
        document.removeEventListener('keydown', alPulsarTecla);
        modal.remove();
    }

    function alPulsarTecla(event) {
        if (event.key === 'Escape') {
            cerrar();
        }
    }

    modal.addEventListener('click', (event) => {
        const pulsadoFuera = event.target === modal;
        const pulsadoCerrar = event.target.closest('.modal__cerrar') !== null;
        if (pulsadoFuera || pulsadoCerrar) {
            cerrar();
        }
    });
    document.addEventListener('keydown', alPulsarTecla);
    modal.querySelector('.modal__cerrar').focus();
}
