const Settlers = {
    carriers: [],
    soldiers: [],
    
    init() {
        this.carriers = [];
        this.soldiers = [];
    },
    
    update() {
        const hq = Buildings.getHQ();
        if (!hq) return;
        
        // Neue Träger erstellen wenn Gebäude fertig sind und Häuser Siedler haben
        for (const house of Buildings.getByType('house')) {
            if (house.settlers > 0) {
                // Suche fertiges Gebäude
                for (const b of buildings) {
                    if ((b.type === 'lumberjack' || b.type === 'stonemason' || b.type === 'farm') && 
                        b.readyToCollect && 
                        !this.carriers.find(c => c.targetBuilding === b.id)) {
                        
                        // Siedler wird zum Träger
                        house.settlers--;
                        Resources.pop--;
                        Resources.updateDisplay();
                        
                        this.createCarrier(house, b);
                        break; // Nur einen pro Frame
                    }
                }
            }
        }
        
        // Träger bewegen
        for (let i = this.carriers.length - 1; i >= 0; i--) {
            const c = this.carriers[i];
            
            switch(c.state) {
                case 'moving_to_building':
                    this.moveToTarget(c);
                    if (this.isAtTarget(c)) {
                        const building = Buildings.getById(c.targetBuilding);
                        if (building && building.readyToCollect) {
                            // Ressource einsammeln
                            building.readyToCollect = false;
                            building.productionTimer = 0;
                            c.carrying = building.type === 'lumberjack' ? 'wood' : 
                                        building.type === 'stonemason' ? 'stone' : 'food';
                            c.amount = building.type === 'farm' ? building.storedResource.amount : 10;
                            c.state = 'returning_to_hq';
                            c.targetX = (hq.tileX + 1.5) * CONFIG.TILE_SIZE;
                            c.targetY = (hq.tileY + 2.5) * CONFIG.TILE_SIZE;
                            console.log('Träger holt', c.carrying);
                        } else {
                            // Nichts zu holen, zurück nach Hause
                            c.state = 'returning_home';
                            this.setTargetToHome(c);
                        }
                    }
                    break;
                    
                case 'returning_to_hq':
                    this.moveToTarget(c);
                    if (this.isAtTarget(c)) {
                        // Abgeben
                        if (c.carrying) {
                            Resources.add(c.carrying, c.amount || 10);
                            console.log('Träger liefert', c.carrying, 'ab');
                        }
                        c.carrying = null;
                        c.state = 'returning_home';
                        this.setTargetToHome(c);
                    }
                    break;
                    
                case 'returning_home':
                    this.moveToTarget(c);
                    if (this.isAtTarget(c)) {
                        // Zurück ins Haus
                        const home = Buildings.getById(c.homeBuilding);
                        if (home && home.settlers < home.maxSettlers) {
                            home.settlers++;
                            Resources.pop++;
                            Resources.updateDisplay();
                        }
                        this.carriers.splice(i, 1);
                        console.log('Träger zurückgekehrt');
                    }
                    break;
            }
        }
        
        // Soldaten
        for (const soldier of this.soldiers) {
            const dx = soldier.targetX - soldier.x;
            const dy = soldier.targetY - soldier.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < soldier.speed) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * soldier.patrolRadius * CONFIG.TILE_SIZE;
                soldier.targetX = (soldier.patrolCenter.x * CONFIG.TILE_SIZE) + Math.cos(angle) * radius;
                soldier.targetY = (soldier.patrolCenter.y * CONFIG.TILE_SIZE) + Math.sin(angle) * radius;
            } else {
                soldier.x += (dx / dist) * soldier.speed;
                soldier.y += (dy / dist) * soldier.speed;
            }
        }
    },
    
    createCarrier(house, targetBuilding) {
        const carrier = {
            x: house.workX * CONFIG.TILE_SIZE,
            y: house.workY * CONFIG.TILE_SIZE,
            targetX: targetBuilding.workX * CONFIG.TILE_SIZE,
            targetY: targetBuilding.workY * CONFIG.TILE_SIZE,
            type: 'carrier',
            homeBuilding: house.id,
            targetBuilding: targetBuilding.id,
            speed: 2,
            state: 'moving_to_building',
            carrying: null,
            amount: 0
        };
        this.carriers.push(carrier);
        console.log('Neuer Träger erstellt');
    },
    
    setTargetToHome(carrier) {
        const home = Buildings.getById(carrier.homeBuilding);
        if (home) {
            carrier.targetX = home.workX * CONFIG.TILE_SIZE;
            carrier.targetY = home.workY * CONFIG.TILE_SIZE;
        }
    },
    
    moveToTarget(entity) {
        const dx = entity.targetX - entity.x;
        const dy = entity.targetY - entity.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > entity.speed) {
            entity.x += (dx / dist) * entity.speed;
            entity.y += (dy / dist) * entity.speed;
        } else {
            entity.x = entity.targetX;
            entity.y = entity.targetY;
        }
    },
    
    isAtTarget(entity) {
        const dx = entity.targetX - entity.x;
        const dy = entity.targetY - entity.y;
        return Math.sqrt(dx*dx + dy*dy) < 3;
    }
};

console.log('Settlers geladen');
