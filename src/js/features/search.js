import { SEARCH_HISTORY_KEY, SEARCH_HISTORY_LIMIT, SUGGEST_ENDPOINT } from "../config/constants.js";
import { getCurrentLanguage } from "../i18n.js";
import { reportError } from "../utils/log.js";
import { looksLikeUrl, normalizeUrl } from "../utils/url.js";

export function initSearch({ formEl, inputEl, suggestionsEl }) {
  let suggestionTimer = null;
  let activeSuggestionIndex = -1;
  let currentSuggestions = [];
  let searchHistory = readSearchHistory();
  let suggestRequestId = 0;
  let activeSuggestCleanup = null;

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    if (activeSuggestionIndex >= 0 && activeSuggestionIndex < currentSuggestions.length) {
      runSearch();
      return;
    }
    runSearch();
  });

  inputEl.addEventListener("input", () => {
    queueSuggestions(inputEl.value);
  });

  inputEl.addEventListener("click", () => {
    if (!inputEl.value.trim()) {
      showHistorySuggestions();
    }
  });

  inputEl.addEventListener("keydown", (event) => {
    if (!currentSuggestions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeSuggestionIndex = (activeSuggestionIndex + 1) % currentSuggestions.length;
      syncActiveSuggestion();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      activeSuggestionIndex = activeSuggestionIndex <= 0 ? currentSuggestions.length - 1 : activeSuggestionIndex - 1;
      syncActiveSuggestion();
      return;
    }

    if (event.key === "Escape") {
      hideSuggestions();
    }
  });

  inputEl.focus();

  function runSearch(valueOverride = "") {
    const value = activeSuggestionIndex >= 0 && activeSuggestionIndex < currentSuggestions.length
      ? currentSuggestions[activeSuggestionIndex]?.text || ""
      : valueOverride || inputEl.value;
    const query = String(value).trim();
    if (!query) return;
    hideSuggestions();
    pushSearchHistory(query);

    if (looksLikeUrl(query)) {
      window.location.href = normalizeUrl(query);
      return;
    }

    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  function queueSuggestions(rawValue) {
    const query = rawValue.trim();
    if (suggestionTimer) clearTimeout(suggestionTimer);
    if (!query) {
      hideSuggestions();
      return;
    }

    suggestionTimer = setTimeout(() => {
      fetchSuggestions(query);
    }, 140);
  }

  async function fetchSuggestions(query) {
    const requestId = ++suggestRequestId;
    if (activeSuggestCleanup) {
      activeSuggestCleanup();
      activeSuggestCleanup = null;
    }

    try {
      const googleItems = await fetchGoogleSuggestionsJsonp(query, requestId);
      if (requestId !== suggestRequestId) return;
      const historyItems = getHistoryMatches(query).map((text) => ({ text, source: "history" }));
      const merged = mergeSuggestionItems(historyItems, googleItems);
      renderSuggestions(merged);
    } catch (error) {
      reportError("Search suggestions request failed", error);
      if (requestId !== suggestRequestId) return;
      const historyItems = getHistoryMatches(query).map((text) => ({ text, source: "history" }));
      if (!historyItems.length) {
        hideSuggestions();
        return;
      }
      renderSuggestions(historyItems);
    }
  }

  function renderSuggestions(items) {
    currentSuggestions = items;
    activeSuggestionIndex = -1;
    suggestionsEl.innerHTML = "";

    if (!items.length) {
      hideSuggestions();
      return;
    }

    items.forEach((item, index) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-suggestion-item";
      button.setAttribute("role", "option");
      button.dataset.index = String(index);
      if (item.source === "history") button.classList.add("from-history");

      const icon = document.createElement("span");
      icon.className = "search-suggestion-item-icon";
      if (item.source !== "history") icon.classList.add("is-empty");
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 8v5l3 2"></path>
          <circle cx="12" cy="12" r="8"></circle>
        </svg>
      `;
      button.appendChild(icon);
      const text = document.createElement("span");
      text.className = "search-suggestion-item-text";
      text.textContent = item.text;
      button.appendChild(text);

      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });

      button.addEventListener("mouseenter", () => {
        activeSuggestionIndex = index;
        syncActiveSuggestion();
      });

      button.addEventListener("click", () => {
        runSearch(item.text);
      });

      li.appendChild(button);
      suggestionsEl.appendChild(li);
    });

    suggestionsEl.onmouseleave = () => {
      activeSuggestionIndex = -1;
      syncActiveSuggestion();
    };

    suggestionsEl.classList.add("open");
  }

  function showHistorySuggestions() {
    renderSuggestions(searchHistory.map((text) => ({ text, source: "history" })));
  }

  function syncActiveSuggestion() {
    const nodes = suggestionsEl.querySelectorAll(".search-suggestion-item");
    nodes.forEach((node) => node.classList.remove("active"));
    if (activeSuggestionIndex < 0 || activeSuggestionIndex >= nodes.length) return;
    const activeNode = nodes[activeSuggestionIndex];
    activeNode.classList.add("active");
  }

  function hideSuggestions() {
    if (activeSuggestCleanup) {
      activeSuggestCleanup();
      activeSuggestCleanup = null;
    }
    currentSuggestions = [];
    activeSuggestionIndex = -1;
    suggestionsEl.innerHTML = "";
    suggestionsEl.onmouseleave = null;
    suggestionsEl.classList.remove("open");
  }

  function pushSearchHistory(query) {
    const trimmed = String(query).trim();
    if (!trimmed) return;
    const normalized = trimmed.toLowerCase();

    searchHistory = [trimmed, ...searchHistory.filter((item) => item.toLowerCase() !== normalized)].slice(0, SEARCH_HISTORY_LIMIT);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
  }

  function fetchGoogleSuggestionsJsonp(query, requestId) {
    return new Promise((resolve, reject) => {
      const lang = getCurrentLanguage();
      const callbackName = `__googleSuggest_${requestId}_${Date.now()}`;
      const script = document.createElement("script");
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("suggest-timeout"));
      }, 5000);

      function cleanup() {
        clearTimeout(timeoutId);
        if (script.parentNode) script.parentNode.removeChild(script);
        if (window[callbackName]) delete window[callbackName];
        if (activeSuggestCleanup === cleanup) activeSuggestCleanup = null;
      }

      window[callbackName] = (payload) => {
        cleanup();
        const clean = normalizeGoogleSuggestions(payload).map((text) => ({ text, source: "google" }));
        resolve(clean);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("suggest-load"));
      };

      script.src = `${SUGGEST_ENDPOINT}?client=chrome&hl=${encodeURIComponent(lang)}&q=${encodeURIComponent(query)}&callback=${callbackName}`;
      activeSuggestCleanup = cleanup;
      document.head.appendChild(script);
    });
  }

  function normalizeGoogleSuggestions(payload) {
    if (!Array.isArray(payload) || !Array.isArray(payload[1])) return [];
    return payload[1]
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (Array.isArray(item) && typeof item[0] === "string") return item[0].trim();
        return "";
      })
      .filter(Boolean)
      .slice(0, 8);
  }

  function readSearchHistory() {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, SEARCH_HISTORY_LIMIT);
    } catch {
      return [];
    }
  }

  function getHistoryMatches(query) {
    const normalized = String(query || "").trim().toLowerCase();
    if (!normalized) return searchHistory.slice(0, SEARCH_HISTORY_LIMIT);

    const startsWith = [];
    const includes = [];
    searchHistory.forEach((item) => {
      const value = item.toLowerCase();
      if (value.startsWith(normalized)) {
        startsWith.push(item);
        return;
      }
      if (value.includes(normalized)) includes.push(item);
    });

    return [...startsWith, ...includes].slice(0, SEARCH_HISTORY_LIMIT);
  }

  function mergeSuggestionItems(historyItems, googleItems) {
    const merged = [];
    const seen = new Set();
    [...historyItems, ...googleItems].forEach((item) => {
      const text = String(item?.text || "").trim();
      if (!text) return;
      const key = text.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      merged.push({ text, source: item?.source === "history" ? "history" : "google" });
    });
    return merged.slice(0, SEARCH_HISTORY_LIMIT);
  }

  return {
    hideSuggestions,
    containsTarget(target) {
      return target instanceof Element && Boolean(target.closest("#searchForm"));
    },
  };
}
