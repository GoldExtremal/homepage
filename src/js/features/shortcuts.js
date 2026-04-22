import { DEFAULT_SHORTCUTS, MAX_SHORTCUTS, SHORTCUTS_STORAGE_KEY } from "../config/constants.js";
import {
  extractRootDomain,
  isValidUrl,
  normalizeOptionalUrl,
  normalizeUrl,
  shouldPreferHostFirst,
} from "../utils/url.js";
import {
  animateNeighborShift,
  getAdjacentByDirection,
  movePlaceholderNode,
  stopNeighborAnimations,
} from "../utils/reorder.js";

export function initShortcuts({
  listEl,
  templateEl,
  dialogEl,
  formEl,
  dialogTitleEl,
  nameInputEl,
  urlInputEl,
  iconInputEl,
  cancelBtnEl,
}) {
  let shortcuts = readShortcuts();
  let editingIndex = -1;
  let pressedTile = null;
  let draggedTile = null;
  let placeholderTile = null;
  let draggedInlineStyles = null;
  let dragStarted = false;
  let hasDragReordered = false;
  let activePointerId = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let pressStartX = 0;
  let pressStartY = 0;
  let nextReorderAllowedAt = 0;
  const activeNeighborAnimations = new WeakMap();
  let reorderAnimating = false;
  let reorderUnlockTimer = null;
  const DRAG_START_THRESHOLD = 4;
  const DRAG_PREVIEW_SCALE = 1.035;
  const REORDER_STEP_MS = 120;
  const REORDER_ANIMATION_MS = 170;

  renderShortcuts();
  initShortcutsReorder();

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = nameInputEl.value.trim();
    const url = normalizeUrl(urlInputEl.value);
    const icon = normalizeOptionalUrl(iconInputEl.value);

    if (!name || !isValidUrl(url)) {
      urlInputEl.setCustomValidity("Enter a valid URL");
      urlInputEl.reportValidity();
      return;
    }

    if (iconInputEl.value.trim() && !isValidUrl(icon)) {
      iconInputEl.setCustomValidity("Enter a valid icon URL");
      iconInputEl.reportValidity();
      return;
    }

    urlInputEl.setCustomValidity("");
    iconInputEl.setCustomValidity("");

    if (editingIndex >= 0 && editingIndex < shortcuts.length) {
      shortcuts[editingIndex] = { name: name.slice(0, 30), url, icon };
    } else if (shortcuts.length < MAX_SHORTCUTS) {
      shortcuts.push({ name: name.slice(0, 30), url, icon });
    }

    persistShortcuts();
    renderShortcuts();
    resetDialog();
    closeDialog();
  });

  cancelBtnEl.addEventListener("click", () => {
    resetDialog();
    closeDialog();
  });

  dialogEl.addEventListener("close", () => {
    resetDialog();
  });

  function renderShortcuts() {
    listEl.innerHTML = "";

    shortcuts.forEach((item, index) => {
      const fragment = templateEl.content.cloneNode(true);
      const tile = fragment.querySelector(".shortcut-item");
      const link = fragment.querySelector(".shortcut-link");
      const icon = fragment.querySelector(".shortcut-icon");
      const label = fragment.querySelector(".shortcut-label");
      const menuBtn = fragment.querySelector(".shortcut-menu-btn");
      const editBtn = fragment.querySelector(".shortcut-action-edit");
      const removeBtn = fragment.querySelector(".shortcut-action-remove");

      tile.dataset.index = String(index);
      link.setAttribute("draggable", "false");

      link.href = item.url;
      label.textContent = item.name;
      icon.replaceChildren(createFaviconImage(item.url, item.icon));

      menuBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeAllMenus();
        tile.classList.add("menu-open");
      });

      editBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openEditDialog(item, index);
        closeAllMenus();
      });

      removeBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        shortcuts.splice(index, 1);
        persistShortcuts();
        renderShortcuts();
      });

      listEl.appendChild(fragment);
    });

    if (shortcuts.length < MAX_SHORTCUTS) {
      const addItem = document.createElement("li");
      addItem.className = "shortcut-item shortcut-item-add";
      addItem.innerHTML = `
        <button class="shortcut-link" type="button" aria-label="Add shortcut">
          <span class="shortcut-icon">+</span>
          <span class="shortcut-label">Add shortcut</span>
        </button>
      `;

      addItem.querySelector("button").addEventListener("click", () => {
        closeAllMenus();
        if (typeof dialogEl.showModal === "function") {
          dialogTitleEl.textContent = "Add shortcut";
          editingIndex = -1;
          dialogEl.showModal();
          nameInputEl.focus();
          return;
        }

        const name = prompt("Shortcut name:");
        if (!name) return;
        const raw = prompt("Shortcut URL:");
        if (!raw) return;

        const url = normalizeUrl(raw);
        if (!isValidUrl(url)) return;
        if (shortcuts.length >= MAX_SHORTCUTS) return;

        shortcuts.push({ name: name.slice(0, 30), url, icon: "" });
        persistShortcuts();
        renderShortcuts();
      });

      listEl.appendChild(addItem);
    }
  }

  function initShortcutsReorder() {
    listEl.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (!(event.target instanceof Element)) return;

      const tile = event.target.closest(".shortcut-item:not(.shortcut-item-add)");
      if (!tile) return;
      if (event.target.closest(".shortcut-menu-btn, .shortcut-menu")) return;
      if (!event.target.closest(".shortcut-link")) return;
      event.preventDefault();

      pressedTile = tile;
      dragStarted = false;
      hasDragReordered = false;
      nextReorderAllowedAt = 0;
      activePointerId = event.pointerId;
      pressStartX = event.clientX;
      pressStartY = event.clientY;

      const rect = tile.getBoundingClientRect();
      dragOffsetX = event.clientX - rect.left;
      dragOffsetY = event.clientY - rect.top;

      window.addEventListener("pointermove", handlePointerMove, { passive: false });
      window.addEventListener("pointerup", handlePointerEnd, { passive: false });
      window.addEventListener("pointercancel", handlePointerEnd, { passive: false });
    });
  }

  function handlePointerMove(event) {
    if (activePointerId === null || event.pointerId !== activePointerId || !pressedTile) return;

    if (!dragStarted) {
      const dx = event.clientX - pressStartX;
      const dy = event.clientY - pressStartY;
      if (Math.hypot(dx, dy) < DRAG_START_THRESHOLD) return;
      event.preventDefault();
      beginDrag(pressedTile, event.clientX, event.clientY);
    }

    event.preventDefault();
    moveFloatingTile(event.clientX, event.clientY);
    moveDuringDrag(event.clientX);
  }

  function handlePointerEnd(event) {
    if (activePointerId === null || event.pointerId !== activePointerId) return;
    const shouldPersistAndRerender = dragStarted && hasDragReordered;
    clearDragState();
    if (shouldPersistAndRerender) {
      persistShortcuts();
      renderShortcuts();
    }
  }

  function beginDrag(tile, clientX, clientY) {
    draggedTile = tile;
    dragStarted = true;
    listEl.classList.add("drag-active");
    document.body.classList.add("shortcuts-dragging");
    closeAllMenus();
    startFloatingDrag(tile, clientX, clientY);
  }

  function startFloatingDrag(tile, clientX, clientY) {
    const rect = tile.getBoundingClientRect();

    placeholderTile = document.createElement("li");
    placeholderTile.className = "shortcut-item shortcut-placeholder";
    placeholderTile.dataset.index = tile.dataset.index || "";
    placeholderTile.style.width = `${rect.width}px`;
    placeholderTile.style.minWidth = `${rect.width}px`;
    placeholderTile.style.maxWidth = `${rect.width}px`;
    placeholderTile.style.flexBasis = `${rect.width}px`;
    placeholderTile.style.height = `${rect.height}px`;
    placeholderTile.style.minHeight = `${rect.height}px`;
    tile.insertAdjacentElement("afterend", placeholderTile);

    draggedInlineStyles = {
      position: tile.style.position,
      left: tile.style.left,
      top: tile.style.top,
      width: tile.style.width,
      minWidth: tile.style.minWidth,
      maxWidth: tile.style.maxWidth,
      flexBasis: tile.style.flexBasis,
      height: tile.style.height,
      minHeight: tile.style.minHeight,
      margin: tile.style.margin,
      zIndex: tile.style.zIndex,
      pointerEvents: tile.style.pointerEvents,
      transition: tile.style.transition,
      transform: tile.style.transform,
    };

    tile.classList.add("floating-drag");
    tile.style.position = "fixed";
    tile.style.left = "0";
    tile.style.top = "0";
    tile.style.width = `${rect.width}px`;
    tile.style.minWidth = `${rect.width}px`;
    tile.style.maxWidth = `${rect.width}px`;
    tile.style.flexBasis = `${rect.width}px`;
    tile.style.height = `${rect.height}px`;
    tile.style.minHeight = `${rect.height}px`;
    tile.style.margin = "0";
    tile.style.zIndex = "9999";
    tile.style.pointerEvents = "none";
    tile.style.transition = "none";

    moveFloatingTile(clientX || rect.left + dragOffsetX, clientY || rect.top + dragOffsetY);
  }

  function moveFloatingTile(clientX, clientY) {
    if (!draggedTile || !dragStarted) return;
    const x = Math.round((clientX || 0) - dragOffsetX);
    const y = Math.round((clientY || 0) - dragOffsetY);
    draggedTile.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${DRAG_PREVIEW_SCALE})`;
  }

  function readShortcuts() {
    try {
      const raw = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
      if (!raw) return [...DEFAULT_SHORTCUTS].slice(0, MAX_SHORTCUTS);

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [...DEFAULT_SHORTCUTS].slice(0, MAX_SHORTCUTS);

      const cleaned = parsed
        .filter((item) => item && typeof item.name === "string" && typeof item.url === "string")
        .map((item) => ({
          name: item.name.slice(0, 30),
          url: normalizeUrl(item.url),
          icon: typeof item.icon === "string" ? normalizeOptionalUrl(item.icon) : "",
        }))
        .filter((item) => item.name && isValidUrl(item.url));

      return cleaned.length ? cleaned.slice(0, MAX_SHORTCUTS) : [...DEFAULT_SHORTCUTS].slice(0, MAX_SHORTCUTS);
    } catch {
      return [...DEFAULT_SHORTCUTS].slice(0, MAX_SHORTCUTS);
    }
  }

  function persistShortcuts() {
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(shortcuts));
  }

  function openEditDialog(item, index) {
    editingIndex = index;
    dialogTitleEl.textContent = "Edit shortcut";
    nameInputEl.value = item.name;
    urlInputEl.value = item.url;
    iconInputEl.value = item.icon || "";

    if (typeof dialogEl.showModal === "function") {
      dialogEl.showModal();
      nameInputEl.focus();
      nameInputEl.select();
      return;
    }

    const nextName = prompt("Shortcut name:", item.name);
    if (!nextName) return;
    const nextUrlRaw = prompt("Shortcut URL:", item.url);
    if (!nextUrlRaw) return;
    const nextUrl = normalizeUrl(nextUrlRaw);
    if (!isValidUrl(nextUrl)) return;

    shortcuts[index] = { name: nextName.slice(0, 30), url: nextUrl, icon: item.icon || "" };
    persistShortcuts();
    renderShortcuts();
    resetDialog();
  }

  function closeAllMenus() {
    document.querySelectorAll(".shortcut-item.menu-open").forEach((node) => {
      node.classList.remove("menu-open");
    });
  }

  function clearDragState() {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerEnd);
    window.removeEventListener("pointercancel", handlePointerEnd);
    document.body.classList.remove("shortcuts-dragging");
    stopNeighborAnimations();
    finishFloatingDrag();
    pressedTile = null;
    draggedTile = null;
    placeholderTile = null;
    draggedInlineStyles = null;
    dragStarted = false;
    hasDragReordered = false;
    activePointerId = null;
    nextReorderAllowedAt = 0;
    reorderAnimating = false;
    if (reorderUnlockTimer) {
      clearTimeout(reorderUnlockTimer);
      reorderUnlockTimer = null;
    }
    listEl.classList.remove("drag-active");
    document.querySelectorAll(".shortcut-item.drop-target, .shortcut-item.floating-drag").forEach((node) => {
      node.classList.remove("drop-target", "floating-drag");
    });
  }

  function moveDuringDrag(pointerX) {
    if (!draggedTile || !placeholderTile) return;
    const now = performance.now();
    if (now < nextReorderAllowedAt) return;
    if (reorderAnimating) return;

    const fromIndex = Number(placeholderTile.dataset.index);
    if (Number.isNaN(fromIndex) || fromIndex < 0 || fromIndex >= shortcuts.length) return;

    const prevTile = getAdjacentShortcutTile(placeholderTile, -1);
    const nextTile = getAdjacentShortcutTile(placeholderTile, 1);
    let targetTile = null;
    let nextIndex = fromIndex;

    if (nextTile) {
      const rect = nextTile.getBoundingClientRect();
      if (pointerX > rect.left + rect.width * 0.6) {
        targetTile = nextTile;
        nextIndex = fromIndex + 1;
      }
    }

    if (!targetTile && prevTile) {
      const rect = prevTile.getBoundingClientRect();
      if (pointerX < rect.left + rect.width * 0.4) {
        targetTile = prevTile;
        nextIndex = fromIndex - 1;
      }
    }

    if (!targetTile) return;
    if (nextIndex < 0 || nextIndex >= shortcuts.length) return;

    stopNeighborAnimations(getRealShortcutTiles(), activeNeighborAnimations);
    const neighborBeforeRect = targetTile.getBoundingClientRect();
    moveShortcutItem(fromIndex, nextIndex);
    movePlaceholderNode(placeholderTile, targetTile, fromIndex, nextIndex);
    placeholderTile.dataset.index = String(nextIndex);
    updateShortcutIndexes();
    animateNeighborShift({
      node: targetTile,
      beforeRect: neighborBeforeRect,
      animations: activeNeighborAnimations,
      duration: REORDER_ANIMATION_MS,
    });
    hasDragReordered = true;
    nextReorderAllowedAt = now + REORDER_STEP_MS;
    reorderAnimating = true;
    if (reorderUnlockTimer) clearTimeout(reorderUnlockTimer);
    reorderUnlockTimer = setTimeout(() => {
      reorderAnimating = false;
      reorderUnlockTimer = null;
    }, REORDER_ANIMATION_MS);
  }

  function moveShortcutItem(fromIndex, toIndex) {
    const [moved] = shortcuts.splice(fromIndex, 1);
    shortcuts.splice(toIndex, 0, moved);
  }

  function updateShortcutIndexes() {
    getRealShortcutTiles().forEach((node, idx) => {
      node.dataset.index = String(idx);
    });
  }

  function getAdjacentShortcutTile(node, direction) {
    return getAdjacentByDirection(node, direction, (current) => {
      if (current.classList.contains("shortcut-item-add")) return false;
      if (current.classList.contains("shortcut-placeholder")) return false;
      if (current.classList.contains("floating-drag")) return false;
      return true;
    });
  }

  function finishFloatingDrag() {
    if (!draggedTile) {
      if (placeholderTile) {
        placeholderTile.remove();
        placeholderTile = null;
      }
      return;
    }

    if (placeholderTile?.parentNode) {
      placeholderTile.parentNode.insertBefore(draggedTile, placeholderTile);
      placeholderTile.remove();
    }
    placeholderTile = null;

    const saved = draggedInlineStyles || {};
    draggedTile.classList.remove("floating-drag");
    draggedTile.style.position = saved.position || "";
    draggedTile.style.left = saved.left || "";
    draggedTile.style.top = saved.top || "";
    draggedTile.style.width = saved.width || "";
    draggedTile.style.minWidth = saved.minWidth || "";
    draggedTile.style.maxWidth = saved.maxWidth || "";
    draggedTile.style.flexBasis = saved.flexBasis || "";
    draggedTile.style.height = saved.height || "";
    draggedTile.style.minHeight = saved.minHeight || "";
    draggedTile.style.margin = saved.margin || "";
    draggedTile.style.zIndex = saved.zIndex || "";
    draggedTile.style.pointerEvents = saved.pointerEvents || "";
    draggedTile.style.transition = saved.transition || "";
    draggedTile.style.transform = saved.transform || "";
    draggedInlineStyles = null;
    updateShortcutIndexes();
  }

  function getShortcutTiles() {
    return Array.from(listEl.querySelectorAll(".shortcut-item:not(.shortcut-item-add):not(.floating-drag)"));
  }

  function getRealShortcutTiles() {
    return Array.from(
      listEl.querySelectorAll(".shortcut-item:not(.shortcut-item-add):not(.floating-drag):not(.shortcut-placeholder)")
    );
  }

  function resetDialog() {
    editingIndex = -1;
    dialogTitleEl.textContent = "Add shortcut";
    formEl.reset();
    urlInputEl.setCustomValidity("");
    iconInputEl.setCustomValidity("");
  }

  function closeDialog() {
    if (dialogEl.open) dialogEl.close();
  }

  return {
    closeAllMenus,
    containsTarget(target) {
      return target instanceof Element && Boolean(target.closest(".shortcut-item"));
    },
  };
}

function createFaviconImage(rawUrl, iconOverride = "") {
  const img = document.createElement("img");
  img.alt = "";
  img.draggable = false;

  const candidates = getFaviconCandidates(rawUrl, iconOverride);
  let index = 0;
  img.src = candidates[index];
  img.addEventListener("error", () => {
    index += 1;
    if (index < candidates.length) {
      img.src = candidates[index];
      return;
    }
    img.src = "https://www.google.com/s2/favicons?sz=64&domain=google.com";
  });

  return img;
}

function getFaviconCandidates(rawUrl, iconOverride = "") {
  try {
    const parsed = new URL(normalizeUrl(rawUrl));
    const { origin, hostname } = parsed;
    const cleanHost = hostname.replace(/^www\./i, "");
    const rootDomain = extractRootDomain(cleanHost);
    const preferHostFirst = shouldPreferHostFirst(cleanHost, rootDomain);
    const preferredDomain = preferHostFirst ? cleanHost : rootDomain;
    const secondaryDomain = preferHostFirst ? rootDomain : cleanHost;

    return [
      ...(iconOverride ? [normalizeOptionalUrl(iconOverride)] : []),
      `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(preferredDomain)}`,
      `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(secondaryDomain)}`,
      `${origin}/apple-touch-icon.png`,
      `${origin}/favicon.ico`,
      `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(origin)}`,
    ];
  } catch {
    if (iconOverride) return [normalizeOptionalUrl(iconOverride), "https://www.google.com/s2/favicons?sz=64&domain=google.com"];
    return ["https://www.google.com/s2/favicons?sz=64&domain=google.com"];
  }
}
