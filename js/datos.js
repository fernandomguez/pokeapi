// Datos fijos de la aplicación: direcciones de la API y tablas de tipos, generaciones y orden.

const API_URL = 'https://pokeapi.co/api/v2/pokemon';
const TIPOS_URL = 'https://pokeapi.co/api/v2/type'; // endpoint distinto al de pokemon
const SPRITES_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

const POR_PAGINA = 24;
const ID_ULTIMO_OFICIAL = 1025; // los ids mayores son formas alternativas (megaevoluciones, etc.)

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

// Cada generación ocupa un rango de ids: [primero, último].
const GENERACIONES = [
    { n: 1, nombre: '1. Kanto', desde: 1, hasta: 151 },
    { n: 2, nombre: '2. Johto', desde: 152, hasta: 251 },
    { n: 3, nombre: '3. Hoenn', desde: 252, hasta: 386 },
    { n: 4, nombre: '4. Sinnoh', desde: 387, hasta: 493 },
    { n: 5, nombre: '5. Unova', desde: 494, hasta: 649 },
    { n: 6, nombre: '6. Kalos', desde: 650, hasta: 721 },
    { n: 7, nombre: '7. Alola', desde: 722, hasta: 809 },
    { n: 8, nombre: '8. Galar', desde: 810, hasta: 905 },
    { n: 9, nombre: '9. Paldea', desde: 906, hasta: 1025 },
];

const ORDENES = {
    'num': 'Número ↑',
    'num-desc': 'Número ↓',
    'az': 'A–Z',
};
