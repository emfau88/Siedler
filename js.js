// Spiel-Konfiguration und Konstanten
const CONFIG = {
    MAP_WIDTH: 60,
    MAP_HEIGHT: 45,
    TILE_SIZE: 32,
    CAMERA: {
        minZoom: 0.5,
        maxZoom: 2,
        defaultZoom: 1
    }
};

// Gebäude-Definitionen
const BUILDINGS = {
    hq: { 
        name: 'HQ', 
        color: '#8b0000', 
        tileSize: 3,
        symbol: '🏰',
        workTile: { x: 1, y: 2 }
    },
    lumberjack: { 
        name: 'Holzfäller', 
        color: '#8b4513', 
        tileSize: 2,
        symbol: '🪓',
        workTile: { x: 1, y: 1 },
        produces: 'wood',
        workTime: 120
    },
    stonemason: { 
        name: 'Steinmetz', 
        color: '#696969', 
        tileSize: 2,
        symbol: '⛏️',
        workTile: { x: 1, y: 1 },
        produces: 'stone',
        workTime: 150
    },
    farm: { 
        name: 'Farm', 
        color: '#daa520', 
        tileSize: 2,
        symbol: '🚜',
        workTile: { x: 1, y: 1 },
        produces: 'food'
    },
    house: { 
        name: 'Haus', 
        color: '#cd853f', 
        tileSize: 2,
        symbol: '🏠',
        workTile: { x: 1, y: 1 },
        maxSettlers: 5,
        spawnRate: 300 // Alle 5 Sekunden (bei 60fps)
    },
    barracks: { 
        name: 'Kaserne', 
        color: '#4a4a4a', 
        tileSize: 3,
        symbol: '⚔️',
        workTile: { x: 1, y: 2 },
        maxSoldiers: 5
    }
};

// Globale Spielvariablen (werden von anderen Modulen genutzt)
let canvas, ctx, minimapCanvas, minimapCtx;
let camera = {
    x: 0,
    y: 0,
    zoom: CONFIG.CAMERA.defaultZoom,
    minZoom: CONFIG.CAMERA.minZoom,
    maxZoom: CONFIG.CAMERA.maxZoom
};

let map = [];
let buildings = [];
let trees = [];
let stoneDeposits = [];
let farmFields = [];
let gameTime = 0;

// Input-Status
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let mousePos = { x: 0, y: 0 };
let selectedBuilding = null;
let isBuildMode = false;
let ghostPos = { x: 0, y: 0 };
let showGhost = false;

console.log('Config geladen');
