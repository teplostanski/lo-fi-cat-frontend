import { getApiUrl } from '../config.js';

/**
 * Получает информацию о сервере и FM-радио
 * @returns {Promise<Object>} Объект с информацией о сервере и FM
 */
export async function fetchServerInfo() {
    const response = await fetch(getApiUrl('/info'));
    const result = await response.json();
    const { name, version, time, FMInfo } = result.data;
    const { cover, title, artist, sampleRate, bitRate, url } = FMInfo;
    
    // Обновляем URL для обложки и аудио, чтобы они указывали на бэкенд
    const coverUrl = getApiUrl(`/fm/info/cover`);
    const audioUrl = getApiUrl(`/fm`);
    
    return {
        serverInfo: { name, version, time },
        fmInfo: { 
            cover: coverUrl, 
            title, 
            artist, 
            sampleRate, 
            bitRate, 
            url: audioUrl 
        }
    };
}
