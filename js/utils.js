// ==================== UTILITY FUNCTIONS ====================
// Debounce для оптимизации частых вызовов
const debounce = (func, delay) => {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
};

// Утилита для исправления двойной сериализации JSON
const fixDoubleSerialization = (data) => {
    if (!data) return data;
    
    // Если это строка, пытаемся распарсить
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch (e) {
            console.warn('[API] Не удалось распарсить строку:', e);
            return data;
        }
    }
    
    // Если это массив с одним элементом-строкой, содержащей JSON
    if (Array.isArray(data) && data.length === 1 && typeof data[0] === 'string' && (data[0].includes('[') || data[0].includes('{'))) {
        try {
            return JSON.parse(data[0]);
        } catch (e) {
            console.warn('[API] Не удалось распарсить массив со строкой:', e);
            return data;
        }
    }
    
    return data;
};

