// ==================== CONFIG ====================
const CONFIG = {
    // ⚠️ ВАЖНО: Убедитесь, что адрес совпадает с вашим реальным адресом на Render.com
    // В конце НЕ должно быть слеша "/"
    BACKEND_URL: 'https://gym-logger-bot-y602.onrender.com',
    USER_ID: window.Telegram?.WebApp?.initDataUnsafe?.user?.id || null
};

// Логирование для отладки
console.log('[CONFIG] Backend URL:', CONFIG.BACKEND_URL);
console.log('[CONFIG] User ID:', CONFIG.USER_ID);

// Инициализация Telegram Web App
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
}

