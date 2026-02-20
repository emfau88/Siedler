// Hauptspiel

const Game = {
    running: false,
    
    init() {
        console.log('=== Siedler Game V3.0 ===');
        
        Renderer.init();
        Input.init();
        Buildings.init();
        Settlers.init();
        
        Map.init();
        
        const hqPos = Buildings.placeHQ();
        if (hqPos) {
            Input.centerCameraOn(hqPos.x, hqPos.y);
        }
        
        Resources.updateDisplay();
        
        this.running = true;
        this.loop();
        
        console.log('Spiel gestartet!');
    },
    
    loop() {
        if (!this.running) return;
        
        gameTime++;
        
        Buildings.update();
        Settlers.update();
        
        if (gameTime % 3600 === 0) {
            Map.regrowTrees();
        }
        
        Renderer.render();
        
        requestAnimationFrame(() => this.loop());
    }
};

// Start wenn DOM bereit
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Game.init());
} else {
    Game.init();
}

console.log('Game geladen');
