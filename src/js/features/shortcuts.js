import { DEFAULT_SHORTCUTS, SHORTCUTS_STORAGE_KEY } from "../config/constants.js";
import {
  extractRootDomain,
  isValidUrl,
  normalizeOptionalUrl,
  normalizeUrl,
  shouldPreferHostFirst,
} from "../utils/url.js";

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
  let draggedTile = null;
  let hasDragReordered = false;
  let highlightFrameId = null;

  renderShortcuts();

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
    } else {
      shortcuts.push({ name: name.slice(0, 30), url, icon });
      shortcuts = shortcuts.slice(0, 10);
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
      link.setAttribute("draggable", "true");

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

      link.addEventListener("dragstart", (event) => {
        if (event.target instanceof Element && event.target.closest(".shortcut-menu-btn, .shortcut-menu")) {
          event.preventDefault();
          return;
        }
        draggedTile = tile;
        hasDragReordered = false;
        listEl.classList.add("drag-active");
        tile.classList.add("dragging");
        closeAllMenus();
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", String(index));
        }
      });

      tile.addEventListener("dragover", (event) => {
        if (!draggedTile) return;
        const fromIndex = Number(draggedTile.dataset.index);
        const targetIndex = Number(tile.dataset.index);
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        if (Number.isNaN(fromIndex) || Number.isNaN(targetIndex) || fromIndex === targetIndex) {
          queueHighlightDropTarget(event.clientX, event.clientY);
          return;
        }
        swapDuringDrag(tile, event.clientX, event.clientY);
      });

      tile.addEventListener("dragleave", (event) => {
        if (event.target !== tile) return;
        tile.classList.remove("drop-target");
      });

      tile.addEventListener("drop", (event) => {
        event.preventDefault();
        persistShortcuts();
        renderShortcuts();
        clearDragState();
      });

      link.addEventListener("dragend", () => {
        if (hasDragReordered) {
          persistShortcuts();
          renderShortcuts();
        }
        clearDragState();
      });

      listEl.appendChild(fragment);
    });

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

      shortcuts.push({ name: name.slice(0, 30), url, icon: "" });
      shortcuts = shortcuts.slice(0, 10);
      persistShortcuts();
      renderShortcuts();
    });

    listEl.appendChild(addItem);
  }

  function readShortcuts() {
    try {
      const raw = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
      if (!raw) return [...DEFAULT_SHORTCUTS];

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [...DEFAULT_SHORTCUTS];

      const cleaned = parsed
        .filter((item) => item && typeof item.name === "string" && typeof item.url === "string")
        .map((item) => ({
          name: item.name.slice(0, 30),
          url: normalizeUrl(item.url),
          icon: typeof item.icon === "string" ? normalizeOptionalUrl(item.icon) : "",
        }))
        .filter((item) => item.name && isValidUrl(item.url));

      return cleaned.length ? cleaned : [...DEFAULT_SHORTCUTS];
    } catch {
      return [...DEFAULT_SHORTCUTS];
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
    draggedTile = null;
    hasDragReordered = false;
    if (highlightFrameId !== null) {
      cancelAnimationFrame(highlightFrameId);
      highlightFrameId = null;
    }
    listEl.classList.remove("drag-active");
    document.querySelectorAll(".shortcut-item.dragging, .shortcut-item.drop-target").forEach((node) => {
      node.classList.remove("dragging", "drop-target");
    });
  }

  function swapDuringDrag(targetTile, clientX, clientY) {
    if (!draggedTile) return;
    const fromIndex = Number(draggedTile.dataset.index);
    const nextIndex = Number(targetTile.dataset.index);
    if (Number.isNaN(fromIndex) || Number.isNaN(nextIndex)) return;
    if (fromIndex < 0 || nextIndex < 0 || fromIndex >= shortcuts.length || nextIndex >= shortcuts.length) return;
    if (fromIndex === nextIndex) return;

    [shortcuts[fromIndex], shortcuts[nextIndex]] = [shortcuts[nextIndex], shortcuts[fromIndex]];
    swapNodes(draggedTile, targetTile);
    updateShortcutIndexes();
    queueHighlightDropTarget(clientX, clientY);
    hasDragReordered = true;
  }

  function swapNodes(first, second) {
    if (!first || !second || first === second) return;
    const parent = first.parentNode;
    if (!parent || parent !== second.parentNode) return;

    const firstNext = first.nextSibling;
    const secondNext = second.nextSibling;

    if (firstNext === second) {
      parent.insertBefore(second, first);
      return;
    }
    if (secondNext === first) {
      parent.insertBefore(first, second);
      return;
    }

    parent.insertBefore(first, secondNext);
    parent.insertBefore(second, firstNext);
  }

  function updateShortcutIndexes() {
    document.querySelectorAll(".shortcut-item:not(.shortcut-item-add)").forEach((node, idx) => {
      node.dataset.index = String(idx);
    });
  }

  function highlightDropTargetAtPoint(x, y) {
    document.querySelectorAll(".shortcut-item.drop-target").forEach((node) => node.classList.remove("drop-target"));
    const previousPointerEvents = draggedTile ? draggedTile.style.pointerEvents : "";
    if (draggedTile) draggedTile.style.pointerEvents = "none";
    const pointNode = document.elementFromPoint(x, y);
    if (draggedTile) draggedTile.style.pointerEvents = previousPointerEvents;
    if (!(pointNode instanceof Element)) return;
    const tile = pointNode.closest(".shortcut-item:not(.shortcut-item-add)");
    if (tile === draggedTile) return;
    if (tile) tile.classList.add("drop-target");
  }

  function queueHighlightDropTarget(x, y) {
    if (highlightFrameId !== null) cancelAnimationFrame(highlightFrameId);
    highlightFrameId = requestAnimationFrame(() => {
      highlightFrameId = null;
      highlightDropTargetAtPoint(x, y);
    });
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
