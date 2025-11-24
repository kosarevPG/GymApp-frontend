// ==================== APP STATE & LOGIC ====================
const App = {
    allExercisesCache: null, // Кэш всех упражнений для поиска
    
    state: {
        screen: 'groups',
        group: null,
        exercise: null,
        sets: [], // Старая структура (для обратной совместимости)
        activeExercises: [], // Новая структура для суперсетов: [{name: "...", sets: [...]}]
        sessionId: null, // UUID сессии для связывания упражнений в суперсет
        orderCounter: 0, // Счетчик порядка выполнения подходов
        isSaving: false, // Защита от дублирования записей при быстрых кликах
        groupsCache: null // Кэш групп мышц
    },

    init() {
        // Event Listeners (с проверкой существования элементов)
        const btnBack = document.getElementById('btnBack');
        if (btnBack) btnBack.onclick = () => App.goBack();
        
        const btnHistory = document.getElementById('btnHistory');
        if (btnHistory) btnHistory.onclick = () => App.loadHistory();
        
        const btnAddSet = document.getElementById('btnAddSet');
        if (btnAddSet) btnAddSet.onclick = () => App.addSetRow();
        
        const timerStartBtn = document.getElementById('timerStartBtn');
        if (timerStartBtn) timerStartBtn.onclick = () => Timer.toggle();
        
        const timerResetBtn = document.getElementById('timerResetBtn');
        if (timerResetBtn) timerResetBtn.onclick = () => Timer.reset();
        
        const closeHistoryBtn = document.getElementById('closeHistoryBtn');
        if (closeHistoryBtn) closeHistoryBtn.onclick = () => UI.toggleModal('modalHistory', false);
        
        const closeInfoBtn = document.getElementById('closeInfoBtn');
        if (closeInfoBtn) closeInfoBtn.onclick = () => UI.toggleModal('infoModal', false);
        
        // Закрытие модалок по клику на фон
        const modalHistory = document.getElementById('modalHistory');
        if (modalHistory) {
            modalHistory.onclick = (e) => {
                if (e.target.id === 'modalHistory') UI.toggleModal('modalHistory', false);
            };
        }
        
        const infoModal = document.getElementById('infoModal');
        if (infoModal) {
            infoModal.onclick = (e) => {
                if (e.target.id === 'infoModal') UI.toggleModal('infoModal', false);
            };
        }
        
        const modalAddExercise = document.getElementById('modalAddExercise');
        if (modalAddExercise) {
            modalAddExercise.onclick = (e) => {
                if (e.target.id === 'modalAddExercise') UI.toggleModal('modalAddExercise', false);
            };
        }

        // === ЛОГИКА СЧЕТЧИКА И СЕССИИ ===
        const savedSession = localStorage.getItem('gym_session_id');
        const savedOrder = localStorage.getItem('gym_order_counter');
        const lastDate = localStorage.getItem('gym_last_date');
        
        // Получаем сегодняшнюю дату в формате "DD.MM.YYYY"
        const today = new Date().toLocaleDateString('ru-RU');

        if (lastDate !== today) {
            // 🔥 НОВЫЙ ДЕНЬ: Сбрасываем всё
            console.log("Новый день - сброс счетчика");
            this.state.orderCounter = 0;
            // Генерируем новую сессию на день (чтобы связывать упражнения, если нужно)
            this.state.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Сохраняем новые данные
            localStorage.setItem('gym_last_date', today);
            localStorage.setItem('gym_session_id', this.state.sessionId);
            localStorage.setItem('gym_order_counter', '0');
        } else {
            // 🔥 ТОТ ЖЕ ДЕНЬ: Продолжаем нумерацию
            this.state.orderCounter = parseInt(savedOrder) || 0;
            
            // Восстанавливаем ID сессии, если он был (или создаем, если вдруг нет)
            this.state.sessionId = savedSession || ('session_' + Date.now());
        }

        this.loadGroups();
        
        // ПРИНУДИТЕЛЬНО очищаем заголовок при старте
        UI.updateNav('', false);
        
        // Привязываем debounced поиск к инпуту
        const searchInput = document.getElementById('searchGroups');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                UI.filterGlobal(e.target.value);
            }, 300));
        }
    },

    goBack() {
        if (this.state.exercise) {
            this.state.exercise = null;
            Timer.reset();
            UI.showScreen('exercises');
            UI.updateNav(this.state.group, true, false); // Показываем кнопку "Назад" на экране упражнений
        } else if (this.state.group) {
            this.state.group = null;
            UI.showScreen('groups');
            UI.updateNav('', false); // Передаем пустую строку
        }
    },

    // Кэширование в localStorage с TTL
    _getCachedGroups() {
        try {
            const cached = localStorage.getItem('gym_groups_cache');
            if (!cached) return null;
            
            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();
            const TTL = 5 * 60 * 1000; // 5 минут
            
            if (now - timestamp < TTL) {
                console.log('[App] Группы загружены из кэша');
                return data;
            } else {
                localStorage.removeItem('gym_groups_cache');
                return null;
            }
        } catch (e) {
            console.warn('[App] Ошибка чтения кэша:', e);
            return null;
        }
    },
    
    _saveGroupsToCache(groups) {
        try {
            localStorage.setItem('gym_groups_cache', JSON.stringify({
                data: groups,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('[App] Ошибка сохранения кэша:', e);
        }
    },
    
    // Кэширование упражнений в localStorage
    _getCachedExercises() {
        try {
            const cached = localStorage.getItem('gym_exercises_cache');
            if (!cached) return null;
            
            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();
            const TTL = 10 * 60 * 1000; // 10 минут
            
            if (now - timestamp < TTL) {
                console.log('[App] Упражнения загружены из кэша');
                return data;
            } else {
                localStorage.removeItem('gym_exercises_cache');
                return null;
            }
        } catch (e) {
            console.warn('[App] Ошибка чтения кэша упражнений:', e);
            return null;
        }
    },
    
    _saveExercisesToCache(exercises) {
        try {
            localStorage.setItem('gym_exercises_cache', JSON.stringify({
                data: exercises,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('[App] Ошибка сохранения кэша упражнений:', e);
        }
    },
    
    async loadGroups() {
        const listEl = document.getElementById('groups-list');
        if (!listEl) return;
        
        // 1. Проверяем кэш в памяти
        if (this.state.groupsCache) {
            UI.renderGroups(this.state.groupsCache);
            // Фоновая загрузка всех упражнений для будущего поиска (без лоадера)
            setTimeout(() => this._loadExercisesInBackground(), 1000);
            return;
        }
        
        // 2. Проверяем localStorage кэш (показываем мгновенно)
        const cachedGroups = this._getCachedGroups();
        if (cachedGroups) {
            this.state.groupsCache = cachedGroups;
            UI.renderGroups(cachedGroups);
            // Фоновая загрузка всех упражнений (без лоадера)
            setTimeout(() => this._loadExercisesInBackground(), 1000);
            
            // Обновляем в фоне (без показа лоадера)
            this._loadGroupsInBackground();
            return;
        }
        
        // 3. Нет кэша - показываем лоадер и загружаем
        UI.renderLoading('groups-list');
        await this._loadGroupsInBackground(true);
    },
    
    async _loadGroupsInBackground(showLoader = false) {
        const listEl = document.getElementById('groups-list');
        const startTime = performance.now();
        
        try {
            console.log('[App] Загрузка групп мышц с сервера...');
            const res = await API.getGroups();
            const duration = Math.round(performance.now() - startTime);
            
            if (res.error) {
                console.error(`[App] Ошибка загрузки групп (${duration}ms):`, res.message);
                
                // Если есть кэш, показываем его даже при ошибке
                const cachedGroups = this._getCachedGroups();
                if (cachedGroups && !showLoader) {
                    return; // Уже показали кэш
                }
                
                if (listEl) {
                    listEl.innerHTML = `<div class="error">
                        <div>❌ Ошибка загрузки</div>
                        <div style="font-size: 12px; margin-top: 8px; color: #888;">${res.message || 'Проверьте подключение к интернету'}</div>
                        <button onclick="App.loadGroups()" style="margin-top: 12px; padding: 8px 16px; background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer;">Повторить</button>
                    </div>`;
                }
                return;
            }
            
            // Исправление двойной сериализации
            const groups = fixDoubleSerialization(res.groups);
            
            if (groups && Array.isArray(groups) && groups.length > 0) {
                console.log(`[App] Загружено групп: ${groups.length} за ${duration}ms`);
                
                // Сохраняем в кэш (память и localStorage)
                this.state.groupsCache = groups;
                this._saveGroupsToCache(groups);
                
                // Обновляем UI только если показывали лоадер
                if (showLoader && listEl) {
                    UI.renderGroups(groups);
                }
                
                // Фоновая загрузка всех упражнений для будущего поиска (без лоадера)
                setTimeout(() => this._loadExercisesInBackground(), 1000);
            } else {
                console.warn('[App] Группы не найдены');
                if (listEl && showLoader) {
                    listEl.innerHTML = '<div class="error">Группы не найдены</div>';
                }
            }
        } catch (e) {
            const duration = Math.round(performance.now() - startTime);
            console.error(`[App] Критическая ошибка (${duration}ms):`, e);
            if (listEl && showLoader) {
                listEl.innerHTML = `<div class="error">
                    <div>❌ Критическая ошибка</div>
                    <div style="font-size: 12px; margin-top: 8px; color: #888;">${e.message}</div>
                </div>`;
            }
        }
    },
    
    async ensureExercisesLoaded(showLoader = false) {
        // 1. Проверяем кэш в памяти
        if (App.allExercisesCache && App.allExercisesCache.length > 0) return true;
        
        // 2. Проверяем localStorage кэш
        const cachedExercises = this._getCachedExercises();
        if (cachedExercises) {
            App.allExercisesCache = cachedExercises;
            // Загружаем в фоне для обновления
            this._loadExercisesInBackground();
            return true;
        }
        
        // 3. Если нужен лоадер (пользователь начал поиск) - показываем
        const list = document.getElementById('groups-list');
        let originalContent = null;
        if (showLoader && list) {
            originalContent = list.innerHTML;
            list.innerHTML = '<div class="loading">Индексация упражнений...</div>';
        }
        
        try {
            const startTime = performance.now();
            // ОДИН запрос вместо 8! Загружаем все упражнения сразу
            const res = await API.getAllExercises();
            const duration = Math.round(performance.now() - startTime);
            
            const exercises = fixDoubleSerialization(res.exercises);
            if (!exercises || exercises.length === 0) {
                throw new Error('Нет упражнений');
            }
            
            // Упражнения уже содержат поле 'group' из бэкенда
            const uniqueMap = new Map();
            exercises.forEach(ex => {
                const exObj = typeof ex === 'string' ? {name: ex} : ex;
                uniqueMap.set(exObj.name, exObj);
            });
            
            const sorted = Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
            App.allExercisesCache = sorted;
            
            // Сохраняем в localStorage
            this._saveExercisesToCache(sorted);
            console.log(`[App] Загружено упражнений: ${sorted.length} за ${duration}ms`);
            
            // Восстанавливаем контент только если показывали лоадер
            if (showLoader && originalContent && list) {
                const currentQuery = document.getElementById('searchGroups')?.value?.trim();
                if (!currentQuery || currentQuery.length === 0) {
                    list.innerHTML = originalContent;
                }
            }
            
            return true;
        } catch (e) {
            console.error("Ошибка кэширования:", e);
            // Восстанавливаем контент при ошибке
            if (showLoader && originalContent && list) {
                list.innerHTML = originalContent;
            }
            return false;
        }
    },
    
    // Фоновая загрузка упражнений (без блокировки UI) - ОДИН запрос вместо 8!
    async _loadExercisesInBackground() {
        try {
            const startTime = performance.now();
            const res = await API.getAllExercises();
            const duration = Math.round(performance.now() - startTime);
            
            const exercises = fixDoubleSerialization(res.exercises);
            if (!exercises || exercises.length === 0) {
                console.warn('[App] Нет упражнений в ответе');
                return;
            }
            
            // Упражнения уже содержат поле 'group' из бэкенда
            const uniqueMap = new Map();
            exercises.forEach(ex => {
                const exObj = typeof ex === 'string' ? {name: ex} : ex;
                uniqueMap.set(exObj.name, exObj);
            });
            
            const sorted = Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
            
            App.allExercisesCache = sorted;
            this._saveExercisesToCache(sorted);
            console.log(`[App] Упражнения обновлены в фоне: ${sorted.length} упражнений за ${duration}ms`);
        } catch (e) {
            console.warn('[App] Ошибка фонового обновления упражнений:', e);
        }
    },

    async selectGroup(group) {
        Haptic.selection(); // 📳 Виброотклик при выборе группы
        this.state.group = group;
        UI.showScreen('exercises');
        UI.updateNav(group, true, false);
        
        const list = document.getElementById('exercises-list');
        list.innerHTML = '<div class="loading">Загрузка...</div>';
        
        const res = await API.getExercises(group);
        if (res.exercises) {
            // Исправление двойной сериализации
            const exercises = fixDoubleSerialization(res.exercises);
            UI.renderExercises(exercises);
        } else {
            list.innerHTML = '<div class="error">Нет упражнений</div>';
        }
    },

    async loadAllExercises(isSearchMode = false) {
        if (!isSearchMode) {
            Haptic.selection(); // 📳 Виброотклик при выборе "Все"
            this.state.group = 'Все';
            UI.showScreen('exercises');
            UI.updateNav('Все', true, false);
        }
        
        const list = isSearchMode ? document.getElementById('groups-list') : document.getElementById('exercises-list');
        if (!isSearchMode) {
            list.innerHTML = '<div class="loading">Загрузка всех упражнений...</div>';
    }
    
    try {
            const groupsRes = await API.getGroups();
            if (!groupsRes.groups || groupsRes.groups.length === 0) {
                list.innerHTML = '<div class="error">Нет групп</div>';
                return;
            }
            
            const allExercises = [];
            for (const group of groupsRes.groups) {
                try {
                    const res = await API.getExercises(group);
                    if (res.exercises) {
                        // Исправление двойной сериализации
                        const exercises = fixDoubleSerialization(res.exercises);
                        allExercises.push(...exercises);
                    }
                } catch (e) {
                    console.error(`Ошибка для группы ${group}:`, e);
                }
            }
            
            // Удаляем дубликаты и сортируем
            const uniqueMap = new Map();
            allExercises.forEach(ex => {
                const name = typeof ex === 'string' ? ex : ex.name;
                if (!uniqueMap.has(name)) {
                    uniqueMap.set(name, typeof ex === 'object' ? ex : {name: ex, desc: '', image: ''});
                }
            });
            
            const unique = Array.from(uniqueMap.values());
            unique.sort((a, b) => {
                const nameA = typeof a === 'string' ? a : a.name;
                const nameB = typeof b === 'string' ? b : b.name;
                return nameA.localeCompare(nameB, 'ru');
            });
            
            // Сохраняем в кэш
            App.allExercisesCache = unique;
            
            if (isSearchMode) {
                // Если вызвали из поиска, сразу фильтруем по текущему значению инпута
                const query = document.getElementById('searchGroups').value;
                UI.filterGlobal(query);
            } else {
                if (unique.length > 0) UI.renderExercises(unique);
                else list.innerHTML = '<div class="error">Нет упражнений</div>';
            }
        } catch (e) {
            console.error('Ошибка загрузки всех упражнений:', e);
            list.innerHTML = '<div class="error">Ошибка подключения</div>';
        }
    },

    async selectExercise(ex) {
        Haptic.selection(); // 📳 Виброотклик при выборе упражнения
        const exerciseName = typeof ex === 'string' ? ex : ex.name;
        const exerciseObj = typeof ex === 'object' ? ex : {name: exerciseName, desc: '', image: ''};
        
        // ❌ УДАЛЯЕМ ГЕНЕРАЦИЮ НОВОЙ СЕССИИ (используем ту, что создана в init на весь день)
        // ❌ УДАЛЯЕМ СБРОС СЧЕТЧИКА (чтобы он продолжался: 5, 6, 7...)
        
        // Если вдруг sessionId нет (баг), создаем страховку
        if (!this.state.sessionId) {
            this.state.sessionId = 'session_' + Date.now();
        }
        
        this.state.exercise = exerciseObj;
        UI.showScreen('workout');
        UI.updateNav(exerciseName, true, true);
        
        // Загрузка последнего результата для автозаполнения
        let historySets = [];
        let lastNote = "";
        
        try {
            const res = await API.getHistory(exerciseName, 'last');
            // Раньше res.sets был массивом, теперь res может быть {sets: [], note: ''}
            historySets = (res && res.sets && Array.isArray(res.sets)) ? res.sets : [];
            lastNote = (res && res.note) ? String(res.note) : "";
        } catch (e) {
            console.warn('[App] Ошибка загрузки истории:', e);
            // Продолжаем с пустыми данными
        }
        
        const initialSets = (historySets.length) 
            ? historySets.map((s, idx) => {
                let rest = s.rest || 0;
                if (rest > 100) rest = rest / 60.0; // Конвертируем секунды в минуты
                return {
                    ...s, 
                    rest, 
                    completed: false, 
                    id: Date.now() + idx + Math.random(),
                    // Сохраняем историю для сравнения
                    prevWeight: parseFloat(s.weight) || 0,
                    prevReps: parseInt(s.reps) || 0
                };
            })
            : [{weight: 0, reps: 0, rest: 0, completed: false, id: Date.now(), prevWeight: 0, prevReps: 0}];
        
        // Инициализируем activeExercises с первым упражнением
        this.state.activeExercises = [{
            name: exerciseName,
            exerciseObj: exerciseObj,
            sets: initialSets,
            note: lastNote  // Загружаем заметку из истории
        }];
        
        // Для обратной совместимости
        this.state.sets = initialSets;
        
        UI.renderWorkoutScreen();
    },

    addSetRow() {
        Haptic.impact('light'); // 📳 Легкая вибрация при добавлении подхода
        const last = this.state.sets[this.state.sets.length - 1] || {weight: 0, reps: 0, rest: 0};
        this.state.sets.push({ ...last, completed: false, id: Date.now() + Math.random() });
        UI.renderSets(this.state.sets);
    },

    updateSetData(id, field, value) {
        const set = this.state.sets.find(s => s.id === id);
        if (set && !set.completed) {
            const normalized = String(value).replace(',', '.');
            if (field === 'reps') {
                set[field] = parseInt(normalized) || 0;
} else {
                set[field] = parseFloat(normalized) || 0;
            }
        }
    },

    async toggleSet(id) {
        // Защита от дублирования записей при быстрых кликах
        if (this.state.isSaving) return;
        
        const idx = this.state.sets.findIndex(s => s.id === id);
        if (idx === -1) return;
        
        const set = this.state.sets[idx];
        if (set.completed) return;
        
        if (!set.weight || !set.reps) {
            Haptic.notification('error'); // 📳 Вибрация ошибки
            alert('Пожалуйста, заполните вес и повторы');
            document.querySelector(`[data-id="${id}"] .set-checkbox`).checked = false;
            return;
        }

        set.completed = true;
        UI.renderSets(this.state.sets);

        // Увеличиваем счетчик
        this.state.orderCounter++;
        localStorage.setItem('gym_order_counter', this.state.orderCounter.toString());

        this.state.isSaving = true;
        try {
            const res = await API.saveSet({
                exercise: this.state.exercise.name,
                weight: set.weight,
                reps: set.reps,
                rest: set.rest,
                order: this.state.orderCounter, // Отправляем порядковый номер
                note: (this.state.activeExercises[0] && this.state.activeExercises[0].note) || ""  // Отправляем заметку из первого упражнения
            });

            if (res.status !== 'success') {
                Haptic.notification('error'); // 📳 Вибрация ошибки
                alert("Ошибка сохранения!");
                set.completed = false;
                UI.renderSets(this.state.sets);
    } else {
                Haptic.impact('medium'); // 📳 Приятный легкий стук при успехе
            }
        } catch (e) {
            console.error('[App] Ошибка сохранения:', e);
            Haptic.notification('error');
            alert("Ошибка сохранения!");
            set.completed = false;
            UI.renderSets(this.state.sets);
        } finally {
            this.state.isSaving = false;
        }
    },

    removeSet(id) {
        const idx = this.state.sets.findIndex(s => s.id === id);
        if (idx !== -1 && !this.state.sets[idx].completed) {
            this.state.sets.splice(idx, 1);
            UI.renderSets(this.state.sets);
        }
    },

    // ==================== SUPERSET FUNCTIONS ====================
    
    updateNote(exIndex, value) {
        if (this.state.activeExercises[exIndex]) {
            this.state.activeExercises[exIndex].note = value;
        }
    },
    
    async toggleSetInSuperset(exIndex, setIndex) {
        // Защита от дублирования записей при быстрых кликах
        if (this.state.isSaving) return;
        
        const exBlock = this.state.activeExercises[exIndex];
        if (!exBlock || !exBlock.sets[setIndex]) return;
        
        const set = exBlock.sets[setIndex];
        if (set.completed) return;
        
        if (!set.weight || !set.reps) {
            Haptic.notification('error');
            alert('Пожалуйста, заполните вес и повторы');
            const checkbox = document.querySelector(`[data-ex-index="${exIndex}"][data-set-id="${set.id}"] .set-checkbox`);
            if (checkbox) checkbox.checked = false;
            return;
        }

        set.completed = true;
        UI.renderWorkoutScreen();

        // Увеличиваем счетчик
        this.state.orderCounter++;
        localStorage.setItem('gym_order_counter', this.state.orderCounter.toString());

        this.state.isSaving = true;
        try {
            const res = await API.saveSet({
                exercise: exBlock.name,
                weight: set.weight,
                reps: set.reps,
                rest: set.rest,
                order: this.state.orderCounter, // Отправляем порядковый номер
                note: exBlock.note || ""  // Отправляем заметку
            });

            if (res.status !== 'success') {
                Haptic.notification('error');
                alert("Ошибка сохранения!");
                set.completed = false;
                UI.renderWorkoutScreen();
            } else {
                Haptic.impact('medium');
            }
        } catch (e) {
            console.error('[App] Ошибка сохранения:', e);
            Haptic.notification('error');
            alert("Ошибка сохранения!");
            set.completed = false;
            UI.renderWorkoutScreen();
        } finally {
            this.state.isSaving = false;
        }
    },

    // Кэш DOM-элементов для быстрого доступа
    _domCache: new Map(),
    
    _getCachedElement(id) {
        if (!this._domCache.has(id)) {
            const el = document.getElementById(id);
            if (el) this._domCache.set(id, el);
            return el;
        }
        return this._domCache.get(id);
    },
    
    _clearDOMCache() {
        this._domCache.clear();
    },
    
    updateSetDataInSuperset(exIndex, setIndex, field, value) {
        const exBlock = this.state.activeExercises[exIndex];
        if (!exBlock || !exBlock.sets[setIndex]) return;
        
        const set = exBlock.sets[setIndex];
        if (set && !set.completed) {
            const normalized = String(value).replace(',', '.');
            if (field === 'reps') {
                set[field] = parseInt(normalized) || 0;
            } else {
                set[field] = parseFloat(normalized) || 0;
            }
            
            // Используем requestAnimationFrame для батчинга обновлений
            requestAnimationFrame(() => {
                const setId = set.id;
                
                // 1. Обновляем 1ПМ (с кэшированием DOM)
                const ormId = `orm-${setId}`;
                const ormEl = this._getCachedElement(ormId);
                if (ormEl) {
                    const oneRM = UI.calculate1RM(set.weight, set.reps);
                    ormEl.textContent = oneRM > 0 ? `🏆 1ПМ: ${oneRM}кг` : '';
                }
                
                // 2. Обновляем Дельту (только если меняем вес)
                if (field === 'weight') {
                    const deltaId = `delta-${setId}`;
                    const deltaEl = this._getCachedElement(deltaId);
                    if (deltaEl) {
                        const deltaObj = UI.getDelta(set.weight, set.prevWeight);
                        if (deltaObj) {
                            deltaEl.textContent = deltaObj.text;
                            deltaEl.className = `stat-delta visible ${deltaObj.class}`;
                        } else {
                            deltaEl.className = 'stat-delta'; // Скрываем
                        }
                    }
                }
            });
        }
    },

    removeSetInSuperset(exIndex, setIndex) {
        const exBlock = this.state.activeExercises[exIndex];
        if (!exBlock || !exBlock.sets[setIndex]) return;
        
        const set = exBlock.sets[setIndex];
        if (!set.completed) {
            exBlock.sets.splice(setIndex, 1);
            UI.renderWorkoutScreen();
        }
    },

    addSetToExercise(exIndex) {
        Haptic.impact('light');
        const exBlock = this.state.activeExercises[exIndex];
        if (!exBlock) return;
        
        const last = exBlock.sets[exBlock.sets.length - 1] || {weight: 0, reps: 0, rest: 0};
        exBlock.sets.push({ ...last, completed: false, id: Date.now() + Math.random() });
        UI.renderWorkoutScreen();
    },

    removeExerciseFromSuperset(exIndex) {
        if (exIndex === 0) return; // Нельзя удалить первое упражнение
        Haptic.impact('light');
        this.state.activeExercises.splice(exIndex, 1);
        UI.renderWorkoutScreen();
    },

    async showAddExerciseModal() {
        Haptic.impact('light');
        UI.toggleModal('modalAddExercise', true);
        const list = document.getElementById('add-exercise-list');
        
        if (!list) {
            console.error('[App] Элемент add-exercise-list не найден');
            return;
        }
        
        list.innerHTML = '<div class="loading">Загрузка групп...</div>';
        
        try {
            // 1. Загружаем группы мышц (это быстро)
            const res = await API.getGroups();
            
            if (res.error) {
                console.error('[App] Ошибка загрузки групп:', res.message);
                list.innerHTML = `<div class="error">Ошибка загрузки: ${res.message || 'Проверьте подключение'}</div>`;
                return;
            }
            
            // 2. Исправление двойной сериализации (как в loadGroups)
            const groups = fixDoubleSerialization(res.groups);
            
            if (!groups || !Array.isArray(groups) || groups.length === 0) {
                console.warn('[App] Группы не найдены или неверный формат:', groups);
                list.innerHTML = '<div class="error">Группы не найдены</div>';
                return;
            }

            // 3. Рендерим группы
            // При клике на группу мы будем загружать упражнения этой группы В ЭТО ЖЕ ОКНО
            // Убеждаемся, что group - это строка
            list.innerHTML = groups.map(group => {
                const groupName = typeof group === 'string' ? group : (group.name || String(group));
                // Экранируем кавычки для безопасной вставки в onclick
                const safeGroupName = groupName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                return `
                    <div class="list-item" onclick="App.loadExercisesForModal('${safeGroupName}')">
                        <div style="flex-grow:1; font-weight:600;">${groupName}</div>
                        <div style="color:#667eea">›</div>
                    </div>
                `;
            }).join('');
            
        } catch (e) {
            console.error('[App] Ошибка в showAddExerciseModal:', e);
            list.innerHTML = '<div class="error">Ошибка сети. Попробуйте позже.</div>';
        }
    },

    // Новая функция: загрузка упражнений внутрь модалки
    async loadExercisesForModal(group) {
        const list = document.getElementById('add-exercise-list');
        
        if (!list) {
            console.error('[App] Элемент add-exercise-list не найден');
            return;
        }
        
        if (!group) {
            console.error('[App] Не указана группа мышц');
            list.innerHTML = '<div class="error">Ошибка: не указана группа</div>';
            return;
        }
        
        list.innerHTML = '<div class="loading">Загрузка упражнений...</div>';
        
        try {
            const res = await API.getExercises(group);
            
            if (res.error) {
                console.error('[App] Ошибка загрузки упражнений:', res.message);
                list.innerHTML = `<div class="error">Ошибка загрузки: ${res.message || 'Проверьте подключение'}</div>`;
                return;
            }
            
            if (!res.exercises) {
                list.innerHTML = '<div class="error">Упражнения не найдены</div>';
                return;
            }
            
            // Исправление двойной сериализации
            const exercises = fixDoubleSerialization(res.exercises);
            
            if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
                list.innerHTML = '<div class="error">Упражнения не найдены</div>';
                return;
            }
            
            // Рендерим список упражнений
            // Добавляем кнопку "Назад к группам" сверху
            const backBtn = `
                <div class="list-item" style="background:#f0f2f5; margin-bottom:10px;" onclick="App.showAddExerciseModal()">
                    <div style="font-weight:bold; color:#666">← Назад к группам</div>
                </div>
            `;
            
            const exercisesHtml = exercises.map(ex => {
                const name = typeof ex === 'string' ? ex : (ex.name || String(ex));
                // Фильтруем, если такое упражнение уже есть в суперсете
                const isAdded = App.state.activeExercises && App.state.activeExercises.some(active => active.name === name);
                
                if (isAdded) return ''; // Не показываем уже добавленные
                
                // Безопасная сериализация объекта упражнения
                const exObj = typeof ex === 'string' ? {name: name} : ex;
                
                return `
                    <div class="list-item" onclick='App.addExerciseToSuperset(${JSON.stringify(exObj).replace(/'/g, "&#39;")})'>
                        <div style="flex-grow:1">${name}</div>
                        <div style="color:#28a745; font-weight:bold;">+</div>
                    </div>
                `;
            }).filter(html => html.length > 0).join('');
            
            list.innerHTML = backBtn + (exercisesHtml || '<div style="padding:15px; text-align:center">Все упражнения уже добавлены</div>');
            
        } catch (e) {
            console.error('[App] Ошибка в loadExercisesForModal:', e);
            list.innerHTML = '<div class="error">Ошибка загрузки. Попробуйте позже.</div>';
        }
    },

    async addExerciseToSuperset(ex) {
        Haptic.selection();
        const exerciseName = typeof ex === 'string' ? ex : ex.name;
        const exerciseObj = typeof ex === 'object' ? ex : {name: exerciseName, desc: '', image: ''};
        
        // Загружаем последний результат для автозаполнения
        const res = await API.getHistory(exerciseName, 'last');
        const historySets = res.sets || [];
        const lastNote = res.note || "";
        
        const initialSets = (historySets.length) 
            ? historySets.map((s, idx) => {
                let rest = s.rest || 0;
                if (rest > 100) rest = rest / 60.0;
                return {
                    ...s, 
                    rest, 
                    completed: false, 
                    id: Date.now() + idx + Math.random(),
                    // Сохраняем историю для сравнения
                    prevWeight: parseFloat(s.weight) || 0,
                    prevReps: parseInt(s.reps) || 0
                };
            })
            : [{weight: 0, reps: 0, rest: 0, completed: false, id: Date.now(), prevWeight: 0, prevReps: 0}];
        
        // Добавляем упражнение в суперсет
        App.state.activeExercises.push({
            name: exerciseName,
            exerciseObj: exerciseObj,
            sets: initialSets,
            note: lastNote  // Загружаем заметку из истории
        });
        
        UI.toggleModal('modalAddExercise', false);
        UI.renderWorkoutScreen();
    },

    async loadHistory() {
        Haptic.impact('light'); // 📳 Легкая вибрация при открытии истории
        UI.toggleModal('modalHistory', true);
        const cont = document.getElementById('history-content');
        cont.innerHTML = 'Загрузка...';
        
        // Берем имя первого упражнения для истории
        const exerciseName = App.state.activeExercises.length > 0 
            ? App.state.activeExercises[0].name 
            : (App.state.exercise ? App.state.exercise.name : '');
        
        if (!exerciseName) {
            cont.innerHTML = "Выберите упражнение";
        return;
    }
    
        const res = await API.getHistory(exerciseName);
        if (res.history) UI.renderHistory(res.history);
        else cont.innerHTML = "Пусто";
    }
};
