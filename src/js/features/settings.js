import {
  BACKGROUND_IMAGE_KEY,
  PAGE_SETTINGS_KEY,
  RESETTABLE_STORAGE_KEYS,
  SEARCH_HISTORY_KEY,
  SHORTCUTS_STORAGE_KEY,
  WEATHER_CITY_KEY,
  WIDGETS_ORDER_KEY,
} from "../config/constants.js";

const DEFAULT_SETTINGS = {
  theme: "dark",
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
  darkModeToggleEl,
  shortcutsToggleEl,
  widgetsToggleEl,
  clearSearchHistoryBtnEl,
  setCustomBackgroundBtnEl,
  resetBackgroundBtnEl,
  resetShortcutsBtnEl,
  clearWidgetsDataBtnEl,
  resetUserDataBtnEl,
}) {
  if (!settingsWrapEl || !settingsMenuEl || !settingsToggleEl || !shortcutsToggleEl || !widgetsToggleEl || !darkModeToggleEl) {
    return {
      closeSettingsMenu() {},
      containsTarget() {
        return false;
      },
    };
  }

  let settings = readSettings();
  applyStoredBackground();
  applySettings(settings);
  emitWidgetsVisibility(settings.showWidgets);
  syncControls(settings);

  settingsToggleEl.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = settingsMenuEl.classList.toggle("open");
    settingsWrapEl.classList.toggle("open", isOpen);
    settingsToggleEl.setAttribute("aria-expanded", String(isOpen));
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

  setCustomBackgroundBtnEl?.addEventListener("click", () => {
    backgroundFileInputEl.click();
  });

  resetBackgroundBtnEl?.addEventListener("click", () => {
    const isConfirmed = window.confirm("Reset custom background to default?");
    if (!isConfirmed) return;
    localStorage.removeItem(BACKGROUND_IMAGE_KEY);
    applyDefaultBackground();
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

  const backgroundFileInputEl = createBackgroundFileInput();
  backgroundFileInputEl.addEventListener("change", async () => {
    const file = backgroundFileInputEl.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      window.alert("Please select an image file.");
      backgroundFileInputEl.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.alert("Image is too large. Please choose a file up to 5 MB.");
      backgroundFileInputEl.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      localStorage.setItem(BACKGROUND_IMAGE_KEY, dataUrl);
      applyBackground(dataUrl);
    } catch {
      window.alert("Failed to save custom background. Please try a smaller image.");
    } finally {
      backgroundFileInputEl.value = "";
    }
  });

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
  }

  function readSettings() {
    try {
      const raw = localStorage.getItem(PAGE_SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      const theme = parsed?.theme === "light" ? "light" : "dark";
      return {
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
      if (!stored) return;
      applyBackground(stored);
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
