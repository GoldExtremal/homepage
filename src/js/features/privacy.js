import {
  BACKGROUND_IMAGE_KEY,
  BACKGROUND_TEMPLATE_KEY,
  CURRENCY_CACHE_KEY,
  IP_CACHE_KEY,
  PAGE_SETTINGS_KEY,
  PRIVACY_CONSENT_KEY,
  PRIVACY_SETTINGS_KEY,
  SEARCH_HISTORY_KEY,
  SHORTCUTS_STORAGE_KEY,
  WEATHER_CACHE_KEY,
  WEATHER_CITY_KEY,
  WIDGETS_ORDER_KEY,
} from "../config/constants.js";

export const PRIVACY_SETTINGS_EVENT = "page-settings:privacy-change";

const DEFAULT_PRIVACY_SETTINGS = {
  searchSuggest: false,
  weather: false,
  currency: false,
  ipWidget: false,
};

function normalizeBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

export function readPrivacySettings() {
  try {
    const raw = localStorage.getItem(PRIVACY_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_PRIVACY_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      searchSuggest: normalizeBoolean(parsed?.searchSuggest, DEFAULT_PRIVACY_SETTINGS.searchSuggest),
      weather: normalizeBoolean(parsed?.weather, DEFAULT_PRIVACY_SETTINGS.weather),
      currency: normalizeBoolean(parsed?.currency, DEFAULT_PRIVACY_SETTINGS.currency),
      ipWidget: normalizeBoolean(parsed?.ipWidget, DEFAULT_PRIVACY_SETTINGS.ipWidget),
    };
  } catch {
    return { ...DEFAULT_PRIVACY_SETTINGS };
  }
}

export function writePrivacySettings(nextSettings, { emit = true } = {}) {
  const normalized = {
    searchSuggest: Boolean(nextSettings?.searchSuggest),
    weather: Boolean(nextSettings?.weather),
    currency: Boolean(nextSettings?.currency),
    ipWidget: Boolean(nextSettings?.ipWidget),
  };
  localStorage.setItem(PRIVACY_SETTINGS_KEY, JSON.stringify(normalized));
  if (emit) {
    window.dispatchEvent(
      new CustomEvent(PRIVACY_SETTINGS_EVENT, {
        detail: { settings: normalized },
      })
    );
  }
  return normalized;
}

export function isPrivacyFeatureEnabled(feature) {
  const settings = readPrivacySettings();
  return Boolean(settings?.[feature]);
}

export function readPrivacyConsent() {
  try {
    const raw = localStorage.getItem(PRIVACY_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      status: typeof parsed.status === "string" ? parsed.status : "unknown",
      ts: Number.isFinite(Number(parsed.ts)) ? Number(parsed.ts) : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writePrivacyConsent(status) {
  localStorage.setItem(
    PRIVACY_CONSENT_KEY,
    JSON.stringify({
      status,
      ts: Date.now(),
    })
  );
}

export async function clearSiteLocalData() {
  const keys = [
    SHORTCUTS_STORAGE_KEY,
    WEATHER_CITY_KEY,
    WIDGETS_ORDER_KEY,
    SEARCH_HISTORY_KEY,
    PAGE_SETTINGS_KEY,
    BACKGROUND_IMAGE_KEY,
    BACKGROUND_TEMPLATE_KEY,
    WEATHER_CACHE_KEY,
    CURRENCY_CACHE_KEY,
    IP_CACHE_KEY,
    PRIVACY_SETTINGS_KEY,
    PRIVACY_CONSENT_KEY,
  ];

  keys.forEach((key) => localStorage.removeItem(key));

  if ("caches" in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch {
      // ignore cache clear failures in unsupported/private modes
    }
  }

  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch {
      // ignore unregister failures
    }
  }
}

export function initPrivacyBanner({
  bannerEl,
  acceptBtnEl,
}) {
  if (!bannerEl || !acceptBtnEl) return;

  const consent = readPrivacyConsent();
  if (consent) {
    bannerEl.hidden = true;
    return;
  }

  bannerEl.hidden = false;

  acceptBtnEl.addEventListener("click", () => {
    writePrivacySettings({
      searchSuggest: true,
      weather: true,
      currency: true,
      ipWidget: true,
    });
    writePrivacyConsent("accepted");
    bannerEl.hidden = true;
  });
}
