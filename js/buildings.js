
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
            readyToCollect: false,
            storedResource: null
        };
        buildings.push(newBuilding);
        
        // WICHTIG: Farm-Felder sofort erstellen
        if (type === 'farm') {
            this.createFarmFields(newBuilding);
        }
        
        if (type === 'house') {
            Resources.increasePopMax(5);
        }
        
        return newBuilding;
    },
    
    createFarmFields(farm) {
        // Felder um die Farm herum (3x3 minus die Farm selbst = 8 Felder)
        for (let dy = -1; dy <= 2; dy++) {
            for (let dx = -1; dx <= 2; dx++) {
                // Überspringe die Farm-Fläche selbst (2x2)
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
                        stage: 0, // 0=leer, 1=gesät, 2=wächst, 3=erntereif
                        progress: 0
                    });
                }
            }
        }
        console.log('Farm-Felder erstellt:', farmFields.length);
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
                    console.log('Siedler gespawnt, Pop:', Resources.pop);
                }
            }
            
            // Produktionsgebäude arbeiten
            if ((b.type === 'lumberjack' || b.type === 'stonemason') && !b.readyToCollect) {
                b.productionTimer++;
                const workTime = BUILDINGS[b.type].workTime;
                if (b.productionTimer >= workTime) {
                    b.productionTimer = 0;
                    b.readyToCollect = true;
                    console.log(b.type, 'fertig, bereit zur Abholung');
                }
            }
        }
        
        // Farm-Felder wachsen
        for (const field of farmFields) {
            field.progress++;
            
            if (field.stage === 0 && field.progress > 120) {
                field.stage = 1;
                field.progress = 0;
            } else if (field.stage === 1 && field.progress > 240) {
                field.stage = 2;
                field.progress = 0;
            } else if (field.stage === 2 && field.progress > 300) {
                field.stage = 3; // Ernte bereit
                field.progress = 0;
            }
        }
        
        // Farmen ernten
        if (gameTime % 300 === 0) {
            const farms = this.getByType('farm');
            for (const farm of farms) {
                const readyFields = farmFields.filter(f => 
                    f.buildingId === farm.id && f.stage === 3
                );
                if (readyFields.length > 0) {
                    const toHarvest = Math.min(readyFields.length, 3);
                    for (let i = 0; i < toHarvest; i++) {
                        readyFields[i].stage = 0;
                        readyFields[i].progress = 0;
                    }
                    farm.readyToCollect = true;
                    farm.storedResource = { type: 'food', amount: toHarvest * 5 };
                    console.log('Farm hat', toHarvest * 5, 'Nahrung produziert');
                }
            }
        }
    }
};

console.log('Buildings geladen');
