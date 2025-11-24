// ==================== TIMER MODULE ====================
const Timer = {
    interval: null,
    startTime: 0,
    accumulated: 0,
    running: false,
    
    formatTime(totalMilliseconds) {
        const totalSeconds = Math.floor(totalMilliseconds / 1000);
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        const ms = Math.floor((totalMilliseconds % 1000) / 10).toString().padStart(2, '0');
        return `${m}:${s}.${ms}`;
    },
    
    render(ms) {
        const display = document.getElementById('timerDisplay');
        if (display) {
            display.textContent = this.formatTime(ms);
        }
    },
    
    toggle() {
        const btn = document.getElementById('timerStartBtn');
        if (!btn) return;
        
        Haptic.selection(); // 📳 Виброотклик при переключении таймера
        
        if (this.running) {
            this.stop();
            btn.textContent = "Старт";
            btn.classList.remove('active');
        } else {
            this.start();
            btn.textContent = "Стоп";
            btn.classList.add('active');
        }
    },
    
    start() {
        this.running = true;
        this.startTime = Date.now();
        this.interval = setInterval(() => {
            const delta = Date.now() - this.startTime;
            this.render(this.accumulated + delta);
        }, 100); // 100ms для экономии батареи на мобильных устройствах
    },
    
    stop() {
        this.running = false;
        this.accumulated += Date.now() - this.startTime;
        clearInterval(this.interval);
    },
    
    reset() {
        Haptic.impact('light'); // 📳 Легкая вибрация при сбросе
        this.stop();
        this.accumulated = 0;
        this.render(0);
        const btn = document.getElementById('timerStartBtn');
        if (btn) {
            btn.textContent = "Старт";
            btn.classList.remove('active');
        }
    }
};

