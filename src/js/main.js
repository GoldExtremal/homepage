import { initAppsMenu } from "./features/appsMenu.js";
import { renderGoogleServicesMenu } from "./features/googleServicesMenu.js";
import { initSearch } from "./features/search.js";
import { initPrivacyBanner } from "./features/privacy.js";
import { initPageSettings } from "./features/settings.js";
import { initShortcuts } from "./features/shortcuts.js";
import { initWidgets } from "./features/widgets.js";
import { LANGUAGE_CHANGE_EVENT } from "./i18n.js";

const search = initSearch({
  formEl: document.getElementById("searchForm"),
  inputEl: document.getElementById("searchInput"),
  suggestionsEl: document.getElementById("searchSuggestions"),
});

const appsMenuEl = document.getElementById("appsMenu");
const appsToggleEl = document.getElementById("appsToggle");
const settingsToggleEl = document.getElementById("settingsToggle");

const appsMenu = initAppsMenu({
  appsWrapEl: document.querySelector(".apps-wrap"),
  appsToggleEl,
  appsMenuEl,
  onFirstOpen() {
    renderGoogleServicesMenu(appsMenuEl);
  },
});

const settings = initPageSettings({
  settingsWrapEl: document.querySelector(".settings-wrap"),
  settingsMenuEl: document.getElementById("settingsMenu"),
  templatesMenuEl: document.getElementById("templatesMenu"),
  privacyMenuEl: document.getElementById("privacyMenu"),
  settingsToggleEl,
  shortcutsEl: document.getElementById("shortcutsList"),
  widgetsPanelEl: document.querySelector(".widgets-panel"),
  languageToggleEl: document.getElementById("toggleLanguage"),
  darkModeToggleEl: document.getElementById("toggleDarkMode"),
  shortcutsToggleEl: document.getElementById("toggleShortcuts"),
  widgetsToggleEl: document.getElementById("toggleWidgets"),
  clearSearchHistoryBtnEl: document.getElementById("clearSearchHistoryBtn"),
  setCustomBackgroundBtnEl: document.getElementById("setCustomBackgroundBtn"),
  chooseTemplateBtnEl: document.getElementById("chooseTemplateBtn"),
  resetBackgroundBtnEl: document.getElementById("resetBackgroundBtn"),
  resetShortcutsBtnEl: document.getElementById("resetShortcutsBtn"),
  clearWidgetsDataBtnEl: document.getElementById("clearWidgetsDataBtn"),
  resetUserDataBtnEl: document.getElementById("resetUserDataBtn"),
  openPrivacyMenuBtnEl: document.getElementById("openPrivacyMenuBtn"),
  privacyBackBtnEl: document.getElementById("privacyBackBtn"),
  privacySearchSuggestToggleEl: document.getElementById("togglePrivacySuggest"),
  privacyWeatherToggleEl: document.getElementById("togglePrivacyWeather"),
  privacyCurrencyToggleEl: document.getElementById("togglePrivacyCurrency"),
  privacyIpToggleEl: document.getElementById("togglePrivacyIp"),
  templatesBackBtnEl: document.getElementById("templatesBackBtn"),
  templatesGridEl: document.getElementById("templatesGrid"),
});

appsToggleEl?.addEventListener("click", () => {
  settings.closeSettingsMenu();
});

settingsToggleEl?.addEventListener("click", () => {
  appsMenu.closeAppsMenu();
});

initPrivacyBanner({
  bannerEl: document.getElementById("privacyBanner"),
  acceptBtnEl: document.getElementById("privacyAcceptBtn"),
});

window.addEventListener(LANGUAGE_CHANGE_EVENT, () => {
  if (appsMenuEl?.childElementCount) {
    renderGoogleServicesMenu(appsMenuEl);
  }
});

const shortcuts = initShortcuts({
  listEl: document.getElementById("shortcutsList"),
  templateEl: document.getElementById("shortcutTemplate"),
  dialogEl: document.getElementById("shortcutDialog"),
  formEl: document.getElementById("shortcutForm"),
  dialogTitleEl: document.getElementById("shortcutDialogTitle"),
  nameInputEl: document.getElementById("shortcutName"),
  urlInputEl: document.getElementById("shortcutUrl"),
  iconInputEl: document.getElementById("shortcutIcon"),
  cancelBtnEl: document.getElementById("cancelDialog"),
});

const widgetsInitParams = {
  widgetsPanelEl: document.querySelector(".widgets-panel"),
  weatherFormEl: document.getElementById("weatherForm"),
  weatherCityInputEl: document.getElementById("weatherCityInput"),
  weatherContentEl: document.getElementById("weatherContent"),
  currencyContentEl: document.getElementById("currencyContent"),
  ipContentEl: document.getElementById("ipContent"),
};

let widgetsStarted = false;
function startWidgetsLazy() {
  if (widgetsStarted) return;
  widgetsStarted = true;
  initWidgets(widgetsInitParams);
}

if ("requestIdleCallback" in window) {
  window.requestIdleCallback(() => startWidgetsLazy(), { timeout: 1600 });
} else {
  window.setTimeout(() => startWidgetsLazy(), 350);
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // no-op
    });
  });
}

window.addEventListener("load", () => {
  document.documentElement.classList.remove("deferred-css-loading");
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;

  if (!appsMenu.containsTarget(event.target)) {
    appsMenu.closeAppsMenu();
  }

  if (!settings.containsTarget(event.target)) {
    settings.closeSettingsMenu();
  }

  if (!search.containsTarget(event.target)) {
    search.hideSuggestions();
  }

  if (!shortcuts.containsTarget(event.target)) {
    shortcuts.closeAllMenus();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  shortcuts.closeAllMenus();
  appsMenu.closeAppsMenu();
  settings.closeSettingsMenu();
  search.hideSuggestions();
});

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.documentElement.classList.remove("booting");
  });
});
