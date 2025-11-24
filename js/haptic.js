// ==================== HAPTIC FEEDBACK ====================
const Haptic = {
    // Безопасный вызов вибрации
    impact(style = 'medium') {
        try {
            const tg = window.Telegram?.WebApp;
            if (tg?.HapticFeedback?.impactOccurred) {
                tg.HapticFeedback.impactOccurred(style); // 'light', 'medium', 'heavy', 'rigid', 'soft'
            }
        } catch (e) {
            // Игнорируем ошибки, если вибрация недоступна
        }
    },
    
    selection() {
        try {
            const tg = window.Telegram?.WebApp;
            if (tg?.HapticFeedback?.selectionChanged) {
                tg.HapticFeedback.selectionChanged();
            }
        } catch (e) {
            // Игнорируем ошибки
        }
    },
    
    notification(type = 'success') {
        try {
            const tg = window.Telegram?.WebApp;
            if (tg?.HapticFeedback?.notificationOccurred) {
                tg.HapticFeedback.notificationOccurred(type); // 'error', 'success', 'warning'
            }
        } catch (e) {
            // Игнорируем ошибки
        }
    }
};

