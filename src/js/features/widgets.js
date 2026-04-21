import { WEATHER_CITY_KEY } from "../config/constants.js";

export function initWidgets({
  weatherFormEl,
  weatherCityInputEl,
  weatherContentEl,
  currencyContentEl,
  ipContentEl,
  refreshIpBtnEl,
}) {
  const savedCity = localStorage.getItem(WEATHER_CITY_KEY) || "Moscow";
  if (weatherCityInputEl) weatherCityInputEl.value = savedCity;
  if (weatherCityInputEl) weatherCityInputEl.placeholder = "Город (можно по-русски)";
  void loadWeather(savedCity);
  void loadCurrency();
  void loadIpInfo();

  if (weatherFormEl) {
    weatherFormEl.addEventListener("submit", (event) => {
      event.preventDefault();
      const city = weatherCityInputEl.value.trim();
      if (!city) return;
      localStorage.setItem(WEATHER_CITY_KEY, city);
      void loadWeather(city);
    });
  }

  if (refreshIpBtnEl) {
    refreshIpBtnEl.addEventListener("click", () => {
      void loadIpInfo();
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
      }

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
      const flag = countryCode ? countryCodeToFlag(countryCode) : "";

      ipContentEl.innerHTML = `
        <div class="ip-content-premium">
          <div class="ip-value">${escapeHtml(ip)}</div>
          <div class="ip-meta">
            <span class="ip-flag">${flag}</span>
            <span>${escapeHtml(country)}</span>
          </div>
          <div class="ip-city">${city ? escapeHtml(city) : "Location unavailable"}</div>
        </div>
      `;
    } catch {
      ipContentEl.textContent = "Данные IP недоступны";
    }
  }
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

function countryCodeToFlag(code) {
  if (!/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
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
