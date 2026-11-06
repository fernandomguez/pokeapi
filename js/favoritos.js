// Favoritos: se guardan en localStorage como un array de ids, por ejemplo [25, 6, 150].

const CLAVE_FAVORITOS = 'pokedex-favoritos';

function leerFavoritos() {
    const texto = localStorage.getItem(CLAVE_FAVORITOS);
    if (texto === null) {
        return [];
    }
    try {
        return JSON.parse(texto);
    } catch (error) {
        return []; // el contenido estaba corrupto
    }
}

let favoritos = leerFavoritos();

function esFavorito(id) {
    return favoritos.includes(id);
}

function alternarFavorito(id) {
    if (esFavorito(id)) {
        favoritos = favoritos.filter((f) => f !== id);
    } else {
        favoritos.push(id);
    }
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(favoritos));
}
