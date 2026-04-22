export function initAppsMenu({ appsWrapEl, appsToggleEl, appsMenuEl, onFirstOpen }) {
  if (!appsToggleEl || !appsMenuEl) {
    return {
      closeAppsMenu() {},
      containsTarget() {
        return false;
      },
    };
  }

  let hasRendered = false;

  appsToggleEl.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!hasRendered && typeof onFirstOpen === "function") {
      onFirstOpen();
      hasRendered = true;
    }
    const isOpen = appsMenuEl.classList.toggle("open");
    appsToggleEl.setAttribute("aria-expanded", String(isOpen));
  });

  function closeAppsMenu() {
    appsMenuEl.classList.remove("open");
    appsToggleEl.setAttribute("aria-expanded", "false");
  }

  return {
    closeAppsMenu,
    containsTarget(target) {
      return target instanceof Element && ((appsWrapEl?.contains(target) ?? false) || appsMenuEl.contains(target));
    },
  };
}
