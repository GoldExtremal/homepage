import { initAppsMenu } from "./features/appsMenu.js";
import { initSearch } from "./features/search.js";
import { initShortcuts } from "./features/shortcuts.js";
import { initWidgets } from "./features/widgets.js";

const search = initSearch({
  formEl: document.getElementById("searchForm"),
  inputEl: document.getElementById("searchInput"),
  suggestionsEl: document.getElementById("searchSuggestions"),
});

const appsMenu = initAppsMenu({
  appsWrapEl: document.querySelector(".apps-wrap"),
  appsToggleEl: document.getElementById("appsToggle"),
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
  search.hideSuggestions();
});
