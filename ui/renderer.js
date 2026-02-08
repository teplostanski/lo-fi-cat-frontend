import { getStatusClass, getStatusText, getMuteButtonClass, getMuteButtonText } from './view-helpers.js';

/**
 * Рендеринг UI компонентов
 */
export class Renderer {
    constructor() {
        this.playerCard = document.getElementById('playerCard');
    }

    /**
     * Рендерит основной интерфейс плеера
     * @param {Object} state - Состояние приложения
     */
    render(state) {
        if (state.errorMessage) {
            this.renderError(state.errorMessage);
            return;
        }

        if (!state.serverInfo || !state.fmInfo) {
            this.renderLoading();
            return;
        }

        this.renderPlayer(state);
    }

    /**
     * Рендерит сообщение об ошибке
     * @param {string} errorMessage - Сообщение об ошибке
     */
    renderError(errorMessage) {
        this.playerCard.innerHTML = `
            <div class="error">
                ${errorMessage}
            </div>
        `;
    }

    /**
     * Рендерит состояние загрузки
     */
    renderLoading() {
        this.playerCard.innerHTML = `
            <div class="loading">
                Loading...
            </div>
        `;
    }

    /**
     * Рендерит интерфейс плеера
     * @param {Object} state - Состояние приложения
     */
    renderPlayer(state) {
        const { serverInfo, fmInfo, runningTime, playerStatus } = state;

        this.playerCard.innerHTML = `
            <div class="header">
                <div class="app-name">lo-fi cat</div>
                <div class="header-right">
                    <div class="running-time">${runningTime}</div>
                    <div class="status-indicator">
                        <span class="connection-status ${getStatusClass(state.websocketStatus)}"></span>
                        ${getStatusText(state.websocketStatus)}
                    </div>
                </div>
            </div>

            <div class="music-info">
                <img src="${fmInfo.cover}" alt="Album Cover" class="album-cover">
                <div class="track-info">
                    <div class="track-title">${fmInfo.title}</div>
                    <div class="track-artist">${fmInfo.artist}</div>
                </div>
                <div class="controls">
                    <button class="mute-btn ${getMuteButtonClass(playerStatus, state.isMuted)}" data-action="toggle-mute" title="${state.playerStatus === 'stopped' && !state.hasPlayedOnce ? 'Нажмите чтобы начать воспроизведение' : (state.isMuted ? 'Нажмите чтобы включить звук' : 'Нажмите чтобы выключить звук')}">
                        ${getMuteButtonText(state)}
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Обновляет только время работы без полной перерисовки
     * @param {string} runningTime - Время работы в формате HH:MM:SS
     */
    updateRunningTime(runningTime) {
        const runningTimeElement = document.querySelector('.running-time');
        if (runningTimeElement) {
            runningTimeElement.textContent = runningTime;
        }
    }

    /**
     * Обновляет фоновое изображение
     * @param {string} coverUrl - URL обложки
     */
    updateBackground(coverUrl) {
        const backgroundBlur = document.getElementById('backgroundBlur');
        if (backgroundBlur) {
            backgroundBlur.style.backgroundImage = `url(${coverUrl})`;
        }
    }
}
