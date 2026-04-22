import {
  PAGE_SETTINGS_KEY,
  RESETTABLE_STORAGE_KEYS,
  SEARCH_HISTORY_KEY,
  SHORTCUTS_STORAGE_KEY,
  WEATHER_CITY_KEY,
  WIDGETS_ORDER_KEY,
} from "../config/constants.js";

const DEFAULT_SETTINGS = {
  showShortcuts: true,
  showWidgets: true,
};

const WIDGETS_VISIBILITY_EVENT = "page-settings:widgets-visibility";

export function initPageSettings({
  settingsWrapEl,
  settingsMenuEl,
  settingsToggleEl,
  shortcutsEl,
  widgetsPanelEl,
  shortcutsToggleEl,
  widgetsToggleEl,
  clearSearchHistoryBtnEl,
  resetShortcutsBtnEl,
  clearWidgetsDataBtnEl,
  resetUserDataBtnEl,
}) {
  if (!settingsWrapEl || !settingsMenuEl || !settingsToggleEl || !shortcutsToggleEl || !widgetsToggleEl) {
    return {
      closeSettingsMenu() {},
      containsTarget() {
        return false;
      },
    };
  }

  let settings = readSettings();
  applySettings(settings);
  emitWidgetsVisibility(settings.showWidgets);
  syncControls(settings);

  settingsToggleEl.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = settingsMenuEl.classList.toggle("open");
    settingsWrapEl.classList.toggle("open", isOpen);
    settingsToggleEl.setAttribute("aria-expanded", String(isOpen));
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

  resetUserDataBtnEl?.addEventListener("click", () => {
    const isConfirmed = window.confirm("Reset all user data on this page? This will remove shortcuts, widget order, weather city, and search history.");
    if (!isConfirmed) return;
    RESETTABLE_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  });

  clearSearchHistoryBtnEl?.addEventListener("click", () => {
    const isConfirmed = window.confirm("Clear local search history?");
    if (!isConfirmed) return;
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    window.location.reload();
  });

  resetShortcutsBtnEl?.addEventListener("click", () => {
    const isConfirmed = window.confirm("Reset shortcuts to default?");
    if (!isConfirmed) return;
    localStorage.removeItem(SHORTCUTS_STORAGE_KEY);
    window.location.reload();
  });

  clearWidgetsDataBtnEl?.addEventListener("click", () => {
    const isConfirmed = window.confirm("Clear widgets data (weather city and widget order)?");
    if (!isConfirmed) return;
    localStorage.removeItem(WEATHER_CITY_KEY);
    localStorage.removeItem(WIDGETS_ORDER_KEY);
    window.location.reload();
  });

  function applySettings(nextSettings) {
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
    shortcutsToggleEl.checked = Boolean(nextSettings.showShortcuts);
    widgetsToggleEl.checked = Boolean(nextSettings.showWidgets);
  }

  function readSettings() {
    try {
      const raw = localStorage.getItem(PAGE_SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return {
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

  function emitWidgetsVisibility(visible) {
    window.dispatchEvent(
      new CustomEvent(WIDGETS_VISIBILITY_EVENT, {
        detail: { visible: Boolean(visible) },
      })
    );
  }

  function closeSettingsMenu() {
    settingsWrapEl.classList.remove("open");
    settingsMenuEl.classList.remove("open");
    settingsToggleEl.setAttribute("aria-expanded", "false");
  }

  return {
    closeSettingsMenu,
    containsTarget(target) {
      return target instanceof Element && (Boolean(target.closest(".settings-wrap")) || Boolean(target.closest(".settings-menu")));
    },
  };
}

export { WIDGETS_VISIBILITY_EVENT };
