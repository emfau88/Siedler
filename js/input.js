// Input Handling

const Input = {
    init() {
        this.setupCanvas();
        this.setupUI();
        this.setupKeyboard();
    },
    
    setupCanvas() {
        canvas.addEventListener('mousedown', (e) => this.onPointerDown(e.clientX, e.clientY));
        canvas.addEventListener('mousemove', (e) => this.onPointerMove(e.clientX, e.clientY));
        canvas.addEventListener('mouseup', () => this.onPointerUp());
        canvas.addEventListener('mouseleave', () => this.onPointerUp());
        
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
        });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
        });
        canvas.addEventListener('touchend', () => this.onPointerUp());
    },
    
    onPointerDown(x, y) {
        mousePos.x = x;
        mousePos.y = y;
        
        if (isBuildMode) {
            const tile = this.screenToTile(x, y);
            this.tryBuild(tile.x, tile.y);
            isDragging = false;
        } else {
            isDragging = true;
            lastMouseX = x;
            lastMouseY = y;
            canvas.style.cursor = 'grabbing';
        }
    },
    
    onPointerMove(x, y) {
        mousePos.x = x;
        mousePos.y = y;
        
        if (isBuildMode && showGhost) {
            const tile = this.screenToTile(x, y);
            ghostPos.x = tile.x;
            ghostPos.y = tile.y;
        }
        
        if (isDragging && !isBuildMode) {
            camera.x += x - lastMouseX;
            camera.y += y - lastMouseY;
            lastMouseX = x;
            lastMouseY = y;
        }
    },
    
    onPointerUp() {
        isDragging = false;
        canvas.style.cursor = 'default';
    },
    
    screenToTile(screenX, screenY) {
        return {
            x: Math.floor((screenX - camera.x) / (CONFIG.TILE_SIZE * camera.zoom)),
            y: Math.floor((screenY - camera.y) / (CONFIG.TILE_SIZE * camera.zoom))
        };
    },
    
    tryBuild(tileX, tileY) {
        if (!selectedBuilding) return;
        
        if (Map.canBuildAt(tileX, tileY, selectedBuilding)) {
            const cost = document.querySelector(`[data-building="${selectedBuilding}"]`).dataset.cost;
            if (Resources.spend(cost)) {
                Buildings.add(selectedBuilding, tileX, tileY);
                this.exitBuildMode();
            }
        }
    },
    
    enterBuildMode(buildingType) {
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
    },
    
    exitBuildMode() {
        selectedBuilding = null;
        isBuildMode = false;
        showGhost = false;
        
        document.getElementById('buildStatus').style.display = 'none';
        document.getElementById('cancelBuildBtn').classList.remove('active');
        document.querySelectorAll('.build-item').forEach(i => i.classList.remove('selected'));
    },
    
    setupUI() {
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
                
                if (!Resources.canAfford(cost)) {
                    alert('Nicht genug Ressourcen!');
                    return;
                }
                
                this.enterBuildMode(building);
            });
        });
        
        document.getElementById('cancelBuildBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.exitBuildMode();
        });
        
        document.getElementById('zoomIn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.zoomIn();
        });
        
        document.getElementById('zoomOut').addEventListener('click', (e) => {
            e.stopPropagation();
            this.zoomOut();
        });
        
        document.getElementById('minimapContainer').addEventListener('click', (e) => {
            const rect = minimapCanvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            const mapX = (clickX / 100) * CONFIG.MAP_WIDTH;
            const mapY = (clickY / 100) * CONFIG.MAP_HEIGHT;
            this.centerCameraOn(mapX, mapY);
        });
    },
    
    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') Resources.cheat('wood', 100);
            if (e.key === 's' || e.key === 'S') Resources.cheat('stone', 50);
            if (e.key === 'Escape') this.exitBuildMode();
        });
    },
    
    centerCameraOn(tileX, tileY) {
        camera.x = (canvas.width / 2) - (tileX * CONFIG.TILE_SIZE * camera.zoom);
        camera.y = (canvas.height / 2) - (tileY * CONFIG.TILE_SIZE * camera.zoom);
    },
    
    zoomIn() {
        if (camera.zoom < camera.maxZoom) {
            const oldZoom = camera.zoom;
            camera.zoom = Math.min(camera.zoom + 0.25, camera.maxZoom);
            const zoomFactor = camera.zoom / oldZoom;
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            camera.x = centerX - (centerX - camera.x) * zoomFactor;
            camera.y = centerY - (centerY - camera.y) * zoomFactor;
        }
    },
    
    zoomOut() {
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
};

console.log('Input geladen');
