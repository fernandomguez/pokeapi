// Peticiones a la PokéAPI. Si algo falla lanzan un error, y quien las llama lo captura con try/catch.

// Las urls de la API acaban en el id: "https://pokeapi.co/api/v2/pokemon/25/" -> 25
function sacarIdDeUrl(url) {
    const partes = url.split('/').filter(Boolean);
    return Number(partes[partes.length - 1]);
}

// Lista de todos los Pokémon oficiales: [{ id: 1, name: 'bulbasaur' }, ...]
async function pedirLista() {
    const respuesta = await fetch(`${API_URL}?limit=2000`);
    if (!respuesta.ok) {
        throw new Error('La API no responde');
    }
    const datos = await respuesta.json();

    const lista = [];
    for (const resultado of datos.results) {
        const id = sacarIdDeUrl(resultado.url);
        if (id <= ID_ULTIMO_OFICIAL) {
            lista.push({ id: id, name: resultado.name });
        }
    }
    return lista.sort((a, b) => a.id - b.id);
}

// Ids de todos los Pokémon de un tipo: [1, 2, 3, 4, ...]
async function pedirIdsDeTipo(tipo) {
    const respuesta = await fetch(`${TIPOS_URL}/${tipo}`);
    if (!respuesta.ok) {
        throw new Error('No se pudo cargar el tipo');
    }
    const datos = await respuesta.json();
    return datos.pokemon.map((p) => sacarIdDeUrl(p.pokemon.url));
}

// Datos completos de un Pokémon (los usa la ficha y las etiquetas de tipo).
async function pedirPokemon(id) {
    const respuesta = await fetch(`${API_URL}/${id}`);
    if (!respuesta.ok) {
        throw new Error('Pokémon no encontrado');
    }
    return await respuesta.json();
}
