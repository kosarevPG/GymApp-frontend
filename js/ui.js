// ==================== UI RENDERER ====================
const UI = {
    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`screen-${id}`).classList.add('active');
        App.state.screen = id;
    },

    updateNav(title, back = false, history = false) {
        // Если title пустой или 'GymApp', не показываем заголовок
        const navTitle = document.getElementById('navbarTitle');
        if (!title || title === 'GymApp' || title.trim() === '') {
            navTitle.textContent = '';
        } else {
            navTitle.textContent = title;
        }
        document.getElementById('btnBack').classList.toggle('hidden', !back);
        document.getElementById('btnHistory').classList.toggle('hidden', !history);
    },

    toggleModal(id, show) {
        const modal = document.getElementById(id);
        if (id === 'infoModal') {
            modal.classList.toggle('open', show);
        } else {
            modal.classList.toggle('active', show);
        }
    },

    renderLoading(id) {
        document.getElementById(id).innerHTML = '<div class="loading">Загрузка...</div>';
    },

    // Маппинг картинок для групп
    getGroupImage(groupName) {
        const map = {
            'Грудь': 'img/chest.png', 
            'Спина': 'img/back.png',
            'Ноги': 'img/legs.png',
            'Плечи': 'img/shoulders.png',
            'Руки': 'img/arms.png',
            'Бицепс': 'img/biceps.png',
            'Трицепс': 'img/triceps.png',
            'Кардио': 'img/cardio.png',
            'Пресс': 'img/abs.png'
        };
        return map[groupName] || null;
    },

    renderGroups(groups) {
        const container = document.getElementById('groups-list');
        if (!container) return;
        
        // Используем DocumentFragment для батчинга вставок
        const fragment = document.createDocumentFragment();
        const listContainer = document.createElement('div');
        listContainer.className = 'list-container';
        
        // Сортируем группы в нужном порядке
        const order = ['Спина', 'Ноги', 'Грудь', 'Плечи', 'Бицепс', 'Трицепс', 'Кардио', 'Пресс'];
        const sortedGroups = order.filter(g => groups.includes(g))
            .concat(groups.filter(g => !order.includes(g)));
        
        // Рендерим как список с DocumentFragment и ленивой загрузкой
        sortedGroups.forEach(group => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.onclick = () => App.selectGroup(group);
            
            const imgSrc = this.getGroupImage(group);
            if (imgSrc) {
                const img = document.createElement('img');
                img.className = 'list-img';
                img.loading = 'lazy'; // Ленивая загрузка
                img.src = imgSrc;
                img.onerror = function() {
                    this.style.display = 'none';
                    const placeholder = item.querySelector('.list-img.placeholder');
                    if (placeholder) placeholder.style.display = 'flex';
                };
                item.appendChild(img);
                
                const placeholder = document.createElement('div');
                placeholder.className = 'list-img placeholder';
                placeholder.style.display = 'none';
                placeholder.textContent = group[0];
                item.appendChild(placeholder);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'list-img placeholder';
                placeholder.textContent = group[0];
                item.appendChild(placeholder);
            }
            
            const content = document.createElement('div');
            content.className = 'list-content';
            
            const title = document.createElement('span');
            title.className = 'list-title';
            title.textContent = group;
            content.appendChild(title);
            
            const arrow = document.createElement('span');
            arrow.className = 'list-arrow';
            arrow.textContent = '›';
            content.appendChild(arrow);
            
            item.appendChild(content);
            listContainer.appendChild(item);
        });
        
        fragment.appendChild(listContainer);
        
        const footer = document.createElement('div');
        footer.className = 'groups-footer';
        const btn = document.createElement('button');
        btn.className = 'btn-all';
        btn.textContent = 'Все упражнения';
        btn.onclick = () => App.loadAllExercises();
        footer.appendChild(btn);
        fragment.appendChild(footer);
        
        container.innerHTML = '';
        container.appendChild(fragment);
    },

    renderExercises(list) {
        const container = document.getElementById('exercises-list');
        if (!container) return;
        
        if (!list || list.length === 0) {
            container.innerHTML = '<div class="loading">Ничего не найдено</div>';
            return;
        }
        
        // Используем DocumentFragment для батчинга вставок
        const fragment = document.createDocumentFragment();
        
        list.forEach(ex => {
            const name = typeof ex === 'string' ? ex : ex.name;
            const image = (typeof ex === 'object' && ex.image) ? ex.image : null;
            
            const item = document.createElement('div');
            item.className = 'list-item exercise-item';
            item.setAttribute('data-name', name.toLowerCase());
            
            // Блок картинки (Кликабельный -> Инфо)
            if (image) {
                const img = document.createElement('img');
                img.className = 'list-img';
                img.loading = 'lazy'; // Ленивая загрузка
                img.src = image;
                img.onclick = (e) => {
                    e.stopPropagation();
                    UI.showInfo(ex);
                };
                item.appendChild(img);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'list-img placeholder';
                placeholder.textContent = 'ℹ️';
                placeholder.onclick = (e) => {
                    e.stopPropagation();
                    UI.showInfo(ex);
                };
                item.appendChild(placeholder);
            }
            
            const content = document.createElement('div');
            content.className = 'list-content';
            content.onclick = () => App.selectExercise(ex);
            
            const title = document.createElement('span');
            title.className = 'list-title';
            title.textContent = name;
            content.appendChild(title);
            
            const arrow = document.createElement('span');
            arrow.className = 'list-arrow';
            arrow.textContent = '›';
            content.appendChild(arrow);
            
            item.appendChild(content);
            fragment.appendChild(item);
        });
        
        container.innerHTML = '';
        container.appendChild(fragment);
    },

    // Логика Поиска (Фильтрация на лету)
    filterExercises(query) {
        const q = query.toLowerCase();
        const items = document.querySelectorAll('.exercise-item');
        
        items.forEach(item => {
            const name = item.getAttribute('data-name');
            if (name.includes(q)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    },
    
    // Глобальный поиск на главной (поиск по упражнениям, не по группам)
    // Глобальный поиск на главной (поиск по упражнениям внутри групп)
    // Глобальный поиск на главной (мгновенный поиск без запросов к серверу)
    async filterGlobal(query) {
        const q = query.toLowerCase().trim();
        const list = document.getElementById('groups-list');
        
        // 1. Если пусто - показываем Группы (из кэша DOM или перерисовываем)
        if (q.length === 0) {
            // Чтобы не грузить сервер, просто рисуем группы (данные о группах можно тоже закэшировать, но пока так)
            if (App.state.groupsCache) {
                UI.renderGroups(App.state.groupsCache);
            } else {
                App.loadGroups(); // Только если совсем нет данных
            }
            return;
        }
        
        // 2. Проверяем кэш упражнений
        if (!App.allExercisesCache || App.allExercisesCache.length === 0) {
            // Если кэша нет - загружаем его с показом лоадера (пользователь ждет)
            const success = await App.ensureExercisesLoaded(true);
            if (!success) {
                list.innerHTML = '<div class="error">Ошибка поиска</div>';
                return;
            }
        }
        
        // 3. Фильтруем в памяти (Мгновенно!)
        const filtered = App.allExercisesCache.filter(ex => {
            return ex.name.toLowerCase().includes(q);
        });
        
        if (filtered.length === 0) {
            list.innerHTML = '<div class="loading">Ничего не найдено</div>';
            return;
        }
        
        // 4. Рендерим результат с DocumentFragment и ленивой загрузкой
        const fragment = document.createDocumentFragment();
        const listContainer = document.createElement('div');
        listContainer.className = 'list-container';
        
        filtered.forEach(ex => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.onclick = () => App.selectExercise(ex);
            
            const image = ex.image || null;
            if (image) {
                const img = document.createElement('img');
                img.className = 'list-img';
                img.loading = 'lazy'; // Ленивая загрузка
                img.src = image;
                img.onclick = (e) => {
                    e.stopPropagation();
                    UI.showInfo(ex);
                };
                item.appendChild(img);
            } else {
                const placeholder = document.createElement('div');
                placeholder.className = 'list-img placeholder';
                placeholder.textContent = 'ℹ️';
                placeholder.onclick = (e) => {
                    e.stopPropagation();
                    UI.showInfo(ex);
                };
                item.appendChild(placeholder);
            }
            
            const content = document.createElement('div');
            content.className = 'list-content';
            
            const innerDiv = document.createElement('div');
            
            const title = document.createElement('span');
            title.className = 'list-title';
            title.textContent = ex.name;
            innerDiv.appendChild(title);
            
            if (ex.group) {
                const groupLabel = document.createElement('div');
                groupLabel.style.cssText = 'font-size:12px; color:var(--text-secondary); margin-top:2px;';
                groupLabel.textContent = ex.group;
                innerDiv.appendChild(groupLabel);
            }
            
            content.appendChild(innerDiv);
            
            const arrow = document.createElement('span');
            arrow.className = 'list-arrow';
            arrow.textContent = '›';
            content.appendChild(arrow);
            
            item.appendChild(content);
            listContainer.appendChild(item);
        });
        
        fragment.appendChild(listContainer);
        list.innerHTML = '';
        list.appendChild(fragment);
    },

    renderSets(sets) {
        // Старая функция для обратной совместимости
        const container = document.getElementById('sets-container');
        container.innerHTML = sets.map((set, index) => {
            const setId = set.id || (Date.now() + index);
            const safeId = JSON.stringify(setId);
            return `
                <div class="set-row ${set.completed ? 'completed' : ''}" data-id="${setId}">
                    <input type="checkbox" class="set-checkbox" ${set.completed ? 'checked disabled' : ''} 
                           onchange="App.toggleSet(${safeId})">
                    <div class="set-inputs-group">
                        <div class="set-input-wrapper">
                            <div class="input-label">Вес</div>
                            <input type="text" inputmode="decimal" class="set-input" 
                                   value="${String(set.weight || 0).replace(',', '.')}" 
                                   oninput="const val = UI.validateFloatInput(this); App.updateSetData(${safeId}, 'weight', val)"
                                   onfocus="this.select()"
                                   ${set.completed ? 'disabled' : ''} placeholder="0">
                        </div>
                        <div class="set-input-wrapper">
                            <div class="input-label">Повторы</div>
                            <input type="text" inputmode="numeric" class="set-input" 
                                   value="${set.reps || 0}" 
                                   oninput="App.updateSetData(${safeId}, 'reps', this.value)"
                                   onfocus="this.select()"
                                   ${set.completed ? 'disabled' : ''} placeholder="0">
                        </div>
                        <div class="set-input-wrapper">
                            <div class="input-label">Отдых (мин)</div>
                            <input type="text" inputmode="decimal" class="set-input" 
                                   value="${set.rest || 0}" 
                                   oninput="const val = UI.validateFloatInput(this); App.updateSetData(${safeId}, 'rest', val)"
                                   onfocus="this.select()"
                                   ${set.completed ? 'disabled' : ''} placeholder="0" step="0.5">
                        </div>
                    </div>
                    <button class="set-remove ${set.completed ? 'hidden' : ''}" 
                            onclick="App.removeSet(${safeId})">×</button>
                </div>
            `;
        }).join('');
    },

    renderWorkoutScreen() {
        const container = document.getElementById('sets-container');
        if (!container) {
            console.error('[UI] sets-container не найден');
            return;
        }
        
        // Если упражнений нет (баг), очищаем
        if (!App.state.activeExercises || App.state.activeExercises.length === 0) {
            console.warn('[UI] activeExercises пуст или не определен');
            container.innerHTML = '<div class="error">Ошибка состояния: нет активных упражнений</div>';
            return;
        }
        
                // Очищаем кэш DOM при полной перерисовке
                App._clearDOMCache();
        
        // Используем requestAnimationFrame для оптимизации рендеринга
        requestAnimationFrame(() => {
        try {
        // Рендерим каждую карточку упражнения
        const cardsHtml = App.state.activeExercises.map((exBlock, exIndex) => {
            // Безопасная проверка структуры exBlock
            if (!exBlock || !exBlock.name) {
                console.error(`[UI] Некорректный exBlock для индекса ${exIndex}:`, exBlock);
                return '<div class="error">Ошибка данных упражнения</div>';
            }
            const exerciseName = exBlock.name;
            const sets = exBlock.sets || [];
            
            // Генерируем HTML подходов (как было, но внутри контекста)
            const setsHtml = sets.map((set, setIndex) => {
                const setId = set.id || (Date.now() + exIndex * 1000 + setIndex);
                const safeId = JSON.stringify(setId); // Для совместимости
                
                // Считаем начальные значения
                const oneRM = UI.calculate1RM(set.weight, set.reps);
                const deltaObj = UI.getDelta(set.weight, set.prevWeight);
                
                let deltaHtml = '';
                if (deltaObj) {
                    deltaHtml = `<span class="stat-delta visible ${deltaObj.class}" id="delta-${setId}">${deltaObj.text}</span>`;
                } else {
                    deltaHtml = `<span class="stat-delta" id="delta-${setId}"></span>`;
                }

                const ormHtml = `<span class="stat-1rm" id="orm-${setId}">${oneRM > 0 ? '🏆 1ПМ: ' + oneRM + 'кг' : ''}</span>`;
                
                return `
                    <div class="set-row ${set.completed ? 'completed' : ''}" data-ex-index="${exIndex}" data-set-id="${setId}">
                        <input type="checkbox" class="set-checkbox" ${set.completed ? 'checked disabled' : ''} 
                               onchange="App.toggleSetInSuperset(${exIndex}, ${setIndex})">
                        
                        <div style="flex: 1; width: 100%;">
                            <div class="set-inputs-group">
                                <div class="set-input-wrapper">
                                    <div class="input-label">Вес</div>
                                    <input type="text" inputmode="decimal" class="set-input" 
                                           value="${String(set.weight || 0).replace(',', '.')}" 
                                           oninput="const val = UI.validateFloatInput(this); App.updateSetDataInSuperset(${exIndex}, ${setIndex}, 'weight', val)"
                                           onfocus="this.select()"
                                           ${set.completed ? 'disabled' : ''} placeholder="0">
                                </div>
                                <div class="set-input-wrapper">
                                    <div class="input-label">Повт</div>
                                    <input type="tel" inputmode="numeric" class="set-input" 
                                           value="${set.reps || 0}" 
                                           oninput="App.updateSetDataInSuperset(${exIndex}, ${setIndex}, 'reps', this.value)"
                                           onfocus="this.select()"
                                           ${set.completed ? 'disabled' : ''} placeholder="0">
                                </div>
                                <div class="set-input-wrapper">
                                    <div class="input-label">Отд(м)</div>
                                    <input type="text" inputmode="decimal" class="set-input" 
                                           value="${set.rest || 0}" 
                                           oninput="const val = UI.validateFloatInput(this); App.updateSetDataInSuperset(${exIndex}, ${setIndex}, 'rest', val)"
                                           onfocus="this.select()"
                                           ${set.completed ? 'disabled' : ''} placeholder="0" step="0.5">
                                </div>
                            </div>
                            
                            <div class="stats-row">
                                ${ormHtml}
                                ${deltaHtml}
                            </div>
                        </div>
                        
                        <button class="set-remove ${set.completed ? 'hidden' : ''}" 
                                onclick="App.removeSetInSuperset(${exIndex}, ${setIndex})">×</button>
                    </div>
                `;
            }).join('');
            
            // Берем текущее значение заметки или пустую строку (безопасная проверка)
            const currentNote = exBlock.note ? String(exBlock.note) : '';
            const safeNoteValue = currentNote.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            
            // HTML заметки
            const noteHtml = `
                <div class="note-wrapper">
                    <span class="note-icon">📝</span>
                    <input type="text" class="note-input" 
                        placeholder="Настройки (напр. Сиденье 4)" 
                        value="${safeNoteValue}"
                        oninput="App.updateNote(${exIndex}, this.value)">
                </div>
            `;
            
            // Собираем карточку целиком
            return `
                <div class="exercise-card">
                    <div class="exercise-header">
                        <span class="exercise-title">${exIndex + 1}. ${exerciseName}</span>
                        ${exIndex > 0 ? `<button class="btn-remove-exercise" onclick="App.removeExerciseFromSuperset(${exIndex})">×</button>` : ''}
                    </div>
                    
                    ${noteHtml}
                    
                    <div class="exercise-sets">
                        ${setsHtml}
                    </div>
                    
                    <button class="btn-add-set-small" onclick="App.addSetToExercise(${exIndex})">
                        + Добавить подход
                    </button>
                </div>
            `;
        }).join('');
        
        // Добавляем красивую кнопку "Добавить упражнение" в самом низу
        const addExerciseBtn = `
            <button class="btn-add-exercise-global" onclick="App.showAddExerciseModal()">
                <span>➕</span> Добавить упражнение в сет
            </button>
        `;
        
        container.innerHTML = cardsHtml + addExerciseBtn;
        } catch (e) {
            console.error('[UI] Ошибка рендеринга экрана тренировки:', e);
            container.innerHTML = `<div class="error">Ошибка отрисовки: ${e.message}</div>`;
        }
        });
    },

    renderHistory(historyData) {
        const container = document.getElementById('history-content');
        container.innerHTML = '';
        
        if (!historyData || historyData.length === 0) {
            container.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">История пуста</div>';
                return;
            }
            
        // 1. Группируем по ДАТЕ
        const byDate = {};
        historyData.forEach(item => {
            let dateKey = String(item.date || '').split(',')[0].trim();
            if (!dateKey) return;
            
            if (!byDate[dateKey]) byDate[dateKey] = {};
            
            // 2. Внутри даты группируем по set_group_id
            const groupId = item.set_group_id || 'unknown_' + Math.random();
            if (!byDate[dateKey][groupId]) byDate[dateKey][groupId] = [];
            byDate[dateKey][groupId].push(item);
        });
        
        // Сортировка дат
        const sortedDates = Object.keys(byDate).sort((a, b) => {
            // Преобразуем 23.11.2025 в 2025-11-23 для сортировки
            const toISO = (d) => d.split('.').reverse().join('-');
            return toISO(b).localeCompare(toISO(a));
        });
        
        // Рендеринг
        let fullHtml = '';
        
        sortedDates.forEach(date => {
            fullHtml += `<div class="history-date-header">📅 ${date}</div>`;
            
            const groupsInDate = byDate[date];
            Object.values(groupsInDate).forEach(groupItems => {
                
                // Определяем, суперсет это или обычный сет
                // (если в группе есть упражнения с разными названиями)
                const uniqueNames = [...new Set(groupItems.map(i => i.exercise))];
                const isSuperset = uniqueNames.length > 1;
                
                // Заголовок карточки
                let headerHtml = '';
                if (isSuperset) {
                    headerHtml = `
                        <div class="history-superset-header">
                            <span class="badge-superset">Суперсет</span>
                            <span>${uniqueNames.join(' + ')}</span>
                        </div>
                    `;
                }
                
                // Список подходов
                const rowsHtml = groupItems.map(item => {
                    // Показываем имя упражнения только если это суперсет
                    const nameBlock = isSuperset 
                        ? `<div class="history-ex-name">${item.exercise}</div>` 
                        : '';
                    
                    // Форматируем отдых
                    let restDisplay = '';
                    if (item.rest) {
                        let restMinutes = item.rest;
                        if (restMinutes > 100) restMinutes = restMinutes / 60.0;
                        if (restMinutes % 1 === 0) {
                            restDisplay = `${restMinutes}м`;
                        } else {
                            restDisplay = `${restMinutes.toFixed(1)}м`;
                        }
                    }
                        
                    return `
                        <div class="history-item-row">
                            <div>
                                ${nameBlock}
                                <div class="history-ex-vals">
                                    ${item.weight} кг × ${item.reps}
                                </div>
                            </div>
                            <div style="color:#aaa; font-size:12px;">
                                ${restDisplay}
                            </div>
                        </div>
                    `;
                }).join('');
                
                fullHtml += `
                    <div class="history-superset-card">
                        ${headerHtml}
                        ${rowsHtml}
                    </div>
                `;
            });
        });
        
        container.innerHTML = fullHtml;
    },

    showInfo(ex) {
        Haptic.impact('light'); // 📳 Легкая вибрация при открытии информации
        const exerciseName = typeof ex === 'string' ? ex : ex.name;
        const exerciseDesc = typeof ex === 'object' ? (ex.desc || 'Описание отсутствует') : '';
        const exerciseImage = typeof ex === 'object' ? (ex.image || '') : '';
        
        document.getElementById('modalTitle').textContent = exerciseName;
        const descEl = document.getElementById('modalDesc');
        descEl.textContent = (exerciseDesc && exerciseDesc !== 'undefined' && exerciseDesc !== 'Описание отсутствует') 
            ? exerciseDesc 
            : 'Описание пока не добавлено.';
        
        const imgEl = document.getElementById('modalImage');
        if (exerciseImage && exerciseImage !== 'undefined' && exerciseImage !== '') {
            imgEl.src = exerciseImage;
            imgEl.style.display = 'block';
                } else {
            imgEl.style.display = 'none';
        }
        
        this.toggleModal('infoModal', true);
    },

    // === Функции расчета микро-аналитики (с мемоизацией) ===
    _1RMCache: new Map(),
    _deltaCache: new Map(),
    
    calculate1RM(weight, reps) {
        const w = parseFloat(weight) || 0;
        const r = parseInt(reps) || 0;
        if (w === 0 || r === 0) return 0;
        if (r === 1) return w;
        
        // Мемоизация: проверяем кэш
        const cacheKey = `${w}_${r}`;
        if (this._1RMCache.has(cacheKey)) {
            return this._1RMCache.get(cacheKey);
        }
        
        // Формула Эпли: Weight * (1 + Reps/30)
        const result = Math.round(w * (1 + r / 30));
        this._1RMCache.set(cacheKey, result);
        
        // Ограничиваем размер кэша (максимум 1000 записей)
        if (this._1RMCache.size > 1000) {
            const firstKey = this._1RMCache.keys().next().value;
            this._1RMCache.delete(firstKey);
        }
        
        return result;
    },

    getDelta(current, prev) {
        const curVal = parseFloat(current) || 0;
        const prevVal = parseFloat(prev) || 0;
        
        if (prevVal === 0) return null; // Нет истории - нет дельты
        
        // Мемоизация: проверяем кэш
        const cacheKey = `${curVal}_${prevVal}`;
        if (this._deltaCache.has(cacheKey)) {
            return this._deltaCache.get(cacheKey);
        }
        
        const diff = curVal - prevVal;
        // Округляем до 1 знака, если дробное (например 2.5), иначе целое
        const diffStr = Number.isInteger(diff) ? diff : diff.toFixed(1);
        
        let result;
        if (diff > 0) result = { text: `+${diffStr} кг`, class: 'positive' };
        else if (diff < 0) result = { text: `${diffStr} кг`, class: 'negative' };
        else result = { text: '0', class: 'neutral' };
        
        this._deltaCache.set(cacheKey, result);
        
        // Ограничиваем размер кэша
        if (this._deltaCache.size > 1000) {
            const firstKey = this._deltaCache.keys().next().value;
            this._deltaCache.delete(firstKey);
        }
        
        return result;
    },
    
    // Очистка кэшей (вызывать при необходимости)
    clearCalculationCache() {
        this._1RMCache.clear();
        this._deltaCache.clear();
    },

    validateFloatInput(input) {
        let val = input.value.replace(/[^0-9.,]/g, '');
        val = val.replace(',', '.');
        const parts = val.split('.');
        if (parts.length > 2) {
            val = parts[0] + '.' + parts.slice(1).join('');
        }
        if (input.value !== val) {
            input.value = val;
        }
        return val;
    }
};
