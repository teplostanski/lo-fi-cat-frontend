/**
 * Вспомогательные функции для UI
 */

/**
 * Возвращает CSS класс для статуса подключения
 * @param {string} websocketStatus - Статус WebSocket
 * @returns {string} CSS класс
 */
export function getStatusClass(websocketStatus) {
    switch (websocketStatus) {
        case 'connected': return 'connected';
        case 'connecting': return 'connecting';
        case 'disconnected': return 'disconnected';
        default: return 'connecting';
    }
}

/**
 * Возвращает текст статуса подключения
 * @param {string} websocketStatus - Статус WebSocket
 * @returns {string} Текст статуса
 */
export function getStatusText(websocketStatus) {
    switch (websocketStatus) {
        case 'connected': return 'Подключено';
        case 'connecting': return 'Поключение';
        case 'disconnected': return 'Нет соединения';
        default: return 'Поключение';
    }
}

/**
 * Возвращает CSS класс для кнопки mute
 * @param {string} playerStatus - Статус плеера
 * @param {boolean} isMuted - Заглушен ли звук
 * @returns {string} CSS класс
 */
export function getMuteButtonClass(playerStatus, isMuted) {
    if (playerStatus === 'loading') {
        return 'loading-icon';
    }
    return isMuted ? 'muted-btn' : '';
}

/**
 * Возвращает текст для кнопки mute
 * @param {Object} state - Состояние приложения
 * @returns {string} Текст кнопки
 */
export function getMuteButtonText(state) {
    if (state.playerStatus === 'loading') {
        if (state.isRetrying && state.retryCount > 0) {
            return `Повторная попытка (${state.retryCount})`;
        }
        return 'Loading';
    }
    // При первом запуске (stopped и никогда не играло) показываем "Play"
    if (state.playerStatus === 'stopped' && !state.hasPlayedOnce) {
        return 'Запустить';
    }
    // После начала воспроизведения показываем Mute/Unmute
    return state.isMuted ? 'Продолжить' : 'Заглушить';
}
