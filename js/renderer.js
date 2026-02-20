const Renderer = {
    init() {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        minimapCanvas = document.getElementById('minimap');
        minimapCtx = minimapCanvas.getContext('2d');
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },
    
    resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    },
    
    render() {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        this.drawMap();
        this.drawFarmFields(); // VOR Gebäuden zeichnen
        this.drawGhost();
        
        for (const b of buildings) {
            this.drawBuilding(b);
        }
        
        for (const c of Settlers.carriers) {
            this.drawCarrier(c);
        }
        
        for (const s of Settlers.soldiers) {
            this.drawSoldier(s);
        }
        
        this.drawBorder();
        this.drawMinimap();
    },
    
    drawMap() {
        for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
            for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
                this.drawTile(x, y, map[y][x]);
            }
        }
    },
    
    drawTile(x, y, type) {
        const screenX = camera.x + x * CONFIG.TILE_SIZE * camera.zoom;
        const screenY = camera.y + y * CONFIG.TILE_SIZE * camera.zoom;
        const size = CONFIG.TILE_SIZE * camera.zoom;
        
        if (screenX + size < 0 || screenX > canvas.width || screenY + size < 0 || screenY > canvas.height) return;
        
        switch(type) {
            case 0: ctx.fillStyle = '#7cb342'; break;
            case 1: ctx.fillStyle = '#2e7d32'; break; // Dunkleres Grün für Wald
            case 2: ctx.fillStyle = '#1565c0'; break;
            case 3: ctx.fillStyle = '#757575'; break;
        }
        
        ctx.fillRect(screenX, screenY, size, size);
        
        // Bäume detaillierter
        if (type === 1 && size > 8) {
            ctx.fillStyle = '#1b5e20';
            ctx.beginPath();
            ctx.arc(screenX + size/2, screenY + size/2, size*0.35, 0, Math.PI*2);
            ctx.fill();
        }
        
        if (type === 3 && size > 8) {
            ctx.fillStyle = '#9e9e9e';
            ctx.fillRect(screenX + size*0.2, screenY + size*0.2, size*0.6, size*0.6);
        }
        
        if (camera.zoom > 0.6) {
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX, screenY, size, size);
        }
    },
    
    drawFarmFields() {
        for (const field of farmFields) {
            const screenX = camera.x + field.x * CONFIG.TILE_SIZE * camera.zoom;
            const screenY = camera.y + field.y * CONFIG.TILE_SIZE * camera.zoom;
            const size = CONFIG.TILE_SIZE * camera.zoom;
            
            if (screenX + size < 0 || screenX > canvas.width || screenY + size < 0 || screenY > canvas.height) continue;
            
            // Farben: braun (leer), hellgrün (gesät), grün (wächst), gelb (reif)
            const colors = ['#8d6e63', '#a5d6a7', '#66bb6a', '#ffee58'];
            const emojis = ['', '🌱', '🌿', '🌾'];
            
            ctx.fillStyle = colors[field.stage];
            ctx.fillRect(screenX + 1, screenY + 1, size - 2, size - 2);
            
            // Emoji bei höheren Zoom-Stufen
            if (field.stage > 0 && size > 12) {
                ctx.font = `${Math.floor(size * 0.6)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(emojis[field.stage], screenX + size/2, screenY + size/2);
            }
            
            // Rahmen
            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX, screenY, size, size);
        }
    },
    
    drawGhost() {
        if (!showGhost || !selectedBuilding) return;
        
        const canBuild = Map.canBuildAt(ghostPos.x, ghostPos.y, selectedBuilding);
        const def = BUILDINGS[selectedBuilding];
        const screenX = camera.x + ghostPos.x * CONFIG.TILE_SIZE * camera.zoom;
        const screenY = camera.y + ghostPos.y * CONFIG.TILE_SIZE * camera.zoom;
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
    },
    
    drawBuilding(b) {
        const def = BUILDINGS[b.type];
        const screenX = camera.x + b.x * camera.zoom;
        const screenY = camera.y + b.y * camera.zoom;
        const size = CONFIG.TILE_SIZE * def.tileSize * camera.zoom;
        
        if (screenX + size < 0 || screenX > canvas.width || screenY + size < 0 || screenY > canvas.height) return;
        
        ctx.fillStyle = def.color;
        ctx.fillRect(screenX + 2, screenY + 2, size - 4, size - 4);
        
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(screenX + 4, screenY + size - 8, size - 8, 6);
        
        if (size > 25) {
            ctx.font = `${Math.floor(size * 0.4)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(def.symbol, screenX + size/2, screenY + size/2);
        }
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX + 2, screenY + 2, size - 4, size - 4);
        
        // Gelber Punkt wenn fertig
        if (b.readyToCollect) {
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(screenX + size - 10, screenY + 10, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Siedler-Anzahl bei Häusern
        if (b.type === 'house' && size > 20) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${b.settlers}/${b.maxSettlers}`, screenX + size/2, screenY + size - 6);
        }
        
        // Soldaten bei Kaserne
        if (b.type === 'barracks' && b.soldiers > 0 && size > 20) {
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(`⚔️${b.soldiers}`, screenX + size - 4, screenY + 14);
        }
    },
    
    drawCarrier(c) {
        const screenX = camera.x + c.x * camera.zoom;
        const screenY = camera.y + c.y * camera.zoom;
        const size = Math.max(4, 7 * camera.zoom);
        
        if (screenX < -10 || screenX > canvas.width + 10 || screenY < -10 || screenY > canvas.height + 10) return;
        
        // Blauer Kreis für Träger
        ctx.fillStyle = '#4169e1';
        ctx.beginPath();
        ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Ressource tragen
        if (c.carrying) {
            const colors = { wood: '#8b4513', stone: '#757575', food: '#ffd700' };
            ctx.fillStyle = colors[c.carrying] || '#fff';
            ctx.fillRect(screenX - size, screenY - size*2, size*2, size);
        }
    },
    
    drawSoldier(s) {
        const screenX = camera.x + s.x * camera.zoom;
        const screenY = camera.y + s.y * camera.zoom;
        const size = Math.max(5, 9 * camera.zoom);
        
        if (screenX < -10 || screenX > canvas.width + 10 || screenY < -10 || screenY > canvas.height + 10) return;
        
        // Rotes Dreieck für Soldat
        ctx.fillStyle = '#d32f2f';
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - size);
        ctx.lineTo(screenX - size, screenY + size);
        ctx.lineTo(screenX + size, screenY + size);
        ctx.closePath();
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    },
    
    drawBorder() {
        const mapPixelWidth = CONFIG.MAP_WIDTH * CONFIG.TILE_SIZE * camera.zoom;
        const mapPixelHeight = CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE * camera.zoom;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.strokeRect(camera.x, camera.y, mapPixelWidth, mapPixelHeight);
    },
    
    drawMinimap() {
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
};

console.log('Renderer geladen');
