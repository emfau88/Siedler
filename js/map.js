const Map = {
    init() {
        map = [];
        for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
            map[y] = [];
            for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
                map[y][x] = 0;
            }
        }
        this.generateRiver();
        this.generateForests();
        this.generateStoneDeposits();
        this.initTrees();
    },
    
    generateRiver() {
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
        
        let tributaryY = Math.floor(CONFIG.MAP_HEIGHT * 0.4);
        for (let x = 0; x < CONFIG.MAP_WIDTH * 0.4; x++) {
            for (let w = 0; w < 2; w++) {
                if (tributaryY + w < CONFIG.MAP_HEIGHT) map[tributaryY + w][x] = 2;
            }
            if (Math.random() < 0.25) {
                tributaryY += Math.random() < 0.5 ? 1 : -1;
                tributaryY = Math.max(2, Math.min(CONFIG.MAP_HEIGHT - 4, tributaryY));
            }
        }
    },
    
    generateForests() {
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
    },
    
    generateStoneDeposits() {
        stoneDeposits = [];
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
    },
    
    initTrees() {
        trees = [];
        for (let y = 0; y < CONFIG.MAP_HEIGHT; y++) {
            for (let x = 0; x < CONFIG.MAP_WIDTH; x++) {
                if (map[y][x] === 1) {
                    trees.push({ x: x, y: y, age: Math.random() * 60 });
                }
            }
        }
    },
    
    findNearestTree(fromX, fromY, maxDist = 8) {
        let nearest = null;
        let minDist = Infinity;
        
        for (const tree of trees) {
            const dist = Math.sqrt((tree.x - fromX)**2 + (tree.y - fromY)**2);
            if (dist < minDist && dist <= maxDist) {
                minDist = dist;
                nearest = tree;
            }
        }
        return nearest;
    },
    
    removeTree(x, y) {
        trees = trees.filter(t => !(t.x === x && t.y === y));
        if (y >= 0 && y < CONFIG.MAP_HEIGHT && x >= 0 && x < CONFIG.MAP_WIDTH) {
            map[y][x] = 0;
        }
    },
    
    canBuildAt(tileX, tileY, buildingType) {
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
    },
    
    regrowTrees() {
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
};

console.log('Map geladen');
