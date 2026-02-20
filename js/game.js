// Hauptspiel-Logik und Loop
const Game = {
    running: false,
    
    init() {
        console.log('=== Siedler Game V3.0 Modular ===');
        
        // Canvas initialisieren
        Renderer.init();
        
        // Input initialisieren
        Input.init();
        
        // Karte generieren
        Map.init();
        
        // HQ platzieren
        Buildings.placeHQ();
        
        // Ressourcen anzeigen
        Resources.updateDisplay();
        
        // Spiel starten
        this.running = true;
        this.loop();
        
        console.log('Spiel gestartet!');
    },
    
    // Haupt-Game-Loop
    loop() {
        if (!this.running) return;
        
        // Update
        this.update();
        
        // Render
        Renderer.render();
        
        // Nächster Frame
        requestAnimationFrame(() => this.loop());
    },
    
    update() {
        gameTime++;
        
        // Gebäude-Logik (Produktion, Spawning)
        Buildings.update();
        
        // Siedler/Träger bewegen
        Settlers.update();
        
        // Bäume nachwachsen (alle 60 Sekunden bei 60fps)
        if (gameTime % 3600 === 0) {
            Map.regrowTrees();
        }
    },
    
    // Spiel pausieren (für spätere Menüs)
    pause() {
        this.running = false;
    },
    
    // Spiel fortsetzen
    resume() {
        if (!this.running) {
            this.running = true;
            this.loop();
        }
    }
};

// Spiel starten wenn DOM geladen
document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});

console.log('Game geladen');
