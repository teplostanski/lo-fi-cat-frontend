/**
 * Управление аудио-плеером
 */
export class AudioPlayer {
    constructor(audioElement, getState, setState, onError, onPlayPauseChange) {
        this.audioElement = audioElement;
        this.getState = getState;
        this.setState = setState;
        this.onError = onError;
        this.onPlayPauseChange = onPlayPauseChange; // Колбэк для синхронизации состояния
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Удаляем предыдущие обработчики (если есть)
        this.audioElement.removeEventListener('error', this.handleAudioError);
        this.audioElement.removeEventListener('stalled', this.handleAudioStalled);
        this.audioElement.removeEventListener('waiting', this.handleAudioWaiting);
        this.audioElement.removeEventListener('canplay', this.handleAudioCanPlay);
        this.audioElement.removeEventListener('ended', this.handleAudioEnded);
        this.audioElement.removeEventListener('play', this.handlePlay);
        this.audioElement.removeEventListener('pause', this.handlePause);

        // Добавляем новые обработчики
        this.audioElement.addEventListener('error', this.handleAudioError.bind(this));
        this.audioElement.addEventListener('stalled', this.handleAudioStalled.bind(this));
        this.audioElement.addEventListener('waiting', this.handleAudioWaiting.bind(this));
        this.audioElement.addEventListener('canplay', this.handleAudioCanPlay.bind(this));
        this.audioElement.addEventListener('ended', this.handleAudioEnded.bind(this));
        this.audioElement.addEventListener('play', this.handlePlay.bind(this));
        this.audioElement.addEventListener('pause', this.handlePause.bind(this));
    }

    handlePlay(event) {
        console.log('Событие play на audioElement:', event);
        // Синхронизируем состояние при воспроизведении через системные контролы
        if (this.onPlayPauseChange) {
            this.onPlayPauseChange(false); // false = не muted (воспроизводится)
        }
    }

    handlePause(event) {
        console.log('Событие pause на audioElement:', event);
        // Синхронизируем состояние при паузе через системные контролы
        if (this.onPlayPauseChange) {
            this.onPlayPauseChange(true); // true = muted (на паузе)
        }
    }

    handleAudioError(event) {
        console.error('Ошибка воспроизведения аудио:', event);
        const error = this.audioElement.error;
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
        
        this.onError(new Error(errorMessage));
    }

    handleAudioStalled(event) {
        console.warn('Воспроизведение аудио застряло:', event);
        // Если застряло более 10 секунд, запускаем повторную попытку
        setTimeout(() => {
            const state = this.getState();
            if (state.playerStatus === 'loading' && !state.isRetrying) {
                this.onError(new Error('Таймаут воспроизведения'));
            }
        }, 10000);
    }

    handleAudioWaiting(event) {
        console.log('Буферизация аудио:', event);
        const state = this.getState();
        if (state.playerStatus === 'playing') {
            this.setState({ playerStatus: 'loading' });
        }
    }

    handleAudioCanPlay(event) {
        console.log('Аудио готово к воспроизведению:', event);
        const state = this.getState();
        if (state.playerStatus === 'loading' && !state.isMuted) {
            this.setState({ playerStatus: 'playing' });
        }
    }

    handleAudioEnded(event) {
        console.log('Воспроизведение аудио завершено:', event);
        // Поток аудио закончился, немедленно переподключаемся
        const state = this.getState();
        if (!state.isMuted) {
            this.onError(new Error('Поток аудио завершен'));
        }
    }

    play(audioUrl, isMuted) {
        this.setState({ playerStatus: 'loading' });
        this.audioElement.src = '';
        console.log('Попытка воспроизвести аудио:', audioUrl);
        this.audioElement.src = audioUrl;

        // Устанавливаем громкость
        this.audioElement.volume = isMuted ? 0 : 0.8;

        return this.audioElement.play()
            .then(() => {
                this.setState({ 
                    playerStatus: 'playing',
                    retryCount: 0,
                    isRetrying: false,
                    hasPlayedOnce: true
                });
            })
            .catch(err => {
                console.error('Ошибка воспроизведения:', err);
                this.onError(err);
            });
    }

    pause() {
        this.audioElement.pause();
    }
}
