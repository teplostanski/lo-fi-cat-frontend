/**
 * Утилиты для работы со временем
 */

/**
 * Форматирует миллисекунды в формат HH:MM:SS
 * @param {number} milliseconds - Время в миллисекундах
 * @returns {string} Отформатированное время
 */
export function formatTime(milliseconds) {
    let totalSeconds = Math.floor(milliseconds / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds -= hours * 3600;
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds - minutes * 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
