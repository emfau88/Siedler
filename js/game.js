// WICHTIG: Alles in einer Datei für bessere Kompatibilität
// Später können wir wieder splitten

// === CONFIG ===
const CONFIG = {
    MAP_WIDTH: 60,
    MAP_HEIGHT: 45,
    TILE_SIZE: 32,
    CAMERA: { minZoom: 0.5, maxZoom: 2, defaultZoom: 1 }
};

const BUILDINGS = {
    hq: { name: 'HQ', color: '#8b0000', tileSize: 3, symbol: '🏰', workTile: { x: 1, y: 2 } },
    lumberjack: { name: 'Holzfäller', color: '#8b4513', tileSize: 2, symbol: '🪓', workTile: { x: 1, y: 1 }, produces: 'wood', workTime: 120 },
    stonemason: { name: 'Steinmetz', color: '#696969', tileSize: 2, symbol: '⛏️', workTile: { x: 1, y: 1 }, produces: 'stone', workTime: 150 },
    farm: { name: 'Farm', color: '#daa520', tileSize: 2, symbol: '🚜', workTile: { x: 1, y: 1 }, produces: 'food' },
    house: { name: 'Haus', color: '#cd853f', tileSize: 2, symbol: '🏠', workTile: { x: 1, y: 1 }, maxSettlers: 5, spawnRate: 300 },
    barracks: { name: 'Kaserne', color: '#4a4a4a', tileSize: 3, symbol: '⚔️', workTile: { x: 1, y: 2 }, maxSoldiers: 5 }
};

// === GLOBALE VARIABLEN ===
let canvas, ctx, minimapCanvas, minimapCtx;
let camera = { x: 0, y: 0, zoom: 1, minZoom: 0.5, maxZoom: 2 };
let map = [], buildings = [], trees = [], stoneDeposits = [], farmFields = [];
let gameTime = 0;
let isDragging = false, lastMouseX = 0, lastMouseY = 0, mousePos = { x: 0, y: 0 };
let selectedBuilding = null, isBuildMode = false, ghostPos = { x: 0, y: 0 }, showGhost = false;

let Resources = { wood: 150, stone: 50, food: 100, pop: 0, popMax: 5 };

// === INITIALISIERUNG ===
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});

function initGame() {
    console.log('=== Siedler Game V3.0 ===');
    
    // Canvas
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    minimapCanvas = document.getElementById('minimap');
    minimapCtx = minimapCanvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Input
    setupInput();
    
    // Karte
    generateMap();
    
    // HQ
    placeHQ();
    
    // Anzeige
    updateResourceDisplay();
    
    // Loop starten
    requestAnimationFrame(gameLoop);
    
    console.log('Spiel gestartet!');
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// === KARTENGENERIERUNG ===
function generateMap() {
    // Leere Karte
    for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
        map[y] = [];
        for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
            map[y][x] = 0;
        }
    }
    
    // Fluss
    let riverX = Math.floor(CONFIG.MAP_WIDTH * 0.3);
    for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
        for (let w = 0; w < 2; w++) {
            if (riverX + w < CONFIG.MAP_WIDTH) map[y][riverX + w] = 2;
        }
        if (Math.random() < 0.3) {
            riverX += Math.random() < 0.5 ? 1 : -1;
            riverX = Math.max(2, Math.min(CONFIG.MAP_WIDTH - 4, riverX));
        }
    }
    
    // Wälder
    for (let f = 0; f < 6; f++) {
        let fx = Math.floor(Math.random() * (CONFIG.MAP_WIDTH - 8)) + 4;
        let fy = Math.floor(Math.random() * (CONFIG.MAP_HEIGHT - 8)) + 4;
        if (map[fy][fx] === 2) continue;
        
        const forestSize = Math.floor(Math.random() * 30) + 15;
        const queue = [{x: fx, y: fy}];
        let placed = 0;
        const visited = new Set();
        
        while (queue.length > 0 && placed < forestSize) {
            const current = queue.shift();
            const key = `${current.x},${current.y}`;
            if (visited.has(key)) continue;
            visited.add(key);
            
            if (current.x < 0 || current.x >= CONFIG.MAP_WIDTH || 
                current.y < 0 || current.y >= CONFIG.MAP_HEIGHT) continue;
            if (map[current.y][current.x] === 2) continue;
            
            const distToCenter = Math.sqrt((current.x - fx)**2 + (current.y - fy)**2);
            const prob = Math.max(0.3, 1 - distToCenter / 5);
            
            if (Math.random() < prob) {
                map[current.y][current.x] = 1;
                placed++;
                
                const neighbors = [
                    {x: current.x+1, y: current.y},
                    {x: current.x-1, y: current.y},
                    {x: current.x, y: current.y+1},
                    {x: current.x, y: current.y-1}
                ];
                
                for (const n of neighbors) {
                    if (!visited.has(`${n.x},${n.y}`)) queue.push(n);
                }
            }
        }
    }
    
    // Steine
    for (let s = 0; s < 4; s++) {
        let sx = Math.floor(Math.random() * (CONFIG.MAP_WIDTH - 6)) + 3;
        let sy = Math.floor(Math.random() * (CONFIG.MAP_HEIGHT - 6)) + 3;
        if (map[sy][sx] !== 0) continue;
        
        const size = Math.random() < 0.5 ? 2 : 3;
        let canPlace = true;
        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                if (map[sy + dy][sx + dx] !== 0) canPlace = false;
            }
        }
        
        if (canPlace) {
            for (let dy = 0; dy < size; dy++) {
                for (let dx = 0; dx < size; dx++) {
                    map[sy + dy][sx + dx] = 3;
                }
            }
            stoneDeposits.push({ x: sx, y: sy, size: size });
        }
    }
    
    // Bäume
    trees = [];
    for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
            if (map[y][x] === 1) {
                trees.push({ x: x, y: y, age: Math.random() * 60 });
            }
        }
    }
}

// === GEBÄUDE ===
function placeHQ() {
    const centerX = Math.floor(CONFIG.MAP_WIDTH / 2);
    const centerY = Math.floor(CONFIG.MAP_HEIGHT / 2);
    
    for (let radius = 0; radius < 15; radius++) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                if (canBuildAt(x, y, 'hq')) {
                    addBuilding('hq', x, y);
                    centerCameraOn(x + 1.5, y + 1.5);
                    return;
                }
            }
        }
    }
}

function canBuildAt(tileX, tileY, buildingType) {
    const building = BUILDINGS[buildingType];
    const size = building.tileSize;
    
    for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
            const checkX = tileX + dx;
            const checkY = tileY + dy;
            
            if (checkX < 0 || checkX >= CONFIG.MAP_WIDTH || checkY < 0 || checkY >= CONFIG.MAP_HEIGHT) {
                return false;
            }
            
            const tile = map[checkY][checkX];
            if (tile !== 0 && tile !== 3) {
                if (buildingType !== 'stonemason' || tile !== 3) return false;
            }
            
            for (const b of buildings) {
                const bType = BUILDINGS[b.type];
                if (checkX >= b.tileX && checkX < b.tileX + bType.tileSize &&
                    checkY >= b.tileY && checkY < b.tileY + bType.tileSize) {
                    return false;
                }
            }
        }
    }
    return true;
}

function addBuilding(type, tileX, tileY) {
    const buildingDef = BUILDINGS[type];
    const newBuilding = {
        type: type,
        tileX: tileX,
        tileY: tileY,
        x: tileX * CONFIG.TILE_SIZE,
        y: tileY * CONFIG.TILE_SIZE,
        id: Date.now() + Math.random(),
        workX: tileX + buildingDef.workTile.x,
        workY: tileY + buildingDef.workTile.y,
        soldiers: 0,
        settlers: 0,
        maxSettlers: buildingDef.maxSettlers || 0,
        spawnTimer: 0,
        productionTimer: 0,
        readyToCollect: false
    };
    buildings.push(newBuilding);
    
    if (type === 'house') {
        Resources.popMax += 5;
    }
    
    return newBuilding;
}

// === RENDERING ===
function gameLoop() {
    gameTime++;
    update();
    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    // Häuser spawnen Siedler
    for (const b of buildings) {
        if (b.type === 'house' && b.settlers < b.maxSettlers && Resources.pop < Resources.popMax) {
            b.spawnTimer++;
            if (b.spawnTimer >= BUILDINGS.house.spawnRate) {
                b.spawnTimer = 0;
                b.settlers++;
                Resources.pop++;
                updateResourceDisplay();
            }
        }
        
        // Produktion
        if ((b.type === 'lumberjack' || b.type === 'stonemason') && !b.readyToCollect) {
            b.productionTimer++;
            const workTime = b.type === 'lumberjack' ? 120 : 150;
            if (b.productionTimer >= workTime) {
                b.productionTimer = 0;
                b.readyToCollect = true;
            }
        }
    }
    
    // Bäume nachwachsen
    if (gameTime % 3600 === 0) {
        regrowTrees();
    }
}

function regrowTrees() {
    const candidates = [];
    for (let y = 1; y < CONFIG.MAP_HEIGHT - 1; y++) {
        for (let x = 1; x < CONFIG.MAP_WIDTH - 1; x++) {
            if (map[y][x] === 0) {
                const neighbors = [map[y-1][x], map[y+1][x], map[y][x-1], map[y][x+1]];
                if (neighbors.some(n => n === 1)) candidates.push({x, y});
            }
        }
    }
    
    const count = Math.min(candidates.length, Math.floor(Math.random() * 3) + 3);
    for (let i = 0; i < count; i++) {
        if (candidates.length === 0) break;
        const idx = Math.floor(Math.random() * candidates.length);
        const pos = candidates.splice(idx, 1)[0];
        map[pos.y][pos.x] = 1;
        trees.push({x: pos.x, y: pos.y, age: 0});
    }
}

function render() {
    // Hintergrund
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Karte
    for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
            drawTile(x, y, map[y][x]);
        }
    }
    
    // Ghost Building
    if (showGhost && selectedBuilding) {
        const canBuild = canBuildAt(ghostPos.x, ghostPos.y, selectedBuilding);
        drawGhostBuilding(ghostPos.x, ghostPos.y, selectedBuilding, canBuild);
    }
    
    // Gebäude
    for (const b of buildings) {
        drawBuilding(b);
    }
    
    // Rahmen
    const mapPixelWidth = CONFIG.MAP_WIDTH * CONFIG.TILE_SIZE * camera.zoom;
    const mapPixelHeight = CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE * camera.zoom;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeRect(camera.x, camera.y, mapPixelWidth, mapPixelHeight);
    
    // Minimap
    drawMinimap();
}

function drawTile(x, y, type) {
    const screenX = camera.x + x * CONFIG.TILE_SIZE * camera.zoom;
    const screenY = camera.y + y * CONFIG.TILE_SIZE * camera.zoom;
    const size = CONFIG.TILE_SIZE * camera.zoom;
    
    if (screenX + size < 0 || screenX > canvas.width || screenY + size < 0 || screenY > canvas.height) return;
    
    switch(type) {
        case 0: ctx.fillStyle = '#7cb342'; break;
        case 1: ctx.fillStyle = '#1b5e20'; break;
        case 2: ctx.fillStyle = '#1565c0'; break;
        case 3: ctx.fillStyle = '#757575'; break;
    }
    
    ctx.fillRect(screenX, screenY, size, size);
    
    if (type === 1 && size > 10) {
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(screenX + size*0.2, screenY + size*0.2, size*0.6, size*0.6);
    }
    
    if (type === 3 && size > 10) {
        ctx.fillStyle = '#9e9e9e';
        ctx.fillRect(screenX + size*0.1, screenY + size*0.1, size*0.3, size*0.3);
        ctx.fillRect(screenX + size*0.5, screenY + size*0.4, size*0.4, size*0.4);
    }
    
    if (camera.zoom > 0.8) {
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX, screenY, size, size);
    }
}

function drawBuilding(b) {
    const def = BUILDINGS[b.type];
    const screenX = camera.x + b.x * camera.zoom;
    const screenY = camera.y + b.y * camera.zoom;
    const size = CONFIG.TILE_SIZE * def.tileSize * camera.zoom;
    
    if (screenX + size < 0 || screenX > canvas.width || screenY + size < 0 || screenY > canvas.height) return;
    
    ctx.fillStyle = def.color;
    ctx.fillRect(screenX + 2, screenY + 2, size - 4, size - 4);
    
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(screenX + 4, screenY + size - 8, size - 8, 6);
    
    if (size > 30) {
        ctx.font = `${Math.floor(size * 0.4)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(def.symbol, screenX + size/2, screenY + size/2);
    }
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeRect(screenX + 2, screenY + 2, size - 4, size - 4);
    
    if (b.readyToCollect) {
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(screenX + size - 10, screenY + 10, 6, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawGhostBuilding(tileX, tileY, type, canBuild) {
    const def = BUILDINGS[type];
    const screenX = camera.x + tileX * CONFIG.TILE_SIZE * camera.zoom;
    const screenY = camera.y + tileY * CONFIG.TILE_SIZE * camera.zoom;
    const size = CONFIG.TILE_SIZE * def.tileSize * camera.zoom;
    
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = canBuild ? 'rgba(0,255,0,0.3)' : 'rgba(255,0,0,0.3)';
    ctx.fillRect(screenX, screenY, size, size);
    ctx.globalAlpha = 1.0;
    
    const pulse = Math.sin(gameTime * 0.1) * 0.3 + 0.7;
    ctx.strokeStyle = canBuild ? `rgba(0,255,0,${pulse})` : `rgba(255,0,0,${pulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(screenX + 2, screenY + 2, size - 4, size - 4);
    ctx.setLineDash([]);
}

function drawMinimap() {
    const scaleX = minimapCanvas.width / CONFIG.MAP_WIDTH;
    const scaleY = minimapCanvas.height / CONFIG.MAP_HEIGHT;
    
    minimapCtx.fillStyle = '#1a1a1a';
    minimapCtx.fillRect(0, 0, 100, 100);
    
    for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
            switch(map[y][x]) {
                case 0: minimapCtx.fillStyle = '#7cb342'; break;
                case 1: minimapCtx.fillStyle = '#1b5e20'; break;
                case 2: minimapCtx.fillStyle = '#1565c0'; break;
                case 3: minimapCtx.fillStyle = '#757575'; break;
            }
            minimapCtx.fillRect(x * scaleX, y * scaleY, scaleX, scaleY);
        }
    }
    
    for (const b of buildings) {
        const def = BUILDINGS[b.type];
        minimapCtx.fillStyle = def.color;
        minimapCtx.fillRect(b.tileX * scaleX, b.tileY * scaleY, scaleX * def.tileSize, scaleY * def.tileSize);
    }
    
    const viewX = (-camera.x / (CONFIG.MAP_WIDTH * CONFIG.TILE_SIZE * camera.zoom)) * 100;
    const viewY = (-camera.y / (CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE * camera.zoom)) * 100;
    const viewW = (canvas.width / (CONFIG.MAP_WIDTH * CONFIG.TILE_SIZE * camera.zoom)) * 100;
    const viewH = (canvas.height / (CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE * camera.zoom)) * 100;
    
    minimapCtx.strokeStyle = '#ff0000';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(viewX, viewY, viewW, viewH);
}

// === INPUT ===
function setupInput() {
    // Maus
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);
    
    // Touch
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); onPointerDown(e.touches[0]); });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); onPointerMove(e.touches[0]); });
    canvas.addEventListener('touchend', onPointerUp);
    
    // UI
    document.getElementById('buildMenuBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (isBuildMode) return;
        document.getElementById('buildMenu').classList.toggle('active');
        document.getElementById('buildMenuBtn').classList.toggle('active');
    });
    
    document.querySelectorAll('.build-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const building = e.currentTarget.dataset.building;
            const cost = e.currentTarget.dataset.cost;
            
            if (!canAfford(cost)) {
                alert('Nicht genug Ressourcen!');
                return;
            }
            
            enterBuildMode(building);
        });
    });
    
    document.getElementById('cancelBuildBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        exitBuildMode();
    });
    
    document.getElementById('zoomIn').addEventListener('click', (e) => { e.stopPropagation(); zoomIn(); });
    document.getElementById('zoomOut').addEventListener('click', (e) => { e.stopPropagation(); zoomOut(); });
    
    document.getElementById('minimapContainer').addEventListener('click', (e) => {
        const rect = minimapCanvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const mapX = (clickX / 100) * CONFIG.MAP_WIDTH;
        const mapY = (clickY / 100) * CONFIG.MAP_HEIGHT;
        centerCameraOn(mapX, mapY);
    });
    
    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') { Resources.wood += 100; updateResourceDisplay(); }
        if (e.key === 's' || e.key === 'S') { Resources.stone += 50; updateResourceDisplay(); }
        if (e.key === 'Escape') exitBuildMode();
    });
}

function onPointerDown(e) {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
    
    if (isBuildMode) {
        const tile = screenToTile(e.clientX, e.clientY);
        tryBuild(tile.x, tile.y);
        isDragging = false;
    } else {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
    }
}

function onPointerMove(e) {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
    
    if (isBuildMode && showGhost) {
        const tile = screenToTile(e.clientX, e.clientY);
        ghostPos.x = tile.x;
        ghostPos.y = tile.y;
    }
    
    if (isDragging && !isBuildMode) {
        camera.x += e.clientX - lastMouseX;
        camera.y += e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
}

function onPointerUp() {
    isDragging = false;
    canvas.style.cursor = 'default';
}

function screenToTile(screenX, screenY) {
    return {
        x: Math.floor((screenX - camera.x) / (CONFIG.TILE_SIZE * camera.zoom)),
        y: Math.floor((screenY - camera.y) / (CONFIG.TILE_SIZE * camera.zoom))
    };
}

function centerCameraOn(tileX, tileY) {
    camera.x = (canvas.width / 2) - (tileX * CONFIG.TILE_SIZE * camera.zoom);
    camera.y = (canvas.height / 2) - (tileY * CONFIG.TILE_SIZE * camera.zoom);
}

function zoomIn() {
    if (camera.zoom < camera.maxZoom) {
        const oldZoom = camera.zoom;
        camera.zoom = Math.min(camera.zoom + 0.25, camera.maxZoom);
        const zoomFactor = camera.zoom / oldZoom;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        camera.x = centerX - (centerX - camera.x) * zoomFactor;
        camera.y = centerY - (centerY - camera.y) * zoomFactor;
    }
}

function zoomOut() {
    if (camera.zoom > camera.minZoom) {
        const oldZoom = camera.zoom;
        camera.zoom = Math.max(camera.zoom - 0.25, camera.minZoom);
        const zoomFactor = camera.zoom / oldZoom;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        camera.x = centerX - (centerX - camera.x) * zoomFactor;
        camera.y = centerY - (centerY - camera.y) * zoomFactor;
    }
}

function enterBuildMode(buildingType) {
    selectedBuilding = buildingType;
    isBuildMode = true;
    showGhost = true;
    
    document.getElementById('buildMenu').classList.remove('active');
    document.querySelectorAll('.build-item').forEach(i => i.classList.remove('selected'));
    document.querySelector(`[data-building="${buildingType}"]`).classList.add('selected');
    
    const buildingName = BUILDINGS[buildingType].name;
    document.getElementById('buildStatusText').textContent = `${buildingName} bauen`;
    document.getElementById('buildStatus').style.display = 'block';
    document.getElementById('cancelBuildBtn').classList.add('active');
    document.getElementById('buildMenuBtn').classList.remove('active');
}

function exitBuildMode() {
    selectedBuilding = null;
    isBuildMode = false;
    showGhost = false;
    
    document.getElementById('buildStatus').style.display = 'none';
    document.getElementById('cancelBuildBtn').classList.remove('active');
    document.querySelectorAll('.build-item').forEach(i => i.classList.remove('selected'));
}

function tryBuild(tileX, tileY) {
    if (!selectedBuilding) return;
    
    if (canBuildAt(tileX, tileY, selectedBuilding)) {
        const cost = document.querySelector(`[data-building="${selectedBuilding}"]`).dataset.cost;
        if (spendResources(cost)) {
            addBuilding(selectedBuilding, tileX, tileY);
            exitBuildMode();
        }
    }
}

function canAfford(costStr) {
    const costs = costStr.split(',');
    for (const cost of costs) {
        const [res, amount] = cost.split(':');
        if (Resources[res] < parseInt(amount)) return false;
    }
    return true;
}

function spendResources(costStr) {
    const costs = costStr.split(',');
    for (const cost of costs) {
        const [res, amount] = cost.split(':');
        Resources[res] -= parseInt(amount);
    }
    updateResourceDisplay();
    return true;
}

function updateResourceDisplay() {
    document.getElementById('woodCount').textContent = Resources.wood;
    document.getElementById('stoneCount').textContent = Resources.stone;
    document.getElementById('foodCount').textContent = Resources.food;
    document.getElementById('popCount').textContent = Resources.pop + '/' + Resources.popMax;
}
