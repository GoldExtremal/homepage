import { initAppsMenu } from "./features/appsMenu.js";
import { renderGoogleServicesMenu } from "./features/googleServicesMenu.js";
import { initSearch } from "./features/search.js";
import { initPageSettings } from "./features/settings.js";
import { initShortcuts } from "./features/shortcuts.js";
import { initWidgets } from "./features/widgets.js";

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
  settingsToggleEl,
  shortcutsEl: document.getElementById("shortcutsList"),
  widgetsPanelEl: document.querySelector(".widgets-panel"),
  shortcutsToggleEl: document.getElementById("toggleShortcuts"),
  widgetsToggleEl: document.getElementById("toggleWidgets"),
  clearSearchHistoryBtnEl: document.getElementById("clearSearchHistoryBtn"),
  resetShortcutsBtnEl: document.getElementById("resetShortcutsBtn"),
  clearWidgetsDataBtnEl: document.getElementById("clearWidgetsDataBtn"),
  resetUserDataBtnEl: document.getElementById("resetUserDataBtn"),
});

appsToggleEl?.addEventListener("click", () => {
  settings.closeSettingsMenu();
});

settingsToggleEl?.addEventListener("click", () => {
  appsMenu.closeAppsMenu();
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

initWidgets({
  widgetsPanelEl: document.querySelector(".widgets-panel"),
  weatherFormEl: document.getElementById("weatherForm"),
  weatherCityInputEl: document.getElementById("weatherCityInput"),
  weatherContentEl: document.getElementById("weatherContent"),
  currencyContentEl: document.getElementById("currencyContent"),
  ipContentEl: document.getElementById("ipContent"),
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
