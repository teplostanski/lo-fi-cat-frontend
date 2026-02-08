import { getWebSocketUrl, getApiUrl } from '../config.js';

/**
 * Создает и управляет WebSocket соединением
 */
export class WebSocketConnection {
    constructor(onStateChange, onFmInfoUpdate) {
        this.onStateChange = onStateChange;
        this.onFmInfoUpdate = onFmInfoUpdate;
        this.socket = null;
        this.destroyWebsocket = () => {};
    }

    connect() {
        const errorFunc = (event) => {
            console.log('WebSocket error:', event);
        };
        
        const closeFunc = () => {
            this.onStateChange({ websocketStatus: 'disconnected' });
            this.destroyWebsocket();
            setTimeout(() => {
                this.connect();
            }, 5000);
        };
        
        const openFunc = () => {
            this.onStateChange({ websocketStatus: 'connected' });
        };
        
        const messageFunc = (event) => {
            const fmInfo = JSON.parse(event.data);
            // Обновляем URL для обложки
            const coverUrl = getApiUrl(`/fm/info/cover`);
            const audioUrl = getApiUrl(`/fm`);
            
            const updatedFmInfo = { 
                ...fmInfo, 
                cover: coverUrl,
                url: audioUrl
            };
            
            this.onFmInfoUpdate(updatedFmInfo);
        };

        this.onStateChange({ websocketStatus: 'connecting' });
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

    destroy() {
        this.destroyWebsocket();
    }
}
