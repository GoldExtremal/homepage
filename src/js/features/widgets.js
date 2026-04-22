import { WEATHER_CITY_KEY, WIDGETS_ORDER_KEY } from "../config/constants.js";

const DRAG_PREVIEW_SCALE = 1.035;

export function initWidgets({
  widgetsPanelEl,
  weatherFormEl,
  weatherCityInputEl,
  weatherContentEl,
  currencyContentEl,
  ipContentEl,
}) {
  initWidgetsReorder();

  const savedCity = localStorage.getItem(WEATHER_CITY_KEY) || "Москва";
  let lastWeatherCity = savedCity;
  let lastWeatherQueryKey = normalizeCityQuery(savedCity);
  if (weatherCityInputEl) weatherCityInputEl.value = savedCity;
  if (weatherCityInputEl) weatherCityInputEl.placeholder = "Город";
  void loadWeather(savedCity);
  void loadCurrency();
  void loadIpInfo();

  if (weatherFormEl) {
    weatherFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      submitWeatherFromInput({ restoreOnEmpty: false });
    });
  }

  if (weatherCityInputEl) {
    weatherCityInputEl.addEventListener("blur", () => {
      submitWeatherFromInput({ restoreOnEmpty: true });
    });
  }

  async function loadWeather(city) {
    if (!weatherContentEl) return;
    weatherContentEl.textContent = "Загружаю погоду...";
    applyWeatherVisualState(weatherContentEl, null);

    try {
      const place = await geocodeCity(city);
      if (!place) {
        weatherContentEl.textContent = "Город не найден";
        if (weatherCityInputEl?.value.trim() === "") {
          weatherCityInputEl.value = localStorage.getItem(WEATHER_CITY_KEY) || lastWeatherCity || savedCity;
        }
        return;
      }

      const weatherResp = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,relative_humidity_2m&timezone=auto`
      );
      if (!weatherResp.ok) throw new Error("weather-failed");
      const weatherData = await weatherResp.json();
      const current = weatherData?.current;
      if (!current) throw new Error("weather-empty");

      const temp = Math.round(current.temperature_2m);
      const feelsLike = Math.round(current.apparent_temperature);
      const condition = weatherCodeToText(current.weather_code);
      const conditionGroup = weatherCodeToGroup(current.weather_code);
      const period = Number(current.is_day) === 1 ? "day" : "night";
      const icon = getWeatherIcon(conditionGroup, period);
      const wind = Math.round(current.wind_speed_10m || 0);
      const humidity = Math.round(current.relative_humidity_2m || 0);

      applyWeatherVisualState(weatherContentEl, { conditionGroup, period });
      if (weatherCityInputEl) {
        const cityAndCountry = [place.name, place.country].filter(Boolean).join(", ");
        weatherCityInputEl.value = cityAndCountry || place.name;
        lastWeatherQueryKey = normalizeCityQuery(weatherCityInputEl.value);
      }
      lastWeatherCity = place.name || city;

      weatherContentEl.innerHTML = `
        <div class="weather-hero">
          <div class="weather-hero-left">
            <div class="weather-temp">${temp}°</div>
            <span class="weather-icon" aria-hidden="true">${icon}</span>
          </div>
          <div class="weather-hero-right">
            <div class="weather-desc">${condition}</div>
            <div class="weather-feels">Ощущается как ${feelsLike}°</div>
          </div>
        </div>
        <div class="weather-stats" aria-label="Дополнительные показатели">
          <span class="weather-chip">Ветер ${wind} м/с</span>
          <span class="weather-chip">Влажность ${humidity}%</span>
        </div>
      `;
    } catch {
      weatherContentEl.textContent = "Погода недоступна";
      applyWeatherVisualState(weatherContentEl, null);
    }
  }

  async function loadCurrency() {
    if (!currencyContentEl) return;
    currencyContentEl.textContent = "Загружаю курсы...";

    try {
      const resp = await fetch("https://www.cbr-xml-daily.ru/daily_json.js");
      if (!resp.ok) throw new Error("currency-failed");
      const data = await resp.json();
      const usd = normalizeCbrRate(data?.Valute?.USD);
      const amd = normalizeCbrRate(data?.Valute?.AMD);
      const kzt = normalizeCbrRate(data?.Valute?.KZT);
      if (!usd || !amd || !kzt) throw new Error("currency-empty");

      const refreshedAt = new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      currencyContentEl.innerHTML = `
        <div class="currency-grid">
          ${renderCurrencyRow("$", usd)}
          ${renderCurrencyRow("֏", amd)}
          ${renderCurrencyRow("₸", kzt)}
        </div>
        <span class="sub">Обновлено в ${refreshedAt}</span>
      `;
    } catch {
      currencyContentEl.textContent = "Курсы временно недоступны";
    }
  }

  async function loadIpInfo() {
    if (!ipContentEl) return;
    ipContentEl.textContent = "Loading IP…";

    try {
      const data = await fetchIpData();
      const ip = data.ip || "Unknown";
      const countryCode = data.countryCode || "";
      const country = resolveCountryName(data.country, countryCode);
      const city = data.city || "";
      const flagMarkup = renderCountryFlagMarkup(countryCode);

      ipContentEl.innerHTML = `
        <div class="ip-content-premium">
          <div class="ip-value">${escapeHtml(ip)}</div>
          <div class="ip-meta">
            <span class="ip-flag">${flagMarkup}</span>
            <span>${escapeHtml(country)}</span>
          </div>
          <div class="ip-city">${city ? escapeHtml(city) : "Location unavailable"}</div>
        </div>
      `;
    } catch {
      ipContentEl.textContent = "Данные IP недоступны";
    }
  }

  function submitWeatherFromInput({ restoreOnEmpty }) {
    if (!weatherCityInputEl) return;
    const city = weatherCityInputEl.value.trim();
    const cityQueryKey = normalizeCityQuery(city);

    if (!city) {
      if (!restoreOnEmpty) return;
      const fallbackCity = localStorage.getItem(WEATHER_CITY_KEY) || lastWeatherCity || savedCity;
      if (!fallbackCity) return;
      const fallbackQueryKey = normalizeCityQuery(fallbackCity);
      if (fallbackQueryKey && fallbackQueryKey === lastWeatherQueryKey) return;
      lastWeatherQueryKey = fallbackQueryKey;
      void loadWeather(fallbackCity);
      return;
    }

    if (cityQueryKey && cityQueryKey === lastWeatherQueryKey) return;

    localStorage.setItem(WEATHER_CITY_KEY, city);
    lastWeatherCity = city;
    lastWeatherQueryKey = cityQueryKey;
    void loadWeather(city);
  }

  function initWidgetsReorder() {
    if (!widgetsPanelEl) return;

    applySavedWidgetsOrder();
    updateWidgetIndexes();

    let pressedCard = null;
    let draggedCard = null;
    let placeholderCard = null;
    let dragStarted = false;
    let hasReordered = false;
    let draggedInlineStyles = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let pressStartX = 0;
    let pressStartY = 0;
    let nextReorderAllowedAt = 0;
    const activeNeighborAnimations = new WeakMap();
    let reorderAnimating = false;
    let reorderUnlockTimer = null;
    let activePointerId = null;
    const DRAG_START_THRESHOLD = 4;
    const REORDER_STEP_MS = 120;
    const REORDER_ANIMATION_MS = 170;

    widgetsPanelEl.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (!(event.target instanceof Element)) return;

      const card = event.target.closest(".widget-card[data-widget-id]");
      if (!card) return;

      const onHead = Boolean(event.target.closest(".widget-head"));
      const onInteractive = Boolean(event.target.closest("input, button, a, select, textarea, label"));
      const rect = card.getBoundingClientRect();
      if (!onHead || onInteractive) return;

      pressedCard = card;
      dragStarted = false;
      hasReordered = false;
      nextReorderAllowedAt = 0;
      activePointerId = event.pointerId;
      pressStartX = event.clientX;
      pressStartY = event.clientY;

      dragOffsetX = event.clientX - rect.left;
      dragOffsetY = event.clientY - rect.top;

      event.preventDefault();
      document.body.classList.add("widgets-dragging");
      window.addEventListener("pointermove", handlePointerMove, { passive: false });
      window.addEventListener("pointerup", handlePointerEnd, { passive: false });
      window.addEventListener("pointercancel", handlePointerEnd, { passive: false });
    });

    function clearWidgetsDragState() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
      document.body.classList.remove("widgets-dragging");
      stopNeighborAnimations();
      finishFloatingDrag();
      pressedCard = null;
      draggedCard = null;
      placeholderCard = null;
      dragStarted = false;
      hasReordered = false;
      nextReorderAllowedAt = 0;
      reorderAnimating = false;
      if (reorderUnlockTimer) {
        clearTimeout(reorderUnlockTimer);
        reorderUnlockTimer = null;
      }
      activePointerId = null;
      widgetsPanelEl.classList.remove("drag-active");
      getWidgetCards().forEach((card) => card.classList.remove("dragging", "drop-target", "floating-drag"));
    }

    function handlePointerMove(event) {
      if (activePointerId === null || event.pointerId !== activePointerId || !pressedCard) return;
      event.preventDefault();

      if (!dragStarted) {
        const dx = event.clientX - pressStartX;
        const dy = event.clientY - pressStartY;
        if (Math.hypot(dx, dy) < DRAG_START_THRESHOLD) return;
        beginDrag(pressedCard, event.clientX, event.clientY);
      }

      moveFloatingCard(event.clientX, event.clientY);
      moveDuringDrag(event.clientX);
    }

    function handlePointerEnd(event) {
      if (activePointerId === null || event.pointerId !== activePointerId) return;
      const shouldPersist = dragStarted && hasReordered;
      clearWidgetsDragState();
      if (shouldPersist) persistWidgetsOrder();
    }

    function beginDrag(card, clientX, clientY) {
      draggedCard = card;
      dragStarted = true;
      widgetsPanelEl.classList.add("drag-active");
      startFloatingDrag(card, clientX, clientY);
    }

    function startFloatingDrag(card, clientX, clientY) {
      const rect = card.getBoundingClientRect();

      placeholderCard = document.createElement("article");
      placeholderCard.className = "widget-card widget-placeholder";
      placeholderCard.dataset.widgetId = card.dataset.widgetId || "";
      placeholderCard.dataset.index = card.dataset.index || "";
      placeholderCard.style.width = `${rect.width}px`;
      placeholderCard.style.height = `${rect.height}px`;

      card.insertAdjacentElement("afterend", placeholderCard);

      draggedInlineStyles = {
        position: card.style.position,
        left: card.style.left,
        top: card.style.top,
        width: card.style.width,
        height: card.style.height,
        margin: card.style.margin,
        zIndex: card.style.zIndex,
        pointerEvents: card.style.pointerEvents,
        transition: card.style.transition,
        transform: card.style.transform,
      };

      card.classList.add("floating-drag");
      card.style.position = "fixed";
      card.style.left = "0";
      card.style.top = "0";
      card.style.width = `${rect.width}px`;
      card.style.height = `${rect.height}px`;
      card.style.margin = "0";
      card.style.zIndex = "9999";
      card.style.pointerEvents = "none";
      card.style.transition = "none";

      moveFloatingCard(clientX || rect.left + dragOffsetX, clientY || rect.top + dragOffsetY);
    }

    function moveDuringDrag(pointerX) {
      if (!draggedCard || !placeholderCard) return;
      const now = performance.now();
      if (now < nextReorderAllowedAt) return;
      if (reorderAnimating) return;

      const fromIndex = Number(placeholderCard.dataset.index);
      if (Number.isNaN(fromIndex) || fromIndex < 0) return;

      const prevCard = getAdjacentWidgetCard(placeholderCard, -1);
      const nextCard = getAdjacentWidgetCard(placeholderCard, 1);
      let targetCard = null;
      let nextIndex = fromIndex;

      if (nextCard) {
        const rect = nextCard.getBoundingClientRect();
        if (pointerX > rect.left + rect.width * 0.6) {
          targetCard = nextCard;
          nextIndex = fromIndex + 1;
        }
      }

      if (!targetCard && prevCard) {
        const rect = prevCard.getBoundingClientRect();
        if (pointerX < rect.left + rect.width * 0.4) {
          targetCard = prevCard;
          nextIndex = fromIndex - 1;
        }
      }

      if (!targetCard) return;

      stopNeighborAnimations();
      const beforeRect = targetCard.getBoundingClientRect();
      movePlaceholderNode(placeholderCard, targetCard, fromIndex, nextIndex);
      placeholderCard.dataset.index = String(nextIndex);
      updateWidgetIndexes();
      animateNeighborShift(targetCard, beforeRect);
      hasReordered = true;
      nextReorderAllowedAt = now + REORDER_STEP_MS;
      reorderAnimating = true;
      if (reorderUnlockTimer) clearTimeout(reorderUnlockTimer);
      reorderUnlockTimer = setTimeout(() => {
        reorderAnimating = false;
        reorderUnlockTimer = null;
      }, REORDER_ANIMATION_MS);
    }

    function moveFloatingCard(clientX, clientY) {
      if (!draggedCard || !dragStarted) return;
      const x = Math.round((clientX || 0) - dragOffsetX);
      const y = Math.round((clientY || 0) - dragOffsetY);
      draggedCard.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${DRAG_PREVIEW_SCALE})`;
    }

    function movePlaceholderNode(placeholder, target, fromIndex, toIndex) {
      const parent = placeholder.parentNode;
      if (!parent || parent !== target.parentNode) return;
      if (fromIndex < toIndex) {
        parent.insertBefore(placeholder, target.nextSibling);
        return;
      }
      parent.insertBefore(placeholder, target);
    }

    function getAdjacentWidgetCard(node, direction) {
      let current = node;
      while (current) {
        current = direction > 0 ? current.nextElementSibling : current.previousElementSibling;
        if (!current) return null;
        if (!(current instanceof HTMLElement)) continue;
        if (!current.matches(".widget-card[data-widget-id]")) continue;
        if (current.classList.contains("widget-placeholder")) continue;
        if (current.classList.contains("floating-drag")) continue;
        return current;
      }
      return null;
    }

    function animateNeighborShift(node, beforeRect) {
      if (!(node instanceof HTMLElement) || !beforeRect) return;
      const afterRect = node.getBoundingClientRect();
      const dx = beforeRect.left - afterRect.left;
      const dy = beforeRect.top - afterRect.top;
      if (!dx && !dy) return;

      const previous = activeNeighborAnimations.get(node);
      if (previous) previous.cancel();

      const animation = node.animate(
        [
          { transform: `translate3d(${dx}px, ${dy}px, 0)` },
          { transform: "translate3d(0, 0, 0)" },
        ],
        {
          duration: REORDER_ANIMATION_MS,
          easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
        }
      );

      const cleanup = () => {
        if (activeNeighborAnimations.get(node) === animation) {
          activeNeighborAnimations.delete(node);
        }
      };
      animation.onfinish = cleanup;
      animation.oncancel = cleanup;
      activeNeighborAnimations.set(node, animation);
    }

    function stopNeighborAnimations() {
      getRealWidgetCards().forEach((card) => {
        const animation = activeNeighborAnimations.get(card);
        if (animation) animation.cancel();
      });
    }

    function finishFloatingDrag() {
      if (!draggedCard) {
        if (placeholderCard) {
          placeholderCard.remove();
          placeholderCard = null;
        }
        return;
      }

      if (placeholderCard?.parentNode) {
        placeholderCard.parentNode.insertBefore(draggedCard, placeholderCard);
        placeholderCard.remove();
      }
      placeholderCard = null;

      const saved = draggedInlineStyles || {};
      draggedCard.classList.remove("floating-drag");
      draggedCard.style.position = saved.position || "";
      draggedCard.style.left = saved.left || "";
      draggedCard.style.top = saved.top || "";
      draggedCard.style.width = saved.width || "";
      draggedCard.style.height = saved.height || "";
      draggedCard.style.margin = saved.margin || "";
      draggedCard.style.zIndex = saved.zIndex || "";
      draggedCard.style.pointerEvents = saved.pointerEvents || "";
      draggedCard.style.transition = saved.transition || "";
      draggedCard.style.transform = saved.transform || "";
      draggedInlineStyles = null;
      updateWidgetIndexes();
    }

  }

  function applySavedWidgetsOrder() {
    if (!widgetsPanelEl) return;
    const cards = getWidgetCards();
    if (!cards.length) return;

    const savedOrder = readSavedWidgetsOrder();
    if (!savedOrder.length) return;

    const byId = new Map(cards.map((card) => [card.dataset.widgetId, card]));
    const currentIds = cards.map((card) => card.dataset.widgetId).filter(Boolean);
    const orderedIds = [...savedOrder.filter((id) => byId.has(id)), ...currentIds.filter((id) => !savedOrder.includes(id))];

    orderedIds.forEach((id) => {
      const card = byId.get(id);
      if (card) widgetsPanelEl.appendChild(card);
    });
  }

  function readSavedWidgetsOrder() {
    try {
      const raw = localStorage.getItem(WIDGETS_ORDER_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((value) => typeof value === "string" && value.length);
    } catch {
      return [];
    }
  }

  function persistWidgetsOrder() {
    if (!widgetsPanelEl) return;
    const order = getWidgetCards()
      .map((card) => card.dataset.widgetId)
      .filter(Boolean);
    localStorage.setItem(WIDGETS_ORDER_KEY, JSON.stringify(order));
  }

  function updateWidgetIndexes() {
    getRealWidgetCards().forEach((card, index) => {
      card.dataset.index = String(index);
    });
  }

  function getWidgetCards() {
    if (!widgetsPanelEl) return [];
    return Array.from(widgetsPanelEl.querySelectorAll(".widget-card[data-widget-id]:not(.floating-drag)"));
  }

  function getRealWidgetCards() {
    if (!widgetsPanelEl) return [];
    return Array.from(widgetsPanelEl.querySelectorAll(".widget-card[data-widget-id]:not(.floating-drag):not(.widget-placeholder)"));
  }
}

function normalizeCityQuery(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function geocodeCity(city) {
  const openMeteoRu = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ru&format=json`;
  const openMeteoEn = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const nominatim = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(city)}`;

  const probes = [
    async () => {
      const data = await fetchJsonWithTimeout(openMeteoRu);
      const item = Array.isArray(data?.results) ? data.results[0] : null;
      if (!item) return null;
      return { latitude: item.latitude, longitude: item.longitude, name: item.name || city, country: item.country || "" };
    },
    async () => {
      const data = await fetchJsonWithTimeout(openMeteoEn);
      const item = Array.isArray(data?.results) ? data.results[0] : null;
      if (!item) return null;
      return { latitude: item.latitude, longitude: item.longitude, name: item.name || city, country: item.country || "" };
    },
    async () => {
      const data = await fetchJsonWithTimeout(nominatim);
      const item = Array.isArray(data) ? data[0] : null;
      if (!item) return null;
      const display = String(item.display_name || city);
      const [name, country = ""] = display.split(",").map((s) => s.trim());
      return {
        latitude: Number(item.lat),
        longitude: Number(item.lon),
        name: name || city,
        country,
      };
    },
  ];

  for (const probe of probes) {
    try {
      const result = await probe();
      if (!result) continue;
      if (typeof result.latitude === "number" && typeof result.longitude === "number" && Number.isFinite(result.latitude) && Number.isFinite(result.longitude)) {
        return result;
      }
    } catch {
      // continue
    }
  }

  return null;
}

function applyWeatherVisualState(weatherContentEl, state) {
  const card = weatherContentEl.closest(".weather-widget");
  if (!card) return;
  if (!state) {
    card.removeAttribute("data-period");
    card.removeAttribute("data-weather");
    return;
  }

  card.dataset.period = state.period;
  card.dataset.weather = state.conditionGroup;
}

async function fetchIpData() {
  const providers = [
    async () => {
      const data = await fetchJsonWithTimeout("https://ipapi.co/json/");
      return {
        ip: data?.ip || "",
        country: data?.country_name || data?.country || "",
        countryCode: String(data?.country_code || data?.country || "").toUpperCase(),
        city: data?.city || "",
      };
    },
    async () => {
      const data = await fetchJsonWithTimeout("https://ipwho.is/");
      if (data?.success === false) throw new Error("ipwho-failed");
      return {
        ip: data?.ip || "",
        country: data?.country || "",
        countryCode: String(data?.country_code || "").toUpperCase(),
        city: data?.city || "",
      };
    },
    async () => {
      const data = await fetchJsonWithTimeout("https://ipinfo.io/json");
      return {
        ip: data?.ip || "",
        country: "",
        countryCode: String(data?.country || "").toUpperCase(),
        city: data?.city || "",
      };
    },
    async () => {
      const data = await fetchJsonWithTimeout("https://api.ipify.org?format=json");
      return { ip: data?.ip || "", country: "", countryCode: "", city: "" };
    },
  ];

  for (const provider of providers) {
    try {
      const result = await provider();
      if (result?.ip) return result;
    } catch {
      // try next provider
    }
  }

  throw new Error("ip-all-providers-failed");
}

async function fetchJsonWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("http-failed");
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function weatherCodeToText(code) {
  const map = new Map([
    [0, "Ясно"],
    [1, "Преимущественно ясно"],
    [2, "Облачно с прояснениями"],
    [3, "Пасмурно"],
    [45, "Туман"],
    [48, "Туман"],
    [51, "Слабая морось"],
    [53, "Морось"],
    [55, "Сильная морось"],
    [56, "Ледяная морось"],
    [57, "Ледяная морось"],
    [61, "Небольшой дождь"],
    [63, "Дождь"],
    [65, "Сильный дождь"],
    [66, "Ледяной дождь"],
    [67, "Ледяной дождь"],
    [71, "Небольшой снег"],
    [73, "Снег"],
    [75, "Сильный снег"],
    [77, "Снежная крупа"],
    [80, "Ливни"],
    [81, "Ливни"],
    [82, "Сильные ливни"],
    [85, "Снегопад"],
    [86, "Сильный снегопад"],
    [95, "Гроза"],
    [96, "Гроза"],
    [99, "Гроза"],
  ]);
  return map.get(code) || "Неизвестно";
}

function weatherCodeToGroup(code) {
  if (code === 0) return "clear";
  if (code === 1 || code === 2 || code === 3) return "clouds";
  if (code === 45 || code === 48) return "fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "clouds";
}

function getWeatherIcon(group, period) {
  if (group === "storm") return "⛈";
  if (group === "snow") return "❄";
  if (group === "rain") return "🌧";
  if (group === "fog") return "🌫";
  if (group === "clear" && period === "night") return "🌙";
  if (group === "clear") return "☀";
  if (period === "night") return "☁";
  return "⛅";
}

function normalizeCbrRate(item) {
  if (!item || typeof item.Value !== "number" || typeof item.Nominal !== "number" || item.Nominal <= 0) return null;
  const value = item.Value / item.Nominal;
  const previous = typeof item.Previous === "number" ? item.Previous / item.Nominal : null;
  const delta = previous === null ? 0 : value - previous;
  return {
    code: item.CharCode || "",
    value,
    delta,
  };
}

function renderCurrencyRow(symbol, item) {
  const trend = item.delta > 0 ? "up" : item.delta < 0 ? "down" : "flat";
  const deltaSign = item.delta > 0 ? "+" : "";
  const deltaText = `${deltaSign}${item.delta.toFixed(2)} ₽`;

  return `
    <div class="currency-row ${trend}">
      <span class="currency-symbol">${symbol}</span>
      <div class="currency-meta">
        <span class="currency-code">${item.code}</span>
      </div>
      <div class="currency-right">
        <span class="currency-value">${item.value.toFixed(2)} ₽</span>
        <span class="currency-delta">${deltaText}</span>
      </div>
    </div>
  `;
}

function renderCountryFlagMarkup(code) {
  const alpha2 = String(code || "").trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(alpha2)) return '<span class="ip-flag-fallback" style="display:inline">🌐</span>';

  const src = `./assets/icons/flags/${alpha2}.svg`;
  return `
    <img
      class="ip-flag-img"
      src="${src}"
      alt=""
      loading="lazy"
      onerror="this.style.display='none';this.nextElementSibling.style.display='inline'"
    />
    <span class="ip-flag-fallback">🌐</span>
  `;
}

function resolveCountryName(country, countryCode) {
  const raw = String(country || "").trim();
  const code = String(countryCode || "").trim().toUpperCase();

  if (raw && raw.length > 2) return raw;
  const alpha2 = /^[A-Z]{2}$/.test(code) ? code : /^[A-Z]{2}$/.test(raw.toUpperCase()) ? raw.toUpperCase() : "";
  if (!alpha2) return raw || "Unknown country";

  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return names.of(alpha2) || raw || "Unknown country";
  } catch {
    return raw || alpha2;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
