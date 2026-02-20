// Gebäude-Verwaltung
const Buildings = {
    list: [], // Array aller Gebäude
    
    // Gebäude hinzufügen
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
            settlers: 0, // Aktuelle Siedler im Haus
            maxSettlers: buildingDef.maxSettlers || 0,
            spawnTimer: 0,
            productionTimer: 0,
            readyToCollect: false, // Hat Ressourcen zum Abholen
            storedResource: null   // {type, amount}
        };
        
        this.list.push(newBuilding);
        
        // Spezielle Initialisierungen
        if (type === 'farm') {
            this.initFarmFields(newBuilding);
        }
        
        if (type === 'house') {
            Resources.increasePopMax(5);
        }
        
        console.log('Gebäude gebaut:', type, 'bei', tileX, tileY);
        return newBuilding;
    },
    
    // Farm-Felder initialisieren
    initFarmFields(farmBuilding) {
        const fields = [];
        for (let fy = -1; fy < 3; fy++) {
            for (let fx = -1; fx < 3; fx++) {
                if (fx >= 0 && fx < 2 && fy >= 0 && fy < 2) continue; // Überspringe Gebäude
                
                const fieldX = farmBuilding.tileX + fx;
                const fieldY = farmBuilding.tileY + fy;
                
                if (fieldX >= 0 && fieldX < CONFIG.MAP_WIDTH && 
                    fieldY >= 0 && fieldY < CONFIG.MAP_HEIGHT &&
                    Map.data[fieldY][fieldX] === 0) {
                    fields.push({
                        buildingId: farmBuilding.id,
                        x: fieldX,
                        y: fieldY,
                        stage: 0,
                        progress: 0
                    });
                }
            }
        }
        farmFields.push(...fields);
    },
    
    // HQ finden
    getHQ() {
        return this.list.find(b => b.type === 'hq');
    },
    
    // Alle Gebäude eines Typs finden
    getByType(type) {
        return this.list.filter(b => b.type === type);
    },
    
    // Gebäude bei ID finden
    getById(id) {
        return this.list.find(b => b.id === id);
    },
    
    // Update alle Gebäude (pro Frame)
    update() {
        // Häuser: Siedler spawnen
        const houses = this.getByType('house');
        for (const house of houses) {
            if (house.settlers < house.maxSettlers && Resources.pop < Resources.popMax) {
                house.spawnTimer++;
                if (house.spawnTimer >= BUILDINGS.house.spawnRate) {
                    house.spawnTimer = 0;
                    house.settlers++;
                    Resources.pop++;
                    Resources.updateDisplay();
                    console.log('Neuer Siedler gespawnt in Haus', house.id);
                }
            }
        }
        
        // Holzfäller: Produktion
        const lumberjacks = this.getByType('lumberjack');
        for (const lumberjack of lumberjacks) {
            if (!lumberjack.readyToCollect) {
                lumberjack.productionTimer++;
                if (lumberjack.productionTimer >= BUILDINGS.lumberjack.workTime) {
                    lumberjack.productionTimer = 0;
                    lumberjack.readyToCollect = true;
                    lumberjack.storedResource = {type: 'wood', amount: 10};
                    console.log('Holzfäller fertig:', lumberjack.id);
                }
            }
        }
        
        // Steinmetze: Produktion
        const stonemasons = this.getByType('stonemason');
        for (const stonemason of stonemasons) {
            if (!stonemason.readyToCollect) {
                stonemason.productionTimer++;
                if (stonemason.productionTimer >= BUILDINGS.stonemason.workTime) {
                    stonemason.productionTimer = 0;
                    stonemason.readyToCollect = true;
                    stonemason.storedResource = {type: 'stone', amount: 10};
                    console.log('Steinmetz fertig:', stonemason.id);
                }
            }
        }
        
        // Farm-Felder wachsen lassen
        for (const field of farmFields) {
            field.progress++;
            
            if (field.stage === 0 && field.progress > 180) {
                field.stage = 1;
                field.progress = 0;
            }
            else if (field.stage === 1 && field.progress > 360) {
                field.stage = 2;
                field.progress = 0;
            }
            else if (field.stage === 2 && field.progress > 360) {
                field.stage = 3; // Ernte bereit
                field.progress = 0;
            }
        }
        
        // Farmen: Ernte
        if (gameTime % 300 === 0) {
            const farms = this.getByType('farm');
            for (const farm of farms) {
                const readyFields = farmFields.filter(f => 
                    f.buildingId === farm.id && f.stage === 3
                );
                if (readyFields.length > 0) {
                    const toHarvest = Math.min(readyFields.length, Math.floor(Math.random() * 3) + 2);
                    for (let i = 0; i < toHarvest; i++) {
                        readyFields[i].stage = 0;
                        readyFields[i].progress = 0;
                    }
                    farm.readyToCollect = true;
                    farm.storedResource = {type: 'food', amount: toHarvest * 5};
                }
            }
        }
        
        // Kaserne: Soldaten ausbilden
        const barracksList = this.getByType('barracks');
        for (const barracks of barracksList) {
            if (barracks.soldiers < barracks.maxSoldiers && gameTime % 600 === 0 && Resources.food >= 10) {
                Resources.spend('food:10');
                barracks.soldiers++;
                console.log('Neuer Soldat in Kaserne:', barracks.id);
            }
        }
    },
    
    // Ressource abholen (von Siedler aufgerufen)
    collectResource(buildingId) {
        const building = this.getById(buildingId);
        if (building && building.readyToCollect && building.storedResource) {
            const res = building.storedResource;
            building.readyToCollect = false;
            building.storedResource = null;
            building.productionTimer = 0;
            return res;
        }
        return null;
    },
    
    // Prüfen ob Gebäude bereit zur Abholung
    isReadyForCollection(buildingId) {
        const building = this.getById(buildingId);
        return building && building.readyToCollect;
    },
    
    // Zufälliges produktives Gebäude finden das bereit ist
    findReadyBuilding() {
        const productive = this.list.filter(b => 
            (b.type === 'lumberjack' || b.type === 'stonemason' || b.type === 'farm') &&
            b.readyToCollect
        );
        if (productive.length > 0) {
            return productive[Math.floor(Math.random() * productive.length)];
        }
        return null;
    },
    
    // HQ platzieren (am Start)
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
                        Camera.centerOn(x + 1.5, y + 1.5);
                        return;
                    }
                }
            }
        }
    }
};

console.log('Buildings geladen');
