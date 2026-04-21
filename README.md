# Start Atlas

Кастомная стартовая страница в стиле Chrome New Tab с поиском, шорткатами, виджетами и меню Google-продуктов.

## Стек

- HTML + CSS + JavaScript (без сборщика)
- ES Modules в браузере
- Данные пользователя в `localStorage`

## Архитектура проекта

```text
.
├── assets/
│   └── icons/
│       └── chrome-icon.ico
├── src/
│   ├── js/
│   │   ├── config/
│   │   │   └── constants.js
│   │   ├── features/
│   │   │   ├── appsMenu.js
│   │   │   ├── search.js
│   │   │   ├── shortcuts.js
│   │   │   └── widgets.js
│   │   ├── utils/
│   │   │   └── url.js
│   │   └── main.js
│   └── styles/
│       └── main.css
├── index.html
└── README.md
```

### Зоны ответственности

- `src/js/main.js` — точка входа и связка модулей.
- `src/js/features/search.js` — поиск и подсказки Google Suggest.
- `src/js/features/shortcuts.js` — CRUD шорткатов, drag-and-drop, favicon-логика.
- `src/js/features/widgets.js` — виджеты погоды, валют и IP.
- `src/js/features/appsMenu.js` — меню продуктов Google в топбаре.
- `src/js/utils/url.js` — URL-утилиты, доменные эвристики.
- `src/js/config/constants.js` — константы проекта.

## Локальный запуск

Проект статический, сборка не нужна.

```bash
python3 -m http.server 8080
```

После запуска открой `http://localhost:8080`.

## Деплой на GitHub Pages

1. Создай репозиторий на GitHub.
2. Запушь ветку `main`.
3. Открой `Settings -> Pages`.
4. Выбери:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main` и папку `/ (root)`
5. Дождись публикации.

## Подключение как домашняя страница в Chrome

1. Открой `chrome://settings/onStartup`.
2. Выбери `Open a specific page or set of pages`.
3. Добавь URL GitHub Pages.

Дополнительно для кнопки Home:

1. `chrome://settings/appearance`
2. Включи `Show home button`
3. Укажи тот же URL.

## Ключи localStorage

- `chrome-clone-shortcuts-v1` — список шорткатов.
- `chrome-clone-weather-city-v1` — выбранный город в погоде.
