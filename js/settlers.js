// Siedler und Träger

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
        
        // Neue Träger erstellen wenn nötig
        for (const house of Buildings.getByType('house')) {
            if (house.settlers > 0) {
                const readyBuilding = this.findReadyBuilding();
                if (readyBuilding && !this.carriers.find(c => c.targetBuilding === readyBuilding.id)) {
                    house.settlers--;
                    Resources.pop--;
                    Resources.updateDisplay();
                    
                    this.createCarrier(house, readyBuilding);
                }
            }
        }
        
        // Träger bewegen
        for (let i = this.carriers.length - 1; i >= 0; i--) {
            const carrier = this.carriers[i];
            
            switch(carrier.state) {
                case 'moving_to_building':
                    this.moveEntity(carrier);
                    if (this.isAtTarget(carrier)) {
                        const building = Buildings.getById(carrier.targetBuilding);
                        if (building && building.readyToCollect) {
                            building.readyToCollect = false;
                            building.productionTimer = 0;
                            carrier.carrying = building.type === 'lumberjack' ? 'wood' : 'stone';
                            carrier.state = 'returning_to_hq';
                            carrier.targetX = (hq.tileX + 1.5) * CONFIG.TILE_SIZE;
                            carrier.targetY = (hq.tileY + 2.5) * CONFIG.TILE_SIZE;
                        } else {
                            carrier.state = 'returning_home';
                            const home = Buildings.getById(carrier.homeBuilding);
                            if (home) {
                                carrier.targetX = home.workX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2;
                                carrier.targetY = home.workY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2;
                            }
                        }
                    }
                    break;
                    
                case 'returning_to_hq':
                    this.moveEntity(carrier);
                    if (this.isAtTarget(carrier)) {
                        if (carrier.carrying) {
                            Resources.add(carrier.carrying, 10);
                            carrier.carrying = null;
                        }
                        carrier.state = 'returning_home';
                        const home = Buildings.getById(carrier.homeBuilding);
                        if (home) {
                            carrier.targetX = home.workX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2;
                            carrier.targetY = home.workY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2;
                        }
                    }
                    break;
                    
                case 'returning_home':
                    this.moveEntity(carrier);
                    if (this.isAtTarget(carrier)) {
                        const home = Buildings.getById(carrier.homeBuilding);
                        if (home && home.settlers < home.maxSettlers) {
                            home.settlers++;
                            Resources.pop++;
                            Resources.updateDisplay();
                        }
                        this.carriers.splice(i, 1);
                    }
                    break;
            }
        }
        
        // Soldaten patrouillieren
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
            x: house.workX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2,
            y: house.workY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2,
            targetX: targetBuilding.workX * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2,
            targetY: targetBuilding.workY * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2,
            type: 'carrier',
            homeBuilding: house.id,
            targetBuilding: targetBuilding.id,
            speed: 2.5,
            state: 'moving_to_building',
            carrying: null
        };
        this.carriers.push(carrier);
    },
    
    moveEntity(entity) {
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
        return Math.sqrt(dx*dx + dy*dy) < 5;
    },
    
    findReadyBuilding() {
        const ready = buildings.filter(b => 
            (b.type === 'lumberjack' || b.type === 'stonemason') &&
            b.readyToCollect
        );
        if (ready.length > 0) {
            return ready[Math.floor(Math.random() * ready.length)];
        }
        return null;
    }
};

console.log('Settlers geladen');
