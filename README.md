# Start Atlas

Кастомная стартовая страница в стиле Chrome New Tab: поиск, шорткаты, виджеты и меню сервисов.

## Стек

- HTML + CSS + JavaScript (без сборки)
- ES Modules
- `localStorage` для пользовательских данных

## Структура проекта

```text
.
├── assets/
│   └── icons/
│       ├── chrome-icon.ico
│       ├── gmail-icon.svg
│       └── flags/
│           └── *.svg
├── src/
│   ├── js/
│   │   ├── config/
│   │   │   └── constants.js
│   │   ├── features/
│   │   │   ├── appsMenu.js
│   │   │   ├── googleServicesMenu.js
│   │   │   ├── search.js
│   │   │   ├── settings.js
│   │   │   ├── shortcuts.js
│   │   │   └── widgets.js
│   │   ├── utils/
│   │   │   ├── log.js
│   │   │   ├── reorder.js
│   │   │   └── url.js
│   │   └── main.js
│   └── styles/
│       ├── main.css
│       ├── base/
│       │   └── index.css
│       ├── components/
│       │   └── index.css
│       ├── layout/
│       │   └── index.css
│       └── widgets/
│           └── index.css
├── index.html
└── README.md
```

## Модули и ответственность

- `src/js/main.js`
  Инициализирует все фичи, связывает глобальные обработчики клика/Escape.
- `src/js/features/search.js`
  Поиск, подсказки Google Suggest (JSONP), локальная история запросов.
- `src/js/features/shortcuts.js`
  CRUD шорткатов, лимит на количество, drag-and-drop перестановка, определение favicon.
- `src/js/features/widgets.js`
  Погода, валюты, IP/регион, drag-and-drop перестановка виджетов.
  Данные виджетов загружаются лениво и только когда виджеты видимы.
- `src/js/features/settings.js`
  Меню настроек, управление видимостью блоков, действия очистки/сброса данных.
  Публикует событие `page-settings:widgets-visibility`.
- `src/js/features/appsMenu.js`
  Открытие/закрытие меню сервисов; ленивый рендер содержимого при первом открытии.
- `src/js/features/googleServicesMenu.js`
  Модель и рендер меню сервисов Google (заголовок, сетка сервисов, кнопка).

### Утилиты

- `src/js/utils/url.js` — нормализация URL и доменные эвристики.
- `src/js/utils/reorder.js` — общая логика анимации/перестановки для DnD.
- `src/js/utils/log.js` — единый мягкий лог ошибок в консоль.

### Стили

- `src/styles/main.css` — точка входа стилей (`@import` слоёв).
- `src/styles/base/index.css` — CSS-переменные, базовые reset и фон.
- `src/styles/layout/index.css` — topbar, меню, layout секций.
- `src/styles/components/index.css` — поиск, шорткаты, модальные элементы.
- `src/styles/widgets/index.css` — карточки и адаптив виджетов.

## localStorage

- `chrome-clone-shortcuts-v1` — пользовательские шорткаты.
- `chrome-clone-weather-city-v1` — последний выбранный город погоды.
- `chrome-clone-widgets-order-v1` — порядок виджетов.
- `chrome-clone-search-history-v1` — локальная история поиска.
- `chrome-clone-page-settings-v1` — настройки показа шорткатов/виджетов.

## Локальный запуск

```bash
python3 -m http.server 8080
```

Открой `http://localhost:8080`.

## Деплой на GitHub Pages

1. Запушить ветку `main` в репозиторий.
2. Открыть `Settings -> Pages`.
3. Выбрать:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`, папка `/ (root)`
4. Дождаться публикации.

## Настройка в Chrome

### Как стартовую страницу

1. `chrome://settings/onStartup`
2. `Open a specific page or set of pages`
3. Добавить URL страницы.

### Для кнопки Home

1. `chrome://settings/appearance`
2. Включить `Show home button`
3. Указать тот же URL.
