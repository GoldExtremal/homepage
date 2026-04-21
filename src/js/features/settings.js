import { PAGE_SETTINGS_KEY, RESETTABLE_STORAGE_KEYS } from "../config/constants.js";

const DEFAULT_SETTINGS = {
  showShortcuts: true,
  showWidgets: true,
};

export function initPageSettings({
  settingsWrapEl,
  settingsMenuEl,
  settingsToggleEl,
  shortcutsEl,
  widgetsPanelEl,
  shortcutsToggleEl,
  widgetsToggleEl,
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
    persistSettings(settings);
  });

  resetUserDataBtnEl?.addEventListener("click", () => {
    const isConfirmed = window.confirm("Reset all user data on this page? This will remove shortcuts, widget order, weather city, and search history.");
    if (!isConfirmed) return;
    RESETTABLE_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
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
