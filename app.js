import { fetchServerInfo } from './api/info.js';
import { WebSocketConnection } from './websocket/connection.js';
import { AudioPlayer } from './audio/player.js';
import { Renderer } from './ui/renderer.js';
import { updatePWAInfo } from './pwa/manifest.js';
import { formatTime } from './utils/time.js';

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
        
        this.audioElement = document.getElementById('audioPlayer');
        this.renderer = new Renderer();
        this.websocket = null;
        this.audioPlayer = null;
        this.eventListenersSetup = false;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.renderer.render(this.state);
        this.setTimerToUpdateRunningTime();
        
        // Инициализируем аудио-плеер
        this.audioPlayer = new AudioPlayer(
            this.audioElement,
            () => this.state,
            (newState) => this.setState(newState),
            (error) => this.handlePlayError(error),
            (isMuted) => this.syncMuteState(isMuted) // Синхронизация состояния при изменении через системные контролы
        );
        
        // Инициализируем WebSocket
        this.websocket = new WebSocketConnection(
            (newState) => this.setState(newState),
            (fmInfo) => {
                this.setState({ fmInfo });
                this.renderer.updateBackground(fmInfo.cover);
            }
        );
        
        try {
            await this.initInfo();
            this.websocket.connect();
        } catch (err) {
            this.setState({
                errorMessage: err.message || err.toString()
            });
        }
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.renderer.render(this.state);
    }

    async initInfo() {
        const { serverInfo, fmInfo } = await fetchServerInfo();
        
        this.setState({
            serverInfo,
            fmInfo
        });

        // Обновляем информацию PWA
        updatePWAInfo(serverInfo.name, fmInfo.cover);

        // Обновляем фон
        this.renderer.updateBackground(fmInfo.cover);
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

    syncMuteState(isMuted) {
        // Синхронизация состояния при изменении через системные контролы (браузер, Android плеер)
        // Не обновляем, если состояние уже совпадает (чтобы избежать лишних обновлений)
        if (this.state.isMuted === isMuted) {
            return;
        }
        
        if (isMuted) {
            // Пауза через системные контролы
            if (this.state.retryTimer) {
                clearTimeout(this.state.retryTimer);
            }
            this.setState({
                isMuted: true,
                playerStatus: 'stopped',
                retryCount: 0,
                retryTimer: null,
                isRetrying: false
            });
        } else {
            // Воспроизведение через системные контролы
            this.setState({
                isMuted: false,
                playerStatus: this.audioElement.paused ? 'stopped' : 'playing'
            });
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
        this.audioPlayer.play(this.state.fmInfo.url, this.state.isMuted);
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
                const newRunningTime = formatTime(Date.now() - this.state.serverInfo.time);
                // Обновляем только время напрямую через DOM, без полной перерисовки
                this.renderer.updateRunningTime(newRunningTime);
                // Обновляем состояние без вызова render
                this.state.runningTime = newRunningTime;
            }
            this.setTimerToUpdateRunningTime();
        }, 1000);
        this.state.timer = timer;
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
    if (streamRadio && streamRadio.websocket) {
        streamRadio.websocket.destroy();
    }
});
