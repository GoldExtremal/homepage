# [Домашняя страница Chrome](https://goldextremal.github.io/homepage/)

Кастомная стартовая страница в стиле Chrome New Tab: поиск, шорткаты, виджеты, меню сервисов Google, темы и шаблоны фона.

![Превью страницы](./assets/preview.png)

## Возможности

- Поиск с Google Suggest + локальная история запросов.
- Шорткаты: добавление, редактирование, удаление, drag-and-drop перестановка.
- Лимит шорткатов: до 5 карточек.
- Виджеты: погода, курсы валют, IP/регион.
- Перестановка виджетов drag-and-drop.
- Тёмная/светлая тема через `Dark mode`.
- Кастомный фон из файла.
- Меню `Choose a template` с готовыми шаблонами.
- Меню сервисов Google (кнопка из 9 точек).
- Очистка пользовательских данных из меню `Settings`.

## Настройка в Chrome

1. Откройте `chrome://settings/appearance` и включите `Show home button` (Показать кнопку «Главная»).
2. В поле для домашней страницы укажите:
   `https://goldextremal.github.io/homepage/`
3. Установите расширение New Tab Redirect:
   `https://chromewebstore.google.com/detail/new-tab-redirect/icpgjfneehieebagbmdbhnlpiopdcmna`
4. Если новая вкладка не переадресуется автоматически:
   - откройте настройки расширения,
   - вставьте `https://goldextremal.github.io/homepage/`,
   - нажмите `Save`.

<p align="center">
  <img src="./assets/extentions.png" alt="Настройка расширения New Tab Redirect" width="155" />
</p>

## Локальный запуск

1. Откройте терминал в корне проекта.
2. Запустите локальный сервер:

```bash
python3 -m http.server 8080
```

3. Откройте в браузере `http://localhost:8080`.
4. Для остановки сервера нажмите `Ctrl + C`.

Важно: не запускайте через `file://...` (часть API/ассетов работает некорректно без HTTP-сервера).

## Стек

- HTML + CSS + JavaScript (ES Modules, без фреймворков)
- `localStorage` для пользовательских данных
- Service Worker для кеша статики

## Структура проекта

```text
.
├── assets/
│   ├── preview.png
│   ├── extentions.png
│   ├── templates/
│   │   ├── full/
│   │   └── thumb/
│   └── icons/
│       ├── chrome-icon.ico
│       ├── gmail-icon.svg
│       └── flags/
├── src/
│   ├── js/
│   │   ├── config/
│   │   ├── features/
│   │   ├── utils/
│   │   └── main.js
│   └── styles/
│       ├── base/
│       ├── components/
│       ├── deferred.css
│       ├── layout/
│       ├── widgets/
│       └── main.css
├── sw.js
├── index.html
└── README.md
```

## Настройки и данные

Хранятся в `localStorage`:

- `chrome-clone-page-settings-v1`
- `chrome-clone-shortcuts-v1`
- `chrome-clone-search-history-v1`
- `chrome-clone-weather-city-v1`
- `chrome-clone-widgets-order-v1`
- `chrome-clone-background-image-v1`
- `chrome-clone-background-template-v1`
- кеш виджетов (`weather/currency/ip`)

Кнопка `Reset all user data` очищает пользовательские данные и перезагружает страницу.
