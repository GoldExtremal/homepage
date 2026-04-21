import { WEATHER_CITY_KEY } from "../config/constants.js";

export function initWidgets({
  weatherFormEl,
  weatherCityInputEl,
  weatherContentEl,
  currencyContentEl,
  ipContentEl,
  refreshCurrencyBtnEl,
  refreshIpBtnEl,
}) {
  const savedCity = localStorage.getItem(WEATHER_CITY_KEY) || "Moscow";
  if (weatherCityInputEl) weatherCityInputEl.value = savedCity;
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

  if (refreshCurrencyBtnEl) {
    refreshCurrencyBtnEl.addEventListener("click", () => {
      void loadCurrency();
    });
  }

  if (refreshIpBtnEl) {
    refreshIpBtnEl.addEventListener("click", () => {
      void loadIpInfo();
    });
  }

  async function loadWeather(city) {
    if (!weatherContentEl) return;
    weatherContentEl.textContent = "Loading weather…";

    try {
      const geoResp = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
      );
      if (!geoResp.ok) throw new Error("geocoding-failed");
      const geoData = await geoResp.json();
      const place = Array.isArray(geoData?.results) ? geoData.results[0] : null;
      if (!place) {
        weatherContentEl.textContent = "City not found";
        return;
      }

      const weatherResp = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&timezone=auto`
      );
      if (!weatherResp.ok) throw new Error("weather-failed");
      const weatherData = await weatherResp.json();
      const current = weatherData?.current;
      if (!current) throw new Error("weather-empty");

      const temp = Math.round(current.temperature_2m);
      const condition = weatherCodeToText(current.weather_code);
      weatherContentEl.innerHTML = `${temp}°C, ${condition}<span class="sub">${place.name}, ${place.country}</span>`;
    } catch {
      weatherContentEl.textContent = "Weather unavailable";
    }
  }

  async function loadCurrency() {
    if (!currencyContentEl) return;
    currencyContentEl.textContent = "Loading exchange rate…";

    try {
      const resp = await fetch("https://api.frankfurter.app/latest?from=USD&to=RUB");
      if (!resp.ok) throw new Error("currency-failed");
      const data = await resp.json();
      const rate = data?.rates?.RUB;
      if (typeof rate !== "number") throw new Error("currency-empty");
      const updated = data?.date ? new Date(data.date).toLocaleDateString() : "";
      currencyContentEl.innerHTML = `1 USD = ${rate.toFixed(2)} RUB<span class="sub">${updated}</span>`;
    } catch {
      currencyContentEl.textContent = "Rate unavailable";
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
      ipContentEl.textContent = "IP data unavailable";
    }
  }
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
    [0, "Clear"],
    [1, "Mostly clear"],
    [2, "Partly cloudy"],
    [3, "Cloudy"],
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
    [80, "Rain showers"],
    [81, "Rain showers"],
    [82, "Heavy showers"],
    [85, "Snow showers"],
    [86, "Heavy snow showers"],
    [95, "Thunderstorm"],
    [96, "Thunderstorm"],
    [99, "Thunderstorm"],
  ]);
  return map.get(code) || "Unknown";
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
