import {
  CURRENCY_CACHE_KEY,
  IP_CACHE_KEY,
  WEATHER_CACHE_KEY,
  WEATHER_CITY_KEY,
  WIDGETS_ORDER_KEY,
} from "../config/constants.js";
import { getCurrentLanguage, LANGUAGE_CHANGE_EVENT, t } from "../i18n.js";
import { WIDGETS_VISIBILITY_EVENT } from "./settings.js";
import {
  animateNeighborShift,
  getAdjacentByDirection,
  movePlaceholderNode,
  stopNeighborAnimations,
} from "../utils/reorder.js";
import { reportError } from "../utils/log.js";

const DRAG_PREVIEW_SCALE = 1.035;
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
const CURRENCY_CACHE_TTL_MS = 15 * 60 * 1000;
const IP_CACHE_TTL_MS = 15 * 60 * 1000;

export function initWidgets({
  widgetsPanelEl,
  weatherFormEl,
  weatherCityInputEl,
  weatherContentEl,
  currencyContentEl,
  ipContentEl,
}) {
  initWidgetsReorder();

  const savedCityRaw = localStorage.getItem(WEATHER_CITY_KEY) || "Москва";
  const savedCity = sanitizeWeatherCityQuery(savedCityRaw) || "Москва";
  let lastWeatherCity = savedCity;
  let lastWeatherQueryKey = normalizeCityQuery(savedCity);
  let lastWeatherPayload = null;
  let lastCurrencyPayload = null;
  let lastIpPayload = null;
  const localizedCityCache = new Map();
  let widgetsDataLoaded = false;
  if (weatherCityInputEl) weatherCityInputEl.value = savedCity;
  if (weatherCityInputEl) weatherCityInputEl.placeholder = t("widgets.cityPlaceholder");
  if (isWidgetsVisible()) {
    loadWidgetsData();
  }

  window.addEventListener(WIDGETS_VISIBILITY_EVENT, (event) => {
    const isVisible = Boolean(event?.detail?.visible);
    if (isVisible) {
      loadWidgetsData();
    }
  });

  window.addEventListener(LANGUAGE_CHANGE_EVENT, () => {
    if (weatherCityInputEl) weatherCityInputEl.placeholder = t("widgets.cityPlaceholder");
    if (lastWeatherPayload) renderWeatherPayload(lastWeatherPayload, lastWeatherCity);
    void refreshWeatherLocationLabel();
    if (lastCurrencyPayload) renderCurrencyPayload(lastCurrencyPayload);
    if (lastIpPayload) renderIpPayload(lastIpPayload);

    if (!isWidgetsVisible()) {
      return;
    }

    if (!widgetsDataLoaded) {
      loadWidgetsData();
      return;
    }

    if (widgetsDataLoaded) {
      void loadCurrency();
      void loadIpInfo({ force: true });
    }
  });

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

  async function loadWeather(city, { force = false } = {}) {
    if (!weatherContentEl) return;
    const normalizedCity = sanitizeWeatherCityQuery(city) || city;
    const cityKey = normalizeCityQuery(normalizedCity);
    if (!force) {
      const cached = readWeatherCacheEntry(cityKey, WEATHER_CACHE_TTL_MS);
      if (cached) {
        renderWeatherPayload(cached, normalizedCity);
        return;
      }
    }

    weatherContentEl.textContent = t("widgets.loadingWeather");
    applyWeatherVisualState(weatherContentEl, null);

    try {
      const place = await geocodeCity(normalizedCity);
      if (!place) {
        weatherContentEl.textContent = t("widgets.cityNotFound");
        if (weatherCityInputEl?.value.trim() === "") {
          weatherCityInputEl.value = sanitizeWeatherCityQuery(localStorage.getItem(WEATHER_CITY_KEY) || "") || lastWeatherCity || savedCity;
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
      const weatherCode = Number(current.weather_code);
      const conditionGroup = weatherCodeToGroup(current.weather_code);
      const period = Number(current.is_day) === 1 ? "day" : "night";
      const icon = getWeatherIcon(conditionGroup, period);
      const wind = Math.round(current.wind_speed_10m || 0);
      const humidity = Math.round(current.relative_humidity_2m || 0);

      const payload = {
        placeName: place.name || city,
        placeCountry: place.country || "",
        countryCode: String(place.countryCode || "").toUpperCase(),
        latitude: Number(place.latitude),
        longitude: Number(place.longitude),
        temp,
        feelsLike,
        weatherCode,
        conditionGroup,
        period,
        icon,
        wind,
        humidity,
      };
      renderWeatherPayload(payload, normalizedCity);
      void refreshWeatherLocationLabel();
      writeWeatherCacheEntry(cityKey, payload);
    } catch (error) {
      reportError("Weather widget request failed", error);
      weatherContentEl.textContent = t("widgets.weatherUnavailable");
      applyWeatherVisualState(weatherContentEl, null);
    }
  }

  function renderWeatherPayload(payload, fallbackCity) {
    if (!weatherContentEl || !payload) return;
    lastWeatherPayload = payload;
    const weatherCode = Number(payload.weatherCode);
    const condition = Number.isFinite(weatherCode)
      ? weatherCodeToText(weatherCode, getCurrentLanguage())
      : weatherCodeToText(0, getCurrentLanguage());

    applyWeatherVisualState(weatherContentEl, {
      conditionGroup: payload.conditionGroup,
      period: payload.period,
    });

    if (weatherCityInputEl) {
      const localizedCountry = resolveLocalizedCountryName(payload.countryCode || "", payload.placeCountry || "");
      const cityAndCountry = [payload.placeName, localizedCountry].filter(Boolean).join(", ");
      weatherCityInputEl.value = cityAndCountry || payload.placeName || fallbackCity;
      weatherCityInputEl.dataset.queryCity = fallbackCity || payload.placeName || "";
      weatherCityInputEl.dataset.displayCity = cityAndCountry || payload.placeName || "";
      lastWeatherQueryKey = normalizeCityQuery(fallbackCity || payload.placeName || "");
    }
    lastWeatherCity = fallbackCity || payload.placeName || lastWeatherCity;

    weatherContentEl.innerHTML = `
      <div class="weather-hero">
        <div class="weather-hero-left">
          <div class="weather-temp">${payload.temp}°</div>
          <span class="weather-icon" aria-hidden="true">${payload.icon}</span>
        </div>
        <div class="weather-hero-right">
          <div class="weather-desc">${condition}</div>
          <div class="weather-feels">${t("widgets.feelsLike", { value: payload.feelsLike })}</div>
        </div>
      </div>
      <div class="weather-stats" aria-label="${t("widgets.statsAria")}">
        <span class="weather-chip">${t("widgets.wind", { value: payload.wind })}</span>
        <span class="weather-chip">${t("widgets.humidity", { value: payload.humidity })}</span>
      </div>
    `;
  }

  async function loadCurrency() {
    if (!currencyContentEl) return;
    const cached = readCachedValue(CURRENCY_CACHE_KEY, CURRENCY_CACHE_TTL_MS);
    if (cached) {
      renderCurrencyPayload(cached);
      return;
    }
    currencyContentEl.textContent = t("widgets.loadingCurrency");

    try {
      const resp = await fetch("https://www.cbr-xml-daily.ru/daily_json.js");
      if (!resp.ok) throw new Error("currency-failed");
      const data = await resp.json();
      const usd = normalizeCbrRate(data?.Valute?.USD);
      const amd = normalizeCbrRate(data?.Valute?.AMD);
      const kzt = normalizeCbrRate(data?.Valute?.KZT);
      if (!usd || !amd || !kzt) throw new Error("currency-empty");

      const payload = {
        refreshedAt: Date.now(),
        usd,
        amd,
        kzt,
      };
      renderCurrencyPayload(payload);
      writeCachedValue(CURRENCY_CACHE_KEY, payload);
    } catch (error) {
      reportError("Currency widget request failed", error);
      currencyContentEl.textContent = t("widgets.currencyUnavailable");
    }
  }

  function renderCurrencyPayload(payload) {
    if (!currencyContentEl || !payload) return;
    lastCurrencyPayload = payload;
    const refreshedAt = formatTime24(payload.refreshedAt);
    currencyContentEl.innerHTML = `
      <div class="currency-grid">
        ${renderCurrencyRow("$", payload.usd)}
        ${renderCurrencyRow("֏", payload.amd)}
        ${renderCurrencyRow("₸", payload.kzt)}
      </div>
      <span class="sub">${t("widgets.updatedAt", { time: refreshedAt })}</span>
    `;
  }

  async function loadIpInfo({ force = false } = {}) {
    if (!ipContentEl) return;
    ipContentEl.textContent = t("widgets.loadingIp");

    try {
      const data = await fetchIpData();
      const localizedCity = await localizeCityName({
        city: data.city || "",
        countryCode: data.countryCode || "",
        latitude: data.latitude,
        longitude: data.longitude,
      });
      const payload = {
        ip: data.ip || t("widgets.unknownIp"),
        rawCountry: data.country || "",
        countryCode: data.countryCode || "",
        country: resolveCountryName(data.country, data.countryCode || ""),
        rawCity: data.city || "",
        city: localizedCity || data.city || "",
        latitude: data.latitude,
        longitude: data.longitude,
      };
      renderIpPayload(payload);
      writeCachedValue(IP_CACHE_KEY, payload);
    } catch (error) {
      reportError("IP widget request failed", error);
      const cached = readCachedValue(IP_CACHE_KEY, IP_CACHE_TTL_MS);
      if (cached) {
        const localizedCachedCity = await localizeCityName({
          city: cached.rawCity || cached.city || "",
          countryCode: cached.countryCode || "",
          latitude: cached.latitude,
          longitude: cached.longitude,
        });
        renderIpPayload({
          ...cached,
          country: resolveCountryName(cached.rawCountry || cached.country || "", cached.countryCode || ""),
          city: localizedCachedCity || cached.city || "",
        });
        return;
      }
      ipContentEl.textContent = t("widgets.ipUnavailable");
    }
  }

  function renderIpPayload(payload) {
    if (!ipContentEl || !payload) return;
    lastIpPayload = payload;
    const flagMarkup = renderCountryFlagMarkup(payload.countryCode);
    ipContentEl.innerHTML = `
      <div class="ip-content-premium">
        <div class="ip-value">${escapeHtml(payload.ip || t("widgets.unknownIp"))}</div>
        <div class="ip-meta">
          <span class="ip-flag">${flagMarkup}</span>
          <span>${escapeHtml(payload.country || t("widgets.unknownCountry"))}</span>
        </div>
        <div class="ip-city">${payload.city ? escapeHtml(payload.city) : t("widgets.locationUnavailable")}</div>
      </div>
    `;
  }

  function submitWeatherFromInput({ restoreOnEmpty }) {
    if (!weatherCityInputEl) return;
    const typedCity = weatherCityInputEl.value.trim();
    const displayCity = String(weatherCityInputEl.dataset.displayCity || "").trim();
    const queryCity = String(weatherCityInputEl.dataset.queryCity || "").trim();
    const city =
      queryCity && normalizeCityQuery(typedCity) === normalizeCityQuery(displayCity || queryCity)
        ? queryCity
        : typedCity;
    const cityQueryKey = normalizeCityQuery(city);

    if (!city) {
      if (!restoreOnEmpty) return;
      const fallbackCity = localStorage.getItem(WEATHER_CITY_KEY) || lastWeatherCity || savedCity;
      if (!fallbackCity) return;
      const fallbackQuery = sanitizeWeatherCityQuery(fallbackCity) || fallbackCity;
      const fallbackQueryKey = normalizeCityQuery(fallbackQuery);
      if (fallbackQueryKey && fallbackQueryKey === lastWeatherQueryKey) return;
      lastWeatherQueryKey = fallbackQueryKey;
      void loadWeather(fallbackQuery);
      return;
    }

    if (cityQueryKey && cityQueryKey === lastWeatherQueryKey) return;

    const canonicalCity = sanitizeWeatherCityQuery(city) || city;
    localStorage.setItem(WEATHER_CITY_KEY, canonicalCity);
    lastWeatherCity = canonicalCity;
    lastWeatherQueryKey = normalizeCityQuery(canonicalCity);
    void loadWeather(canonicalCity);
  }

  function loadWidgetsData() {
    if (widgetsDataLoaded) return;
    widgetsDataLoaded = true;
    void loadWeather(savedCity, { force: false });
    void loadCurrency();
    void loadIpInfo({ force: false });
  }

  async function localizeCityName({ city, countryCode, latitude, longitude } = {}) {
    const rawCity = String(city || "").trim();
    if (!rawCity) return "";
    const lang = getCurrentLanguage();
    const lat = Number(latitude);
    const lon = Number(longitude);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);

    const cacheKey = `${lang}:${String(countryCode || "").toUpperCase()}:${rawCity.toLowerCase()}:${hasCoords ? `${lat.toFixed(3)},${lon.toFixed(3)}` : "nocoords"}`;
    if (localizedCityCache.has(cacheKey)) {
      return localizedCityCache.get(cacheKey);
    }

    if (hasCoords) {
      try {
        const reverseNominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&namedetails=1&accept-language=${encodeURIComponent(lang)}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
        const reverseNominatimData = await fetchJsonWithTimeout(reverseNominatimUrl, 4500);
        const namedetails = reverseNominatimData?.namedetails || {};
        const preferredNamed =
          (lang === "en" ? namedetails["name:en"] : namedetails["name:ru"]) ||
          namedetails.name ||
          "";
        const reverseAddress = reverseNominatimData?.address || {};
        const reverseLocalized =
          preferredNamed ||
          reverseAddress.city ||
          reverseAddress.town ||
          reverseAddress.village ||
          reverseAddress.municipality ||
          reverseAddress.county ||
          "";
        const reverseLocalizedCity = String(reverseLocalized || "").trim();
        if (reverseLocalizedCity) {
          localizedCityCache.set(cacheKey, reverseLocalizedCity);
          return reverseLocalizedCity;
        }
      } catch {
        // continue
      }

      try {
        const reverseUrl = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&language=${encodeURIComponent(lang)}`;
        const reverseData = await fetchJsonWithTimeout(reverseUrl, 4500);
        const reverseHit = Array.isArray(reverseData?.results) ? reverseData.results[0] : null;
        const reverseName = String(reverseHit?.name || "").trim();
        if (reverseName) {
          localizedCityCache.set(cacheKey, reverseName);
          return reverseName;
        }
      } catch {
        // fallback below
      }
    }

    try {
      const query = [rawCity, countryCode].filter(Boolean).join(", ");
      const langFallback = lang === "ru" ? "en" : "ru";
      const primary = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=${encodeURIComponent(lang)}&format=json`;
      const fallback = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=${encodeURIComponent(langFallback)}&format=json`;

      const openMeteoSources = [primary, fallback];
      for (const url of openMeteoSources) {
        try {
          const data = await fetchJsonWithTimeout(url, 4500);
          const hit = Array.isArray(data?.results) ? data.results[0] : null;
          const localized = String(hit?.name || "").trim();
          if (localized) {
            localizedCityCache.set(cacheKey, localized);
            return localized;
          }
        } catch {
          // continue
        }
      }

      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=${encodeURIComponent(lang)}&q=${encodeURIComponent(query)}`;
      const nominatimData = await fetchJsonWithTimeout(nominatimUrl, 4500);
      const nominatimHit = Array.isArray(nominatimData) ? nominatimData[0] : null;
      const address = nominatimHit?.address || {};
      const cityFromAddress =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        "";

      const finalCity = String(cityFromAddress || "").trim() || rawCity;
      localizedCityCache.set(cacheKey, finalCity);
      return finalCity;
    } catch {
      localizedCityCache.set(cacheKey, rawCity);
      return rawCity;
    }
  }

  async function refreshWeatherLocationLabel() {
    if (!weatherCityInputEl || !lastWeatherPayload) return;
    const lat = Number(lastWeatherPayload.latitude);
    const lon = Number(lastWeatherPayload.longitude);

    let city = String(lastWeatherPayload.placeName || "").trim();
    let countryCode = String(lastWeatherPayload.countryCode || "").trim().toUpperCase();

    const localizedCity = await localizeCityName({
      city,
      countryCode,
      latitude: Number.isFinite(lat) ? lat : undefined,
      longitude: Number.isFinite(lon) ? lon : undefined,
    });
    city = String(localizedCity || city).trim() || city;

    const localizedCountry = resolveLocalizedCountryName(countryCode, lastWeatherPayload.placeCountry || "");
    const cityAndCountry = [city, localizedCountry].filter(Boolean).join(", ");
    if (cityAndCountry) {
      weatherCityInputEl.value = cityAndCountry;
      weatherCityInputEl.dataset.displayCity = cityAndCountry;
    }
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

      stopNeighborAnimations(getRealWidgetCards(), activeNeighborAnimations);
      const beforeRect = targetCard.getBoundingClientRect();
      movePlaceholderNode(placeholderCard, targetCard, fromIndex, nextIndex);
      placeholderCard.dataset.index = String(nextIndex);
      updateWidgetIndexes();
      animateNeighborShift({
        node: targetCard,
        beforeRect,
        animations: activeNeighborAnimations,
        duration: REORDER_ANIMATION_MS,
      });
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

    function getAdjacentWidgetCard(node, direction) {
      return getAdjacentByDirection(node, direction, (current) => {
        if (!current.matches(".widget-card[data-widget-id]")) return false;
        if (current.classList.contains("widget-placeholder")) return false;
        if (current.classList.contains("floating-drag")) return false;
        return true;
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

  function isWidgetsVisible() {
    return !document.documentElement.classList.contains("pref-hide-widgets");
  }
}

function normalizeCityQuery(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function sanitizeWeatherCityQuery(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const [cityPart] = raw.split(",");
  return String(cityPart || raw).trim();
}

async function geocodeCity(city) {
  const primaryLang = getCurrentLanguage();
  const fallbackLang = primaryLang === "ru" ? "en" : "ru";
  const openMeteoPrimary = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=${encodeURIComponent(primaryLang)}&format=json`;
  const openMeteoFallback = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=${encodeURIComponent(fallbackLang)}&format=json`;
  const nominatim = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(city)}`;

  const probes = [
    async () => {
      const data = await fetchJsonWithTimeout(openMeteoPrimary);
      const item = Array.isArray(data?.results) ? data.results[0] : null;
      if (!item) return null;
      return {
        latitude: item.latitude,
        longitude: item.longitude,
        name: item.name || city,
        country: item.country || "",
        countryCode: String(item.country_code || "").toUpperCase(),
      };
    },
    async () => {
      const data = await fetchJsonWithTimeout(openMeteoFallback);
      const item = Array.isArray(data?.results) ? data.results[0] : null;
      if (!item) return null;
      return {
        latitude: item.latitude,
        longitude: item.longitude,
        name: item.name || city,
        country: item.country || "",
        countryCode: String(item.country_code || "").toUpperCase(),
      };
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
        countryCode: String(item?.address?.country_code || "").toUpperCase(),
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
        latitude: typeof data?.latitude === "number" ? data.latitude : Number(data?.latitude),
        longitude: typeof data?.longitude === "number" ? data.longitude : Number(data?.longitude),
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
        latitude: typeof data?.latitude === "number" ? data.latitude : Number(data?.latitude),
        longitude: typeof data?.longitude === "number" ? data.longitude : Number(data?.longitude),
      };
    },
    async () => {
      const data = await fetchJsonWithTimeout("https://ipinfo.io/json");
      const loc = String(data?.loc || "");
      const [latRaw, lonRaw] = loc.split(",");
      const latitude = Number(latRaw);
      const longitude = Number(lonRaw);
      return {
        ip: data?.ip || "",
        country: "",
        countryCode: String(data?.country || "").toUpperCase(),
        city: data?.city || "",
        latitude: Number.isFinite(latitude) ? latitude : undefined,
        longitude: Number.isFinite(longitude) ? longitude : undefined,
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

function weatherCodeToText(code, language = "ru") {
  const ruMap = new Map([
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
  const enMap = new Map([
    [0, "Clear sky"],
    [1, "Mainly clear"],
    [2, "Partly cloudy"],
    [3, "Overcast"],
    [45, "Fog"],
    [48, "Fog"],
    [51, "Light drizzle"],
    [53, "Drizzle"],
    [55, "Heavy drizzle"],
    [56, "Freezing drizzle"],
    [57, "Freezing drizzle"],
    [61, "Light rain"],
    [63, "Rain"],
    [65, "Heavy rain"],
    [66, "Freezing rain"],
    [67, "Freezing rain"],
    [71, "Light snow"],
    [73, "Snow"],
    [75, "Heavy snow"],
    [77, "Snow grains"],
    [80, "Showers"],
    [81, "Showers"],
    [82, "Heavy showers"],
    [85, "Snow showers"],
    [86, "Heavy snow showers"],
    [95, "Thunderstorm"],
    [96, "Thunderstorm"],
    [99, "Thunderstorm"],
  ]);

  const map = language === "en" ? enMap : ruMap;
  return map.get(code) || (language === "en" ? "Unknown" : "Неизвестно");
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
  return resolveLocalizedCountryName(code || raw, raw);
}

function resolveLocalizedCountryName(countryCodeOrRaw, fallbackName = "") {
  const raw = String(fallbackName || "").trim();
  const codeRaw = String(countryCodeOrRaw || "").trim().toUpperCase();
  const alpha2 = /^[A-Z]{2}$/.test(codeRaw)
    ? codeRaw
    : /^[A-Z]{2}$/.test(raw.toUpperCase())
      ? raw.toUpperCase()
      : "";

  if (!alpha2) return raw || t("widgets.unknownCountry");
  try {
    const names = new Intl.DisplayNames([getCurrentLanguage()], { type: "region" });
    return names.of(alpha2) || raw || alpha2 || t("widgets.unknownCountry");
  } catch {
    return raw || alpha2 || t("widgets.unknownCountry");
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

function readCachedValue(key, ttlMs) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const ts = Number(parsed.ts);
    if (!Number.isFinite(ts)) return null;
    if (Date.now() - ts > ttlMs) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

function readWeatherCacheEntry(cityKey, ttlMs) {
  if (!cityKey) return null;
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const entry = parsed?.entries?.[cityKey];
    if (!entry) return null;
    const ts = Number(entry.ts);
    if (!Number.isFinite(ts) || Date.now() - ts > ttlMs) return null;
    return entry.data ?? null;
  } catch {
    return null;
  }
}

function writeWeatherCacheEntry(cityKey, data) {
  if (!cityKey) return;
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const entries = parsed?.entries && typeof parsed.entries === "object" ? parsed.entries : {};
    entries[cityKey] = { ts: Date.now(), data };
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ entries }));
  } catch {
    // no-op
  }
}

function writeCachedValue(key, data) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        ts: Date.now(),
        data,
      })
    );
  } catch {
    // no-op
  }
}

function formatTime24(value) {
  const date = new Date(value || Date.now());
  const locale = getCurrentLanguage() === "en" ? "en-GB" : "ru-RU";
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
