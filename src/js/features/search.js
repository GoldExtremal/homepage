import { SUGGEST_ENDPOINT } from "../config/constants.js";
import { looksLikeUrl, normalizeUrl } from "../utils/url.js";

export function initSearch({ formEl, inputEl, suggestionsEl }) {
  let suggestionTimer = null;
  let activeSuggestionIndex = -1;
  let currentSuggestions = [];
  let suggestRequestId = 0;
  let activeSuggestCleanup = null;

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    if (activeSuggestionIndex >= 0 && activeSuggestionIndex < currentSuggestions.length) {
      runSearch(currentSuggestions[activeSuggestionIndex]);
      return;
    }
    runSearch();
  });

  inputEl.addEventListener("input", () => {
    queueSuggestions(inputEl.value);
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
    const query = (valueOverride || inputEl.value).trim();
    if (!query) return;
    hideSuggestions();

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
      const clean = await fetchGoogleSuggestionsJsonp(query, requestId);
      if (requestId !== suggestRequestId) return;
      renderSuggestions(clean);
    } catch {
      if (requestId !== suggestRequestId) return;
      hideSuggestions();
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

    items.forEach((text, index) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-suggestion-item";
      button.setAttribute("role", "option");
      button.dataset.index = String(index);
      button.textContent = text;

      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });

      button.addEventListener("mouseenter", () => {
        activeSuggestionIndex = index;
        syncActiveSuggestion();
      });

      button.addEventListener("click", () => {
        runSearch(text);
      });

      li.appendChild(button);
      suggestionsEl.appendChild(li);
    });

    suggestionsEl.classList.add("open");
  }

  function syncActiveSuggestion() {
    const nodes = suggestionsEl.querySelectorAll(".search-suggestion-item");
    nodes.forEach((node) => node.classList.remove("active"));
    if (activeSuggestionIndex < 0 || activeSuggestionIndex >= nodes.length) return;
    const activeNode = nodes[activeSuggestionIndex];
    activeNode.classList.add("active");
    inputEl.value = currentSuggestions[activeSuggestionIndex];
  }

  function hideSuggestions() {
    if (activeSuggestCleanup) {
      activeSuggestCleanup();
      activeSuggestCleanup = null;
    }
    currentSuggestions = [];
    activeSuggestionIndex = -1;
    suggestionsEl.innerHTML = "";
    suggestionsEl.classList.remove("open");
  }

  function fetchGoogleSuggestionsJsonp(query, requestId) {
    return new Promise((resolve, reject) => {
      const lang = (navigator.language || "en").split("-")[0];
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
        const clean = normalizeGoogleSuggestions(payload);
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

  return {
    hideSuggestions,
    containsTarget(target) {
      return target instanceof Element && Boolean(target.closest("#searchForm"));
    },
  };
}
