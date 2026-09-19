const input = document.getElementById('pokemonInput');
const boton = document.getElementById('buscarBtn');
const resultadoDiv = document.getElementById('resultado');

// Función principal que ejecuta la búsqueda
function ejecutarBusqueda() {
    const nombrePokemon = input.value.trim().toLowerCase();
    
    if (nombrePokemon === '') {
        alert('Por favor, escribe un nombre de Pokémon.');
        return;
    }

    consultarPokemon(nombrePokemon);
}

boton.addEventListener('click', ejecutarBusqueda);
input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        ejecutarBusqueda();
    }
});

async function consultarPokemon(nombre) {
    const url = `https://pokeapi.co/api/v2/pokemon/${nombre}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Pokémon no encontrado');
        }

        const datos = await response.json();
        mostrarDatos(datos);

    } catch (error) {
        resultadoDiv.innerHTML = `<div class="error-message">Error: No se ha encontrado el Pokémon.</div>`;
    }
}

function mostrarDatos(datos) {
    const nombre = datos.name.toUpperCase();
    const altura = datos.height / 10;
    const peso = datos.weight / 10;
    const imagen = datos.sprites.other['official-artwork']['front_default'];
    const tipos = datos.types.map(t => t.type.name.toUpperCase()).join(', ');

    resultadoDiv.innerHTML = `
        <div class="pokemon-card">
            <img src="${imagen}" alt="${nombre}">
            <h2>${nombre}</h2>
            <p><strong>Tipo:</strong> ${tipos}</p>
            <div class="pokemon-info">
                <span><strong>Altura:</strong> ${altura}m</span>
                <span><strong>Peso:</strong> ${peso}kg</span>
            </div>
        </div>
    `;
}