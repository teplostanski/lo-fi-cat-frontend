// Конфигурация API бэкенда
// URL бэкенда берется из переменных окружения (VITE_API_BASE_URL)
// Если переменная не задана, используется автоматическое определение по текущему хосту
const getApiBaseUrl = () => {
    // Приоритет: переменная окружения > автоматическое определение
    if (import.meta.env.VITE_API_BASE_URL) {
        return import.meta.env.VITE_API_BASE_URL;
    }
    
    // Автоматическое определение по текущему хосту (fallback)
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
    // Если задан явный WebSocket URL в переменных окружения, используем его
    if (import.meta.env.VITE_WS_URL) {
        return import.meta.env.VITE_WS_URL;
    }
    
    // Иначе генерируем из API_BASE_URL
    const protocol = API_BASE_URL.startsWith('https') ? 'wss://' : 'ws://';
    const url = new URL(API_BASE_URL);
    // Используем порт из URL, если он есть, иначе используем стандартные порты
    const port = url.port || (protocol === 'wss://' ? '443' : '80');
    return `${protocol}${url.hostname}:${port}/ws`;
}
