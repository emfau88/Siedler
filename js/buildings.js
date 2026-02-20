// Gebäude-Verwaltung

const Buildings = {
    init() {
        buildings = [];
        farmFields = [];
    },
    
    add(type, tileX, tileY) {
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
        
        if (type === 'farm') {
            this.initFarmFields(newBuilding);
        }
        
        if (type === 'house') {
            Resources.increasePopMax(5);
        }
        
        return newBuilding;
    },
    
    initFarmFields(farmBuilding) {
        for (let fy = -1; fy < 3; fy++) {
            for (let fx = -1; fx < 3; fx++) {
                if (fx >= 0 && fx < 2 && fy >= 0 && fy < 2) continue;
                
                const fieldX = farmBuilding.tileX + fx;
                const fieldY = farmBuilding.tileY + fy;
                
                if (fieldX >= 0 && fieldX < CONFIG.MAP_WIDTH && 
                    fieldY >= 0 && fieldY < CONFIG.MAP_HEIGHT &&
                    map[fieldY][fieldX] === 0) {
                    farmFields.push({
                        buildingId: farmBuilding.id,
                        x: fieldX,
                        y: fieldY,
                        stage: 0,
                        progress: 0
                    });
                }
            }
        }
    },
    
    getHQ() {
        return buildings.find(b => b.type === 'hq');
    },
    
    getByType(type) {
        return buildings.filter(b => b.type === type);
    },
    
    getById(id) {
        return buildings.find(b => b.id === id);
    },
    
    placeHQ() {
        const centerX = Math.floor(CONFIG.MAP_WIDTH / 2);
        const centerY = Math.floor(CONFIG.MAP_HEIGHT / 2);
        
        for (let radius = 0; radius < 15; radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const x = centerX + dx;
                    const y = centerY + dy;
                    if (Map.canBuildAt(x, y, 'hq')) {
                        this.add('hq', x, y);
                        return { x: x + 1.5, y: y + 1.5 };
                    }
                }
            }
        }
        return null;
    },
    
    update() {
        for (const b of buildings) {
            if (b.type === 'house' && b.settlers < b.maxSettlers && Resources.pop < Resources.popMax) {
                b.spawnTimer++;
                if (b.spawnTimer >= BUILDINGS.house.spawnRate) {
                    b.spawnTimer = 0;
                    b.settlers++;
                    Resources.pop++;
                    Resources.updateDisplay();
                }
            }
            
            if ((b.type === 'lumberjack' || b.type === 'stonemason') && !b.readyToCollect) {
                b.productionTimer++;
                const workTime = b.type === 'lumberjack' ? 120 : 150;
                if (b.productionTimer >= workTime) {
                    b.productionTimer = 0;
                    b.readyToCollect = true;
                }
            }
        }
    }
};

console.log('Buildings geladen');
