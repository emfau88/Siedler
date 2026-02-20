const Settlers = {
    carriers: [],
    soldiers: [],
    
    init() {
        this.carriers = [];
        this.soldiers = [];
    },
    
    createSoldier(barracksX, barracksY) {
        const soldier = {
            x: (barracksX + 1.5) * CONFIG.TILE_SIZE,
            y: (barracksY + 2.5) * CONFIG.TILE_SIZE,
            targetX: (barracksX + 1.5) * CONFIG.TILE_SIZE,
            targetY: (barracksY + 2.5) * CONFIG.TILE_SIZE,
            type: 'soldier',
            state: 'patrolling',
            patrolCenter: { x: barracksX + 1.5, y: barracksY + 2.5 },
            patrolRadius: 6,
            speed: 1.2
        };
        this.soldiers.push(soldier);
        console.log('Soldat erstellt, total:', this.soldiers.length);
    },
    
    update() {
        const hq = Buildings.getHQ();
        if (!hq) return;
        
        // Neue Träger erstellen
        for (const house of Buildings.getByType('house')) {
            if (house.settlers > 0) {
                for (const b of buildings) {
                    if ((b.type === 'lumberjack' || b.type === 'stonemason' || b.type === 'farm') && 
                        b.readyToCollect && 
                        !this.carriers.find(c => c.targetBuilding === b.id)) {
                        
                        house.settlers--;
                        Resources.pop--;
                        Resources.updateDisplay();
                        
                        this.createCarrier(house, b);
                        break;
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
                            building.readyToCollect = false;
                            building.productionTimer = 0;
                            c.carrying = building.type === 'lumberjack' ? 'wood' : 
                                        building.type === 'stonemason' ? 'stone' : 'food';
                            c.amount = building.storedResource ? building.storedResource.amount : 10;
                            c.state = 'returning_to_hq';
                            c.targetX = (hq.tileX + 1.5) * CONFIG.TILE_SIZE;
                            c.targetY = (hq.tileY + 2.5) * CONFIG.TILE_SIZE;
                        } else {
                            c.state = 'returning_home';
                            this.setTargetToHome(c);
                        }
                    }
                    break;
                    
                case 'returning_to_hq':
                    this.moveToTarget(c);
                    if (this.isAtTarget(c)) {
                        if (c.carrying) {
                            Resources.add(c.carrying, c.amount || 10);
                        }
                        c.carrying = null;
                        c.state = 'returning_home';
                        this.setTargetToHome(c);
                    }
                    break;
                    
                case 'returning_home':
                    this.moveToTarget(c);
                    if (this.isAtTarget(c)) {
                        const home = Buildings.getById(c.homeBuilding);
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
                // Neue Zufallsposition in Patrouillenradius
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
            speed: 1.8,
            state: 'moving_to_building',
            carrying: null,
            amount: 0
        };
        this.carriers.push(carrier);
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
        return Math.sqrt(dx*dx + dy*dy) < 5;
    }
};

console.log('Settlers geladen');
