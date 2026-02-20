// Ressourcen-Verwaltung

const Resources = {
    wood: 150,
    stone: 50,
    food: 100,
    pop: 0,
    popMax: 5,
    
    add(type, amount) {
        this[type] += amount;
        this.updateDisplay();
    },
    
    spend(costStr) {
        const costs = costStr.split(',');
        for (const cost of costs) {
            const [res, amount] = cost.split(':');
            if (this[res] < parseInt(amount)) return false;
        }
        for (const cost of costs) {
            const [res, amount] = cost.split(':');
            this[res] -= parseInt(amount);
        }
        this.updateDisplay();
        return true;
    },
    
    canAfford(costStr) {
        const costs = costStr.split(',');
        for (const cost of costs) {
            const [res, amount] = cost.split(':');
            if (this[res] < parseInt(amount)) return false;
        }
        return true;
    },
    
    updateDisplay() {
        const woodEl = document.getElementById('woodCount');
        const stoneEl = document.getElementById('stoneCount');
        const foodEl = document.getElementById('foodCount');
        const popEl = document.getElementById('popCount');
        
        if (woodEl) woodEl.textContent = this.wood;
        if (stoneEl) stoneEl.textContent = this.stone;
        if (foodEl) foodEl.textContent = this.food;
        if (popEl) popEl.textContent = this.pop + '/' + this.popMax;
    },
    
    increasePopMax(amount) {
        this.popMax += amount;
        this.updateDisplay();
    },
    
    cheat(type, amount) {
        this[type] += amount;
        this.updateDisplay();
        const cheatInfo = document.getElementById('cheatInfo');
        if (cheatInfo) {
            cheatInfo.textContent = `+${amount} ${type}!`;
            cheatInfo.style.display = 'block';
            setTimeout(() => cheatInfo.style.display = 'none', 1000);
        }
    }
};

console.log('Resources geladen');
