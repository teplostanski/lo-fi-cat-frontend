/**
 * Управление PWA манифестом и мета-тегами
 */

/**
 * Обновляет информацию PWA (заголовок, иконки)
 * @param {string} appName - Название приложения
 * @param {string} iconUrl - URL иконки
 */
export function updatePWAInfo(appName, iconUrl) {
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
    updateIcons(iconUrl);
}

/**
 * Обновляет иконки приложения
 * @param {string} iconUrl - URL иконки
 */
function updateIcons(iconUrl) {
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
