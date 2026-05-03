import {
  BACKGROUND_IMAGE_KEY,
  BACKGROUND_TEMPLATE_KEY,
  PAGE_SETTINGS_KEY,
  SEARCH_HISTORY_KEY,
  SHORTCUTS_STORAGE_KEY,
  WEATHER_CITY_KEY,
  WIDGETS_ORDER_KEY,
} from "../config/constants.js";
import {
  clearSiteLocalData,
  PRIVACY_SETTINGS_EVENT,
  readPrivacySettings,
  writePrivacySettings,
} from "./privacy.js";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_CHANGE_EVENT,
  setCurrentLanguage,
  t,
  resolveLanguage,
} from "../i18n.js";

const DEFAULT_SETTINGS = {
  language: DEFAULT_LANGUAGE,
  theme: "dark",
  showShortcuts: true,
  showWidgets: false,
};

const TEMPLATE_BACKGROUNDS = [
  { id: "anime-neon", fullSrc: "./assets/templates/full/anime-neon.webp", thumbSrc: "./assets/templates/thumb/anime-neon.webp", darkTheme: true },
  { id: "beach", fullSrc: "./assets/templates/full/beach.webp", thumbSrc: "./assets/templates/thumb/beach.webp", darkTheme: true },
  { id: "city-wallpaper", fullSrc: "./assets/templates/full/city-wallpaper.webp", thumbSrc: "./assets/templates/thumb/city-wallpaper.webp", darkTheme: false },
  { id: "field", fullSrc: "./assets/templates/full/field.webp", thumbSrc: "./assets/templates/thumb/field.webp", darkTheme: true },
  { id: "grass", fullSrc: "./assets/templates/full/grass.webp", thumbSrc: "./assets/templates/thumb/grass.webp", darkTheme: false },
  { id: "light", fullSrc: "./assets/templates/full/light.webp", thumbSrc: "./assets/templates/thumb/light.webp", darkTheme: false },
  { id: "miku", fullSrc: "./assets/templates/full/miku.webp", thumbSrc: "./assets/templates/thumb/miku.webp", darkTheme: true },
  { id: "mountains", fullSrc: "./assets/templates/full/mountains.webp", thumbSrc: "./assets/templates/thumb/mountains.webp", darkTheme: true },
  { id: "red-moon", fullSrc: "./assets/templates/full/red-moon.webp", thumbSrc: "./assets/templates/thumb/red-moon.webp", darkTheme: true },
  { id: "wood", fullSrc: "./assets/templates/full/wood.webp", thumbSrc: "./assets/templates/thumb/wood.webp", darkTheme: false },
];

const WIDGETS_VISIBILITY_EVENT = "page-settings:widgets-visibility";
const LIGHT_SHORTCUTS_TEMPLATE_IDS = new Set(["anime-neon"]);
const DARK_LEGAL_TEXT_TEMPLATE_IDS = new Set(["grass", "city-wallpaper"]);

export function initPageSettings({
  settingsWrapEl,
  settingsMenuEl,
  templatesMenuEl,
  privacyMenuEl,
  settingsToggleEl,
  shortcutsEl,
  widgetsPanelEl,
  languageToggleEl,
  darkModeToggleEl,
  shortcutsToggleEl,
  widgetsToggleEl,
  clearSearchHistoryBtnEl,
  setCustomBackgroundBtnEl,
  chooseTemplateBtnEl,
  resetBackgroundBtnEl,
  resetShortcutsBtnEl,
  clearWidgetsDataBtnEl,
  resetUserDataBtnEl,
  openPrivacyMenuBtnEl,
  privacyBackBtnEl,
  privacySearchSuggestToggleEl,
  privacyWeatherToggleEl,
  privacyCurrencyToggleEl,
  privacyIpToggleEl,
  templatesBackBtnEl,
  templatesGridEl,
}) {
  if (!settingsWrapEl || !settingsMenuEl || !templatesMenuEl || !privacyMenuEl || !settingsToggleEl || !shortcutsToggleEl || !widgetsToggleEl || !darkModeToggleEl) {
    return {
      closeSettingsMenu() {},
      containsTarget() {
        return false;
      },
    };
  }

  let settings = readSettings();
  let privacySettings = readPrivacySettings();
  let templateGridRendered = false;
  applyLanguage(settings.language, { emit: false });
  applyStoredBackground();
  applySettings(settings);
  emitWidgetsVisibility(settings.showWidgets);
  syncControls(settings);
  syncPrivacyControls(privacySettings);

  window.addEventListener(PRIVACY_SETTINGS_EVENT, (event) => {
    const next = event instanceof CustomEvent ? event.detail?.settings : null;
    if (!next || typeof next !== "object") return;
    privacySettings = {
      ...privacySettings,
      ...next,
    };
    syncPrivacyControls(privacySettings);
  });

  settingsToggleEl.addEventListener("click", (event) => {
    event.stopPropagation();
    if (templatesMenuEl.classList.contains("open") || privacyMenuEl.classList.contains("open")) {
      openSettingsMenu();
      return;
    }
    if (settingsMenuEl.classList.contains("open")) {
      closeSettingsMenu();
      return;
    }
    openSettingsMenu();
  });

  languageToggleEl?.addEventListener("change", () => {
    settings = {
      ...settings,
      language: languageToggleEl.checked ? "ru" : "en",
    };
    applyLanguage(settings.language);
    persistSettings(settings);
  });

  darkModeToggleEl.addEventListener("change", () => {
    settings = {
      ...settings,
      theme: darkModeToggleEl.checked ? "dark" : "light",
    };
    applySettings(settings);
    persistSettings(settings);
  });

  shortcutsToggleEl.addEventListener("change", () => {
    settings = {
      ...settings,
      showShortcuts: shortcutsToggleEl.checked,
    };
    applySettings(settings);
    persistSettings(settings);
  });

  widgetsToggleEl.addEventListener("change", () => {
    settings = {
      ...settings,
      showWidgets: widgetsToggleEl.checked,
    };
    applySettings(settings);
    emitWidgetsVisibility(settings.showWidgets);
    persistSettings(settings);
  });

  resetUserDataBtnEl?.addEventListener("click", async () => {
    const isConfirmed = window.confirm(t("confirm.resetUserData"));
    if (!isConfirmed) return;
    await clearSiteLocalData();
    window.location.reload();
  });

  privacySearchSuggestToggleEl?.addEventListener("change", () => {
    privacySettings = writePrivacySettings({
      ...privacySettings,
      searchSuggest: Boolean(privacySearchSuggestToggleEl.checked),
    });
  });

  privacyWeatherToggleEl?.addEventListener("change", () => {
    privacySettings = writePrivacySettings({
      ...privacySettings,
      weather: Boolean(privacyWeatherToggleEl.checked),
    });
  });

  privacyCurrencyToggleEl?.addEventListener("change", () => {
    privacySettings = writePrivacySettings({
      ...privacySettings,
      currency: Boolean(privacyCurrencyToggleEl.checked),
    });
  });

  privacyIpToggleEl?.addEventListener("change", () => {
    privacySettings = writePrivacySettings({
      ...privacySettings,
      ipWidget: Boolean(privacyIpToggleEl.checked),
    });
  });

  clearSearchHistoryBtnEl?.addEventListener("click", () => {
    const isConfirmed = window.confirm(t("confirm.clearSearchHistory"));
    if (!isConfirmed) return;
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    window.location.reload();
  });

  setCustomBackgroundBtnEl?.addEventListener("click", () => {
    backgroundFileInputEl.click();
  });

  chooseTemplateBtnEl?.addEventListener("click", () => {
    openTemplatesMenu();
  });

  openPrivacyMenuBtnEl?.addEventListener("click", () => {
    openPrivacyMenu();
  });

  templatesBackBtnEl?.addEventListener("click", () => {
    openSettingsMenu();
  });

  privacyBackBtnEl?.addEventListener("click", () => {
    openSettingsMenu();
  });

  templatesGridEl?.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest(".template-option") : null;
    if (!target) return;
    const templateId = target.getAttribute("data-template-id");
    if (!templateId) return;
    const template = TEMPLATE_BACKGROUNDS.find((item) => item.id === templateId);
    if (!template) return;
    const templateUrl = new URL(template.fullSrc, window.location.href).href;

    localStorage.setItem(BACKGROUND_IMAGE_KEY, templateUrl);
    localStorage.setItem(BACKGROUND_TEMPLATE_KEY, template.id);
    applyBackground(templateUrl);
    applyTemplateShortcutStyle(template.id);
    settings = {
      ...settings,
      theme: template.darkTheme ? "dark" : "light",
    };
    applySettings(settings);
    syncControls(settings);
    persistSettings(settings);
  });

  resetBackgroundBtnEl?.addEventListener("click", () => {
    const isConfirmed = window.confirm(t("confirm.resetBackground"));
    if (!isConfirmed) return;
    localStorage.removeItem(BACKGROUND_IMAGE_KEY);
    localStorage.removeItem(BACKGROUND_TEMPLATE_KEY);
    settings = {
      ...settings,
      theme: "dark",
    };
    applyDefaultBackground();
    applySettings(settings);
    syncControls(settings);
    persistSettings(settings);
  });

  resetShortcutsBtnEl?.addEventListener("click", () => {
    const isConfirmed = window.confirm(t("confirm.resetShortcuts"));
    if (!isConfirmed) return;
    localStorage.removeItem(SHORTCUTS_STORAGE_KEY);
    window.location.reload();
  });

  clearWidgetsDataBtnEl?.addEventListener("click", () => {
    const isConfirmed = window.confirm(t("confirm.clearWidgetsData"));
    if (!isConfirmed) return;
    localStorage.removeItem(WEATHER_CITY_KEY);
    localStorage.removeItem(WIDGETS_ORDER_KEY);
    window.location.reload();
  });

  const backgroundFileInputEl = createBackgroundFileInput();
  backgroundFileInputEl.addEventListener("change", async () => {
    const file = backgroundFileInputEl.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      window.alert(t("misc.chooseImageError"));
      backgroundFileInputEl.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.alert(t("misc.imageTooLarge"));
      backgroundFileInputEl.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      localStorage.setItem(BACKGROUND_IMAGE_KEY, dataUrl);
      localStorage.removeItem(BACKGROUND_TEMPLATE_KEY);
      applyBackground(dataUrl);
      applyTemplateShortcutStyle(null);
    } catch {
      window.alert(t("misc.saveBackgroundError"));
    } finally {
      backgroundFileInputEl.value = "";
    }
  });

  function applyLanguage(language, { emit = true } = {}) {
    const nextLanguage = setCurrentLanguage(language, { emit: false });
    applyStaticTranslations(nextLanguage);
    if (templateGridRendered) {
      renderTemplateGrid();
    }
    if (emit) {
      window.dispatchEvent(
        new CustomEvent(LANGUAGE_CHANGE_EVENT, {
          detail: { language: nextLanguage },
        })
      );
    }
  }

  function applySettings(nextSettings) {
    document.documentElement.classList.toggle("theme-light", nextSettings.theme === "light");
    document.documentElement.classList.toggle("pref-hide-shortcuts", !nextSettings.showShortcuts);
    document.documentElement.classList.toggle("pref-hide-widgets", !nextSettings.showWidgets);

    if (shortcutsEl) {
      shortcutsEl.classList.toggle("is-hidden", !nextSettings.showShortcuts);
    }
    if (widgetsPanelEl) {
      widgetsPanelEl.classList.toggle("is-hidden", !nextSettings.showWidgets);
    }
  }

  function syncControls(nextSettings) {
    darkModeToggleEl.checked = nextSettings.theme !== "light";
    shortcutsToggleEl.checked = Boolean(nextSettings.showShortcuts);
    widgetsToggleEl.checked = Boolean(nextSettings.showWidgets);
    if (languageToggleEl) {
      languageToggleEl.checked = resolveLanguage(nextSettings.language) === "ru";
    }
  }

  function syncPrivacyControls(nextPrivacySettings) {
    if (privacySearchSuggestToggleEl) privacySearchSuggestToggleEl.checked = Boolean(nextPrivacySettings.searchSuggest);
    if (privacyWeatherToggleEl) privacyWeatherToggleEl.checked = Boolean(nextPrivacySettings.weather);
    if (privacyCurrencyToggleEl) privacyCurrencyToggleEl.checked = Boolean(nextPrivacySettings.currency);
    if (privacyIpToggleEl) privacyIpToggleEl.checked = Boolean(nextPrivacySettings.ipWidget);
  }

  function readSettings() {
    try {
      const raw = localStorage.getItem(PAGE_SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      const language = resolveLanguage(parsed?.language);
      const theme = parsed?.theme === "light" ? "light" : "dark";
      return {
        language,
        theme,
        showShortcuts: typeof parsed?.showShortcuts === "boolean" ? parsed.showShortcuts : DEFAULT_SETTINGS.showShortcuts,
        showWidgets: typeof parsed?.showWidgets === "boolean" ? parsed.showWidgets : DEFAULT_SETTINGS.showWidgets,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function persistSettings(nextSettings) {
    localStorage.setItem(PAGE_SETTINGS_KEY, JSON.stringify(nextSettings));
  }

  function createBackgroundFileInput() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.hidden = true;
    input.tabIndex = -1;
    document.body.appendChild(input);
    return input;
  }

  function applyStoredBackground() {
    try {
      const stored = localStorage.getItem(BACKGROUND_IMAGE_KEY);
      const storedTemplateId = localStorage.getItem(BACKGROUND_TEMPLATE_KEY);
      if (!stored) {
        applyTemplateShortcutStyle(null);
        return;
      }
      applyBackground(stored);
      if (storedTemplateId) {
        applyTemplateShortcutStyle(storedTemplateId);
      } else {
        applyTemplateShortcutStyle(inferTemplateIdFromBackground(stored));
      }
    } catch {
      // no-op
    }
  }

  function applyBackground(dataUrl) {
    if (!dataUrl) return;
    document.documentElement.classList.add("custom-bg");
    document.documentElement.style.setProperty("--user-bg", `url("${dataUrl.replaceAll('"', '\\"')}")`);
  }

  function applyDefaultBackground() {
    document.documentElement.classList.remove("custom-bg");
    document.documentElement.style.removeProperty("--user-bg");
    document.documentElement.classList.remove("shortcuts-light-skin");
    document.documentElement.classList.remove("legal-dark-text");
  }

  function applyTemplateShortcutStyle(templateId) {
    const shouldUseLightShortcuts = Boolean(templateId && LIGHT_SHORTCUTS_TEMPLATE_IDS.has(templateId));
    document.documentElement.classList.toggle("shortcuts-light-skin", shouldUseLightShortcuts);
    const shouldUseDarkLegalText = Boolean(templateId && DARK_LEGAL_TEXT_TEMPLATE_IDS.has(templateId));
    document.documentElement.classList.toggle("legal-dark-text", shouldUseDarkLegalText);
  }

  function inferTemplateIdFromBackground(backgroundValue) {
    if (typeof backgroundValue !== "string") return null;
    const lower = backgroundValue.toLowerCase();
    const match = TEMPLATE_BACKGROUNDS.find((template) => lower.includes(template.id));
    return match?.id || null;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  function emitWidgetsVisibility(visible) {
    window.dispatchEvent(
      new CustomEvent(WIDGETS_VISIBILITY_EVENT, {
        detail: { visible: Boolean(visible) },
      })
    );
  }

  function renderTemplateGrid() {
    if (!templatesGridEl) return;
    const templateMarkup = TEMPLATE_BACKGROUNDS.map((template) => {
      return `
        <button class="template-option" type="button" data-template-id="${template.id}" aria-label="${t("settings.applyTemplateAria", { template: template.id })}">
          <img src="${template.thumbSrc}" alt="" loading="lazy" decoding="async" />
        </button>
      `;
    }).join("");
    templatesGridEl.innerHTML = templateMarkup;
    templateGridRendered = true;
  }

  function openSettingsMenu() {
    settingsMenuEl.classList.add("open");
    templatesMenuEl.classList.remove("open");
    privacyMenuEl.classList.remove("open");
    settingsWrapEl.classList.add("open");
    settingsToggleEl.setAttribute("aria-expanded", "true");
  }

  function openTemplatesMenu() {
    if (!templateGridRendered) {
      renderTemplateGrid();
    }
    settingsMenuEl.classList.remove("open");
    templatesMenuEl.classList.add("open");
    privacyMenuEl.classList.remove("open");
    settingsWrapEl.classList.add("open");
    settingsToggleEl.setAttribute("aria-expanded", "true");
  }

  function openPrivacyMenu() {
    settingsMenuEl.classList.remove("open");
    templatesMenuEl.classList.remove("open");
    privacyMenuEl.classList.add("open");
    settingsWrapEl.classList.add("open");
    settingsToggleEl.setAttribute("aria-expanded", "true");
  }

  function closeSettingsMenu() {
    settingsWrapEl.classList.remove("open");
    settingsMenuEl.classList.remove("open");
    templatesMenuEl.classList.remove("open");
    privacyMenuEl.classList.remove("open");
    settingsToggleEl.setAttribute("aria-expanded", "false");
  }

  function applyStaticTranslations(language) {
    document.title = t("page.title", {}, language);

    const elements = document.querySelectorAll("[data-i18n]");
    elements.forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (!key) return;
      node.textContent = t(key, {}, language);
    });

    const placeholders = document.querySelectorAll("[data-i18n-placeholder]");
    placeholders.forEach((node) => {
      const key = node.getAttribute("data-i18n-placeholder");
      if (!key || !(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement)) return;
      node.placeholder = t(key, {}, language);
    });

    const ariaLabels = document.querySelectorAll("[data-i18n-aria-label]");
    ariaLabels.forEach((node) => {
      const key = node.getAttribute("data-i18n-aria-label");
      if (!key) return;
      node.setAttribute("aria-label", t(key, {}, language));
    });
  }

  return {
    closeSettingsMenu,
    containsTarget(target) {
      return target instanceof Element && (Boolean(target.closest(".settings-wrap")) || Boolean(target.closest(".settings-menu")) || Boolean(target.closest(".templates-menu")) || Boolean(target.closest(".privacy-menu")));
    },
  };
}

export { WIDGETS_VISIBILITY_EVENT };
