// Estado de la aplicación y lógica de filtrado y orden (no toca el DOM).

const estado = {
    cargado: false,
    lista: [],          // todos los Pokémon: [{ id, name }]
    idsPorTipo: {},     // caché: tipo -> array de ids (se pide la primera vez que se usa)
    tiposPorId: {},     // caché: id -> array de tipos (para las etiquetas de las tarjetas)
    filtros: {
        texto: '',
        pagina: 0,              // empieza en 0
        tipos: [],              // tipos elegidos; basta con tener uno de ellos
        generaciones: [],       // números de generación elegidos
        orden: 'num',           // 'num' | 'num-desc' | 'az'
        soloFavoritos: false,
    },
};

function estaEnGeneraciones(id) {
    for (const n of estado.filtros.generaciones) {
        const gen = GENERACIONES.find((g) => g.n === n);
        if (id >= gen.desde && id <= gen.hasta) {
            return true;
        }
    }
    return false;
}

function tieneAlgunTipoElegido(id) {
    for (const tipo of estado.filtros.tipos) {
        if (estado.idsPorTipo[tipo].includes(id)) {
            return true;
        }
    }
    return false;
}

// Devuelve los Pokémon que cumplen todos los filtros, ya ordenados.
function listaVisible() {
    const filtros = estado.filtros;
    let lista = estado.lista;

    if (filtros.generaciones.length > 0) {
        lista = lista.filter((p) => estaEnGeneraciones(p.id));
    }
    if (filtros.tipos.length > 0) {
        lista = lista.filter((p) => tieneAlgunTipoElegido(p.id));
    }
    if (filtros.soloFavoritos) {
        lista = lista.filter((p) => esFavorito(p.id));
    }

    const texto = filtros.texto.trim().toLowerCase();
    if (texto !== '') {
        // Coincide si el nombre contiene el texto o si el texto es el número (con o sin #).
        const numero = Number(texto.replace('#', ''));
        lista = lista.filter((p) => p.name.includes(texto) || p.id === numero);
    }

    return ordenar(lista);
}

function ordenar(lista) {
    const copia = [...lista]; // sort modifica el array, así que se ordena una copia
    if (estado.filtros.orden === 'az') {
        return copia.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }
    if (estado.filtros.orden === 'num-desc') {
        return copia.sort((a, b) => b.id - a.id);
    }
    return copia.sort((a, b) => a.id - b.id);
}

// ---------- Cambios de filtros (cada uno vuelve a la página 1) ----------

// Añade el elemento al array si no estaba, y lo quita si ya estaba.
function alternarEnArray(array, elemento) {
    const posicion = array.indexOf(elemento);
    if (posicion === -1) {
        array.push(elemento);
    } else {
        array.splice(posicion, 1);
    }
}

function quitarFiltros() {
    estado.filtros.texto = '';
    estado.filtros.tipos = [];
    estado.filtros.generaciones = [];
    estado.filtros.orden = 'num';
    estado.filtros.soloFavoritos = false;
    estado.filtros.pagina = 0;
}
