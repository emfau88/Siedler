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
            maxSoldiers: buildingDef.maxSoldiers || 0,
            settlers: 0,
            maxSettlers: buildingDef.maxSettlers || 0,
            spawnTimer: 0,
            productionTimer: 0,
            readyToCollect: false,
            storedResource: null
        };
        buildings.push(newBuilding);
        
        if (type === 'farm') {
            this.createFarmFields(newBuilding);
        }
        
        if (type === 'house') {
            Resources.increasePopMax(5);
        }
        
        if (type === 'barracks') {
            // Starte mit 0 Soldaten, werden nach und nach ausgebildet
            newBuilding.soldiers = 0;
        }
        
        return newBuilding;
    },
    
    createFarmFields(farm) {
        // 8 Felder um die Farm (3x3 minus 2x2 Farm)
        let fieldCount = 0;
        for (let dy = -1; dy <= 2; dy++) {
            for (let dx = -1; dx <= 2; dx++) {
                if (dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1) continue;
                
                const fieldX = farm.tileX + dx;
                const fieldY = farm.tileY + dy;
                
                if (fieldX >= 0 && fieldX < CONFIG.MAP_WIDTH && 
                    fieldY >= 0 && fieldY < CONFIG.MAP_HEIGHT &&
                    map[fieldY][fieldX] === 0) {
                    
                    farmFields.push({
                        buildingId: farm.id,
                        x: fieldX,
                        y: fieldY,
                        stage: 0,
                        progress: 0
                    });
                    fieldCount++;
                }
            }
        }
        console.log('Farm-Felder erstellt:', fieldCount);
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
        // Häuser spawnen Siedler
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
            
            // Holzfäller produzieren
            if (b.type === 'lumberjack' && !b.readyToCollect) {
                b.productionTimer++;
                if (b.productionTimer >= BUILDINGS.lumberjack.workTime) {
                    // Baum fällen in der Nähe
                    const tree = Map.findNearestTree(b.workX, b.workY);
                    if (tree) {
                        Map.removeTree(tree.x, tree.y);
                        b.readyToCollect = true;
                        b.productionTimer = 0;
                        console.log('Holzfäller hat Baum gefällt');
                    } else {
                        // Kein Baum in Reichweite, reset Timer
                        b.productionTimer = 0;
                    }
                }
            }
            
            // Steinmetz produziert
            if (b.type === 'stonemason' && !b.readyToCollect) {
                b.productionTimer++;
                if (b.productionTimer >= BUILDINGS.stonemason.workTime) {
                    b.readyToCollect = true;
                    b.productionTimer = 0;
                }
            }
            
            // Kaserne bildet Soldaten aus
            if (b.type === 'barracks' && b.soldiers < b.maxSoldiers && gameTime % 600 === 0) {
                if (Resources.food >= 10) {
                    Resources.food -= 10;
                    b.soldiers++;
                    Settlers.createSoldier(b.tileX, b.tileY);
                    Resources.updateDisplay();
                    console.log('Neuer Soldat ausgebildet');
                }
            }
        }
        
        // Farm-Felder wachsen
        for (const field of farmFields) {
            field.progress++;
            
            // Stadium 0 -> 1 (gesät)
            if (field.stage === 0 && field.progress > 120) {
                field.stage = 1;
                field.progress = 0;
            }
            // Stadium 1 -> 2 (wächst)
            else if (field.stage === 1 && field.progress > 240) {
                field.stage = 2;
                field.progress = 0;
            }
            // Stadium 2 -> 3 (erntereif)
            else if (field.stage === 2 && field.progress > 300) {
                field.stage = 3;
                field.progress = 0;
            }
        }
        
        // Farmen ernten alle 5 Sekunden
        if (gameTime % 300 === 0) {
            const farms = this.getByType('farm');
            for (const farm of farms) {
                const readyFields = farmFields.filter(f => 
                    f.buildingId === farm.id && f.stage === 3
                );
                if (readyFields.length > 0) {
                    const toHarvest = Math.min(readyFields.length, 4);
                    for (let i = 0; i < toHarvest; i++) {
                        readyFields[i].stage = 0;
                        readyFields[i].progress = 0;
                    }
                    farm.readyToCollect = true;
                    farm.storedResource = { type: 'food', amount: toHarvest * 5 };
                }
            }
        }
    }
};

console.log('Buildings geladen');
