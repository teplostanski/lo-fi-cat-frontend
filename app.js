import { getApiUrl, getWebSocketUrl } from './config.js';

class StreamRadio {
    constructor() {
        this.state = {
            errorMessage: '',
            runningTime: '00:00:00',
            timer: null,
            serverInfo: null,
            fmInfo: null,
            playerStatus: 'stopped', // 'loading', 'playing', 'stopped'
            websocketStatus: 'connecting', // 'connecting', 'connected', 'disconnected'
            isMuted: true, // Изначально в режиме без звука
            retryCount: 0, // Счетчик попыток
            retryTimer: null, // Таймер повторных попыток
            isRetrying: false, // Выполняется ли повторная попытка
            hasPlayedOnce: false // Было ли хотя бы одно успешное воспроизведение
        };
        
        this.audioPlayer = document.getElementById('audioPlayer');
        this.socket = null;
        this.destroyWebsocket = () => {};
        this.eventListenersSetup = false;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.render();
        this.setTimerToUpdateRunningTime();
        
        try {
            await this.initInfo();
            this.initWebsocket();
        } catch (err) {
            this.setState({
                errorMessage: err.message || err.toString()
            });
        }
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.render();
    }

    async initInfo() {
        const response = await fetch(getApiUrl('/info'));
        const result = await response.json();
        const { name, version, time, FMInfo } = result.data;
        const { cover, title, artist, sampleRate, bitRate, url } = FMInfo;
        
        // Обновляем URL для обложки и аудио, чтобы они указывали на бэкенд
        const coverUrl = getApiUrl(`/fm/info/cover`);
        const audioUrl = getApiUrl(`/fm`);
        
        this.setState({
            serverInfo: { name, version, time },
            fmInfo: { cover: coverUrl, title, artist, sampleRate, bitRate, url: audioUrl }
        });

        // Обновляем информацию PWA
        this.updatePWAInfo(name, coverUrl);

        // Обновляем фон
        const backgroundBlur = document.getElementById('backgroundBlur');
        backgroundBlur.style.backgroundImage = `url(${coverUrl})`;
    }

    updatePWAInfo(appName, iconUrl) {
        // Обновляем заголовок страницы
        document.title = appName;
        
        // Обновляем apple-mobile-web-app-title
        let appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (appleTitleMeta) {
            appleTitleMeta.setAttribute('content', appName);
        }
        
        // Обновляем application-name
        let appNameMeta = document.querySelector('meta[name="application-name"]');
        if (appNameMeta) {
            appNameMeta.setAttribute('content', appName);
        }

        // Обновляем иконки
        this.updateIcons(iconUrl);
    }

    updateIcons(iconUrl) {
        // Обновляем favicon
        let favicon = document.getElementById('favicon');
        if (favicon) {
            favicon.href = iconUrl;
        }

        // Обновляем apple-touch-icon
        const appleIcons = ['appleTouchIcon1', 'appleTouchIcon2', 'appleTouchIcon3', 'appleTouchIcon4'];
        appleIcons.forEach(id => {
            const icon = document.getElementById(id);
            if (icon) {
                icon.href = iconUrl;
            }
        });

        // Обновляем tile image
        let tileMeta = document.getElementById('tileImage');
        if (tileMeta) {
            tileMeta.setAttribute('content', iconUrl);
        }
    }

    initWebsocket() {
        const errorFunc = (event) => {
            console.log('WebSocket error:', event);
        };
        
        const closeFunc = () => {
            this.setState({ websocketStatus: 'disconnected' });
            this.destroyWebsocket();
            setTimeout(() => {
                this.initWebsocket();
            }, 5000);
        };
        
        const openFunc = () => {
            this.setState({ websocketStatus: 'connected' });
        };
        
        const messageFunc = (event) => {
            const fmInfo = JSON.parse(event.data);
            // Обновляем URL для обложки
            const coverUrl = getApiUrl(`/fm/info/cover`);
            const audioUrl = getApiUrl(`/fm`);
            
            this.setState({ 
                fmInfo: { 
                    ...fmInfo, 
                    cover: coverUrl,
                    url: audioUrl
                } 
            });
            
            // Обновляем фон и иконки
            const backgroundBlur = document.getElementById('backgroundBlur');
            backgroundBlur.style.backgroundImage = `url(${coverUrl})`;
        };

        this.setState({ websocketStatus: 'connecting' });
        this.socket = new WebSocket(getWebSocketUrl());
        this.socket.addEventListener("error", errorFunc);
        this.socket.addEventListener("close", closeFunc);
        this.socket.addEventListener("open", openFunc);
        this.socket.addEventListener("message", messageFunc);
        
        this.destroyWebsocket = () => {
            if (this.socket) {
                this.socket.removeEventListener("error", errorFunc);
                this.socket.removeEventListener("close", closeFunc);
                this.socket.removeEventListener("open", openFunc);
                this.socket.removeEventListener("message", messageFunc);
                this.socket.close();
            }
        };
    }

    toggleMute() {
        // Если статус 'stopped' - это первая загрузка, запускаем воспроизведение
        if (this.state.playerStatus === 'stopped') {
            this.unmute();
        } else if (this.state.isMuted) {
            this.unmute();
        } else {
            this.mute();
        }
    }

    mute() {
        // Очищаем таймер повторных попыток
        if (this.state.retryTimer) {
            clearTimeout(this.state.retryTimer);
        }
        
        this.audioPlayer.pause();
        this.setState({ 
            isMuted: true,
            playerStatus: 'stopped',
            retryCount: 0,
            retryTimer: null,
            isRetrying: false
        });
    }

    unmute() {
        if (!this.state.fmInfo) return;

        // Очищаем сообщение об ошибке и счетчик попыток
        this.setState({ 
            isMuted: false,
            errorMessage: '',
            retryCount: 0,
            isRetrying: false
        });
        
        // Пытаемся воспроизвести аудио
        this.play();
    }

    setPlayerStatus() {
        // Этот метод теперь переключает режим без звука
        this.toggleMute();
    }

    play() {
        if (!this.state.fmInfo) return;

        this.setState({ playerStatus: 'loading' });
        this.audioPlayer.src = '';
        const audioUrl = this.state.fmInfo.url;
        console.log('Попытка воспроизвести аудио:', audioUrl);
        this.audioPlayer.src = audioUrl;

        // Устанавливаем громкость
        this.audioPlayer.volume = this.state.isMuted ? 0 : 0.8;

        // Добавляем обработчики событий аудио
        this.setupAudioEventListeners();

        this.audioPlayer.play()
            .then(() => {
                this.setState({ 
                    playerStatus: 'playing',
                    retryCount: 0, // Сбрасываем счетчик при успешном воспроизведении
                    isRetrying: false,
                    hasPlayedOnce: true // Отмечаем, что воспроизведение было
                });
            })
            .catch(err => {
                console.error('Ошибка воспроизведения:', err);
                this.handlePlayError(err);
            });
    }

    setupAudioEventListeners() {
        // Удаляем предыдущие обработчики (если есть)
        this.audioPlayer.removeEventListener('error', this.handleAudioError);
        this.audioPlayer.removeEventListener('stalled', this.handleAudioStalled);
        this.audioPlayer.removeEventListener('waiting', this.handleAudioWaiting);
        this.audioPlayer.removeEventListener('canplay', this.handleAudioCanPlay);
        this.audioPlayer.removeEventListener('ended', this.handleAudioEnded);

        // Добавляем новые обработчики
        this.audioPlayer.addEventListener('error', this.handleAudioError.bind(this));
        this.audioPlayer.addEventListener('stalled', this.handleAudioStalled.bind(this));
        this.audioPlayer.addEventListener('waiting', this.handleAudioWaiting.bind(this));
        this.audioPlayer.addEventListener('canplay', this.handleAudioCanPlay.bind(this));
        this.audioPlayer.addEventListener('ended', this.handleAudioEnded.bind(this));
    }

    handleAudioError(event) {
        console.error('Ошибка воспроизведения аудио:', event);
        const error = this.audioPlayer.error;
        let errorMessage = 'Ошибка воспроизведения';
        
        if (error) {
            switch (error.code) {
                case error.MEDIA_ERR_ABORTED:
                    errorMessage = 'Воспроизведение прервано';
                    break;
                case error.MEDIA_ERR_NETWORK:
                    errorMessage = 'Ошибка сети';
                    break;
                case error.MEDIA_ERR_DECODE:
                    errorMessage = 'Ошибка декодирования';
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMessage = 'Формат аудио не поддерживается';
                    break;
                default:
                    errorMessage = 'Неизвестная ошибка воспроизведения';
            }
        }
        
        this.handlePlayError(new Error(errorMessage));
    }

    handleAudioStalled(event) {
        console.warn('Воспроизведение аудио застряло:', event);
        // Если застряло более 10 секунд, запускаем повторную попытку
        setTimeout(() => {
            if (this.state.playerStatus === 'loading' && !this.state.isRetrying) {
                this.handlePlayError(new Error('Таймаут воспроизведения'));
            }
        }, 10000);
    }

    handleAudioWaiting(event) {
        console.log('Буферизация аудио:', event);
        if (this.state.playerStatus === 'playing') {
            this.setState({ playerStatus: 'loading' });
        }
    }

    handleAudioCanPlay(event) {
        console.log('Аудио готово к воспроизведению:', event);
        if (this.state.playerStatus === 'loading' && !this.state.isMuted) {
            this.setState({ playerStatus: 'playing' });
        }
    }

    handleAudioEnded(event) {
        console.log('Воспроизведение аудио завершено:', event);
        // Поток аудио закончился, немедленно переподключаемся
        if (!this.state.isMuted) {
            this.handlePlayError(new Error('Поток аудио завершен'));
        }
    }

    handlePlayError(error) {
        console.error('Обработка ошибки воспроизведения:', error.message);
        
        // Если пользователь уже в режиме без звука, не делаем повторные попытки
        if (this.state.isMuted) {
            return;
        }
        
        const nextRetryCount = this.state.retryCount + 1;
        // Интервал повторных попыток: первые 3 раза каждую секунду, 4-10 раз каждые 5 секунд, затем каждые 30 секунд
        let retryDelay;
        if (nextRetryCount <= 3) {
            retryDelay = 1000; // Первые 3 раза - 1 секунда
        } else if (nextRetryCount <= 10) {
            retryDelay = 5000; // 4-10 раз - 5 секунд
        } else {
            retryDelay = 30000; // После 10 раз - 30 секунд
        }
        
        this.setState({ 
            playerStatus: 'loading',
            retryCount: nextRetryCount,
            isRetrying: true
        });
        
        console.log(`Воспроизведение не удалось, повторная попытка ${nextRetryCount} через ${retryDelay/1000} секунд...`);
        
        // Очищаем предыдущий таймер повторных попыток
        if (this.state.retryTimer) {
            clearTimeout(this.state.retryTimer);
        }
        
        const retryTimer = setTimeout(() => {
            if (!this.state.isMuted && this.state.fmInfo) {
                console.log(`Выполняем повторную попытку ${nextRetryCount}`);
                this.play();
            } else {
                this.setState({ isRetrying: false });
            }
        }, retryDelay);
        
        this.setState({ retryTimer });
    }

    stop() {
        // Очищаем таймер повторных попыток
        if (this.state.retryTimer) {
            clearTimeout(this.state.retryTimer);
        }
        
        this.audioPlayer.pause();
        this.setState({ 
            playerStatus: 'stopped',
            isMuted: true,
            retryCount: 0,
            retryTimer: null,
            isRetrying: false
        });
    }

    setTimerToUpdateRunningTime() {
        const timer = setTimeout(() => {
            if (this.state.serverInfo) {
                const newRunningTime = this.formatTime(Date.now() - this.state.serverInfo.time);
                // Обновляем только время напрямую через DOM, без полной перерисовки
                const runningTimeElement = document.querySelector('.running-time');
                if (runningTimeElement) {
                    runningTimeElement.textContent = newRunningTime;
                }
                // Обновляем состояние без вызова render
                this.state.runningTime = newRunningTime;
            }
            this.setTimerToUpdateRunningTime();
        }, 1000);
        this.state.timer = timer;
    }

    formatTime(milliseconds) {
        let totalSeconds = Math.floor(milliseconds / 1000);
        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds -= hours * 3600;
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = totalSeconds - minutes * 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    getStatusClass() {
        switch (this.state.websocketStatus) {
            case 'connected': return 'connected';
            case 'connecting': return 'connecting';
            case 'disconnected': return 'disconnected';
            default: return 'connecting';
        }
    }

    getStatusText() {
        switch (this.state.websocketStatus) {
            case 'connected': return 'Подключено';
            case 'connecting': return 'Поключение';
            case 'disconnected': return 'Нет соединения';
            default: return 'Поключение';
        }
    }

    getMuteButtonClass() {
        if (this.state.playerStatus === 'loading') {
            return 'loading-icon';
        }
        return this.state.isMuted ? 'muted-btn' : '';
    }

    getMuteButtonText() {
        if (this.state.playerStatus === 'loading') {
            if (this.state.isRetrying && this.state.retryCount > 0) {
                return `Повторная попытка (${this.state.retryCount})`;
            }
            return 'Loading';
        }
        // При первом запуске (stopped и никогда не играло) показываем "Play"
        if (this.state.playerStatus === 'stopped' && !this.state.hasPlayedOnce) {
            return 'Запустить';
        }
        // После начала воспроизведения показываем Mute/Unmute
        return this.state.isMuted ? 'Продолжить' : 'Заглушить';
    }

    render() {
        const playerCard = document.getElementById('playerCard');
        
        if (this.state.errorMessage) {
            playerCard.innerHTML = `
                <div class="error">
                    ${this.state.errorMessage}
                </div>
            `;
            return;
        }

        if (!this.state.serverInfo || !this.state.fmInfo) {
            playerCard.innerHTML = `
                <div class="loading">
                    Loading...
                </div>
            `;
            return;
        }

        const { serverInfo, fmInfo, runningTime, playerStatus } = this.state;

        playerCard.innerHTML = `
            <div class="header">
                <div class="app-name">lo-fi cat</div>
                <div class="header-right">
                    <div class="running-time">${runningTime}</div>
                    <div class="status-indicator">
                        <span class="connection-status ${this.getStatusClass()}"></span>
                        ${this.getStatusText()}
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
                    <button class="mute-btn ${this.getMuteButtonClass()}" data-action="toggle-mute" title="${this.state.playerStatus === 'stopped' && !this.state.hasPlayedOnce ? 'Нажмите чтобы начать воспроизведение' : (this.state.isMuted ? 'Нажмите чтобы включить звук' : 'Нажмите чтобы выключить звук')}">
                        ${this.getMuteButtonText()}
                    </button>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        if (this.eventListenersSetup) return; // Уже установлены
        
        const playerCard = document.getElementById('playerCard');
        if (!playerCard) return;
        
        // Делегирование событий для кнопки mute (устанавливается один раз)
        // Работает даже после innerHTML, так как события всплывают
        playerCard.addEventListener('click', (e) => {
            const button = e.target.closest('[data-action="toggle-mute"]');
            if (button) {
                e.preventDefault();
                this.toggleMute();
            }
        });
        
        this.eventListenersSetup = true;
    }
}

// Инициализация приложения
let streamRadio;
let deferredPrompt;

document.addEventListener('DOMContentLoaded', () => {
    streamRadio = new StreamRadio();
    
    // Регистрация Service Worker (если используется)
    // if ('serviceWorker' in navigator) {
    //     navigator.serviceWorker.register('/sw.js')
    //         .then(function(registration) {
    //             console.log('Service Worker зарегистрирован успешно:', registration.scope);
    //         })
    //         .catch(function(error) {
    //             console.log('Ошибка регистрации Service Worker:', error);
    //         });
    // }
});

// Подсказка об установке PWA
window.addEventListener('beforeinstallprompt', (e) => {
    // Предотвращаем автоматический показ подсказки об установке в Chrome 67 и более ранних версиях
    e.preventDefault();
    // Сохраняем событие для последующего вызова
    deferredPrompt = e;
    
    // Здесь можно показать пользовательскую кнопку установки
    console.log('PWA можно установить');
});

// Определяем, установлено ли PWA
window.addEventListener('appinstalled', (evt) => {
    console.log('PWA установлено');
});

// Обработка режима отображения PWA
window.addEventListener('DOMContentLoaded', () => {
    let displayMode = 'browser';
    if (navigator.standalone) {
        displayMode = 'standalone-ios';
    }
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        displayMode = 'standalone';
    }
    
    // Настраиваем стили в зависимости от режима отображения
    document.body.classList.add(`display-${displayMode}`);
});

// Очистка таймеров
window.addEventListener('beforeunload', () => {
    if (streamRadio && streamRadio.state.timer) {
        clearTimeout(streamRadio.state.timer);
    }
    if (streamRadio && streamRadio.state.retryTimer) {
        clearTimeout(streamRadio.state.retryTimer);
    }
    if (streamRadio && streamRadio.destroyWebsocket) {
        streamRadio.destroyWebsocket();
    }
});
