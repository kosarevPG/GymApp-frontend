// ==================== API MODULE ====================
const API = {
    async request(endpoint, params = {}, method = 'GET', body = null, retries = 2) {
        const url = new URL(`${CONFIG.BACKEND_URL}/api/${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const opts = { 
                    method, 
                    headers: { 'Content-Type': 'application/json' },
                    // Таймаут 15 секунд (уменьшен с 30)
                    signal: AbortSignal.timeout(15000)
                };
                if (body) opts.body = JSON.stringify(body);
                
                const startTime = performance.now();
                console.log(`[API] Запрос (попытка ${attempt + 1}/${retries + 1}): ${method} ${url}`);
                
                const res = await fetch(url, opts);
                const duration = Math.round(performance.now() - startTime);
                
                if (!res.ok) {
                    console.error(`[API] Ошибка HTTP: ${res.status} ${res.statusText} (${duration}ms)`);
                    if (attempt < retries && res.status >= 500) {
                        // Retry для серверных ошибок
                        await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // Экспоненциальная задержка
                        continue;
                    }
                    return { error: true, message: `HTTP ${res.status}` };
                }
                
                const data = await res.json();
                console.log(`[API] Ответ получен за ${duration}ms:`, data);
                return data;
            } catch (e) {
                const isLastAttempt = attempt === retries;
                
                if (e.name === 'TimeoutError') {
                    console.error(`[API] Таймаут запроса (15 сек). Попытка ${attempt + 1}/${retries + 1}`);
                    if (!isLastAttempt) {
                        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                        continue;
                    }
                    return { error: true, message: 'Таймаут. Сервер не отвечает. Попробуйте еще раз.' };
                } else if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
                    console.error(`[API] Не удалось подключиться к серверу. Попытка ${attempt + 1}/${retries + 1}`);
                    if (!isLastAttempt) {
                        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                        continue;
                    }
                    return { error: true, message: 'Не удалось подключиться к серверу. Проверьте адрес.' };
                } else {
                    console.error("[API] Ошибка:", e);
                    return { error: true, message: e.message || 'Неизвестная ошибка' };
                }
            }
        }
    },

    getGroups: () => API.request('groups'),
    getExercises: (group) => API.request('exercises', { group }),
    getAllExercises: () => API.request('all_exercises'),
    getHistory: (exercise, mode = 'full', limit = 20) => API.request('history', { exercise, mode, limit }),
    saveSet: (data) => API.request('save_set', {}, 'POST', { 
        ...data, 
        user_id: CONFIG.USER_ID,
        set_group_id: App.state.sessionId // Передаем sessionId для суперсетов
    })
};

