// Конфигурация API бэкенда
// URL бэкенда - автоматически определяется по текущему хосту
const getApiBaseUrl = () => {
    // Автоматическое определение по текущему хосту
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (hostname === 'api-lofi.teplostanski.me' || hostname.includes('teplostanski.me')) {
        return `${protocol}//api-lofi.teplostanski.me`;
    }
    
    // Для локальной разработки
    return 'http://localhost:8090';
};

const API_BASE_URL = getApiBaseUrl();

// Функция для получения полного URL API эндпоинта
export function getApiUrl(endpoint) {
    // Убираем ведущий слэш если есть
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${API_BASE_URL}/${cleanEndpoint}`;
}

// Функция для получения WebSocket URL
export function getWebSocketUrl() {
    const protocol = API_BASE_URL.startsWith('https') ? 'wss://' : 'ws://';
    const url = new URL(API_BASE_URL);
    // Используем порт из URL, если он есть, иначе используем стандартные порты
    const port = url.port || (protocol === 'wss://' ? '443' : '80');
    return `${protocol}${url.hostname}:${port}/ws`;
}
