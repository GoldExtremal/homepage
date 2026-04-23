export const LANGUAGE_CHANGE_EVENT = "page-settings:language-change";
export const DEFAULT_LANGUAGE = "ru";

const DICTIONARY = {
  ru: {
    page: {
      title: "Новая вкладка",
    },
    settings: {
      title: "Настройки",
      templatesTitle: "Шаблоны",
      menuAria: "Настройки страницы",
      templatesMenuAria: "Шаблоны фона",
      language: "Язык",
      darkMode: "Тёмная тема",
      clearSearchHistory: "Очистить историю поиска",
      background: "Фон",
      setCustomBackground: "Установить свой фон",
      chooseTemplate: "Выбрать шаблон",
      resetBackground: "Сбросить фон",
      shortcuts: "Шорткаты",
      showShortcuts: "Показать ярлыки",
      resetShortcuts: "Сбросить ярлыки",
      widgets: "Виджеты",
      showWidgets: "Показать виджеты",
      clearWidgetsData: "Очистить данные виджетов",
      resetUserData: "Сбросить всё",
      applyTemplateAria: "Применить шаблон {template}",
      backToSettingsAria: "Назад к настройкам",
      languageAria: "Выбор языка",
      toggleSettingsAria: "Настройки страницы",
      toggleDarkModeAria: "Переключить тему",
      toggleShortcutsAria: "Показать ярлыки",
      toggleWidgetsAria: "Показать виджеты",
    },
    search: {
      placeholder: "Найдите в Google или введите URL-адрес",
      ariaLabel: "Поиск в Google или ввод URL",
      suggestionsAria: "Подсказки поиска",
    },
    widgets: {
      weather: "Погода",
      currency: "Курсы валют",
      ipRegion: "IP и регион",
      cityPlaceholder: "Город",
      loadingWeather: "Загружаю погоду...",
      cityNotFound: "Город не найден",
      weatherUnavailable: "Погода недоступна",
      feelsLike: "Ощущается как {value}°",
      statsAria: "Дополнительные показатели",
      wind: "Ветер {value} м/с",
      humidity: "Влажность {value}%",
      loadingCurrency: "Загружаю курсы...",
      currencyUnavailable: "Курсы временно недоступны",
      updatedAt: "Обновлено в {time}",
      loadingIp: "Загружаю IP...",
      unknownIp: "Неизвестный IP",
      ipUnavailable: "Данные IP недоступны",
      unknownCountry: "Неизвестная страна",
      locationUnavailable: "Локация недоступна",
    },
    dialog: {
      addShortcut: "Добавить шорткат",
      editShortcut: "Редактировать шорткат",
      name: "Название",
      url: "URL",
      iconOptional: "URL иконки (опционально)",
      cancel: "Отмена",
      done: "Готово",
      remove: "Удалить",
      edit: "Изменить",
    },
    shortcuts: {
      add: "Новый ярлык",
      addAria: "Новый ярлык",
      listAria: "Шорткаты",
      open: "Открыть шорткат",
      moreActions: "Больше действий",
      editPromptName: "Название шортката:",
      editPromptUrl: "URL шортката:",
      invalidUrl: "Введите корректный URL",
      invalidIconUrl: "Введите корректный URL иконки",
    },
    apps: {
      title: "Сервисы Google",
      account: "Аккаунт",
      drive: "Диск",
      youtube: "YouTube",
      calendar: "Календарь",
      meet: "Meet",
      translate: "Переводчик",
      sheets: "Таблицы",
      docs: "Документы",
      slides: "Презентации",
      moreFromGoogle: "Больше от Google",
      menuAria: "Сервисы Google",
      toggleAria: "Приложения Google",
    },
    misc: {
      chooseImageError: "Выберите файл изображения.",
      imageTooLarge: "Изображение слишком большое. Выберите файл до 5 МБ.",
      saveBackgroundError: "Не удалось сохранить фон. Попробуйте файл меньшего размера.",
    },
    confirm: {
      resetUserData: "Сбросить все пользовательские данные на этой странице? Будут удалены шорткаты, порядок виджетов, город погоды и история поиска.",
      clearSearchHistory: "Очистить локальную историю поиска?",
      resetBackground: "Сбросить фон к дефолтной тёмной теме?",
      resetShortcuts: "Сбросить ярлыки к значениям по умолчанию?",
      clearWidgetsData: "Очистить данные виджетов (город погоды и порядок виджетов)?",
    },
  },
  en: {
    page: {
      title: "New Tab",
    },
    settings: {
      title: "Settings",
      templatesTitle: "Templates",
      menuAria: "Page settings",
      templatesMenuAria: "Background templates",
      language: "Language",
      darkMode: "Dark mode",
      clearSearchHistory: "Clear search history",
      background: "Background",
      setCustomBackground: "Set custom background",
      chooseTemplate: "Choose a template",
      resetBackground: "Reset background",
      shortcuts: "Shortcuts",
      showShortcuts: "Show shortcuts",
      resetShortcuts: "Reset shortcuts",
      widgets: "Widgets",
      showWidgets: "Show widgets",
      clearWidgetsData: "Clear widgets data",
      resetUserData: "Reset all",
      applyTemplateAria: "Apply {template} template",
      backToSettingsAria: "Back to settings",
      languageAria: "Language selector",
      toggleSettingsAria: "Page settings",
      toggleDarkModeAria: "Toggle dark mode",
      toggleShortcutsAria: "Show shortcuts",
      toggleWidgetsAria: "Show widgets",
    },
    search: {
      placeholder: "Search Google or type a URL",
      ariaLabel: "Search Google or type a URL",
      suggestionsAria: "Search suggestions",
    },
    widgets: {
      weather: "Weather",
      currency: "Currency rates",
      ipRegion: "IP and region",
      cityPlaceholder: "City",
      loadingWeather: "Loading weather...",
      cityNotFound: "City not found",
      weatherUnavailable: "Weather is unavailable",
      feelsLike: "Feels like {value}°",
      statsAria: "Additional indicators",
      wind: "Wind {value} m/s",
      humidity: "Humidity {value}%",
      loadingCurrency: "Loading rates...",
      currencyUnavailable: "Rates are temporarily unavailable",
      updatedAt: "Updated at {time}",
      loadingIp: "Loading IP...",
      unknownIp: "Unknown IP",
      ipUnavailable: "IP data unavailable",
      unknownCountry: "Unknown country",
      locationUnavailable: "Location unavailable",
    },
    dialog: {
      addShortcut: "Add shortcut",
      editShortcut: "Edit shortcut",
      name: "Name",
      url: "URL",
      iconOptional: "Icon URL (optional)",
      cancel: "Cancel",
      done: "Done",
      remove: "Remove",
      edit: "Edit",
    },
    shortcuts: {
      add: "New shortcut",
      addAria: "New shortcut",
      listAria: "Shortcuts",
      open: "Open shortcut",
      moreActions: "More actions",
      editPromptName: "Shortcut name:",
      editPromptUrl: "Shortcut URL:",
      invalidUrl: "Enter a valid URL",
      invalidIconUrl: "Enter a valid icon URL",
    },
    apps: {
      title: "Google Services",
      account: "Account",
      drive: "Drive",
      youtube: "YouTube",
      calendar: "Calendar",
      meet: "Meet",
      translate: "Translate",
      sheets: "Sheets",
      docs: "Docs",
      slides: "Slides",
      moreFromGoogle: "More from Google",
      menuAria: "Google services",
      toggleAria: "Google apps",
    },
    misc: {
      chooseImageError: "Please select an image file.",
      imageTooLarge: "Image is too large. Please choose a file up to 5 MB.",
      saveBackgroundError: "Failed to save custom background. Please try a smaller image.",
    },
    confirm: {
      resetUserData: "Reset all user data on this page? This will remove shortcuts, widget order, weather city, and search history.",
      clearSearchHistory: "Clear local search history?",
      resetBackground: "Reset background to default dark theme?",
      resetShortcuts: "Reset shortcuts to default?",
      clearWidgetsData: "Clear widgets data (weather city and widget order)?",
    },
  },
};

let currentLanguage =
  typeof document !== "undefined" && document.documentElement?.lang === "en"
    ? "en"
    : DEFAULT_LANGUAGE;

export function resolveLanguage(value) {
  return value === "en" ? "en" : DEFAULT_LANGUAGE;
}

export function getCurrentLanguage() {
  return currentLanguage;
}

export function setCurrentLanguage(language, { emit = true } = {}) {
  currentLanguage = resolveLanguage(language);
  document.documentElement.lang = currentLanguage;
  if (emit) {
    window.dispatchEvent(
      new CustomEvent(LANGUAGE_CHANGE_EVENT, {
        detail: { language: currentLanguage },
      })
    );
  }
  return currentLanguage;
}

export function t(key, params = {}, language = currentLanguage) {
  const lang = resolveLanguage(language);
  const dict = DICTIONARY[lang] || DICTIONARY[DEFAULT_LANGUAGE];
  const value = key.split(".").reduce((acc, part) => (acc && typeof acc === "object" ? acc[part] : undefined), dict);
  const fallback = key.split(".").reduce((acc, part) => (acc && typeof acc === "object" ? acc[part] : undefined), DICTIONARY[DEFAULT_LANGUAGE]);
  const base = typeof value === "string" ? value : typeof fallback === "string" ? fallback : key;

  return base.replace(/\{(\w+)\}/g, (_, token) => {
    return Object.prototype.hasOwnProperty.call(params, token) ? String(params[token]) : `{${token}}`;
  });
}
