// Глобальные функции для onclick (для совместимости с HTML)
function goBack() { App.goBack(); }
function showHistory() { App.loadHistory(); }
function closeHistory() { UI.toggleModal('modalHistory', false); }
function openInfoModal(title, desc, image) { UI.showInfo({name: title, desc, image}); }
function closeInfoModal(event) {
    if (event === null || event.target.id === 'infoModal') {
        UI.toggleModal('infoModal', false);
    }
}
function toggleTimer() { Timer.toggle(); }
function resetTimer() { Timer.reset(); }
function addSet() { App.addSetRow(); }

// Start
document.addEventListener('DOMContentLoaded', () => App.init());

