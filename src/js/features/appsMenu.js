export function initAppsMenu({ appsWrapEl, appsToggleEl, appsMenuEl }) {
  if (!appsToggleEl || !appsMenuEl) {
    return {
      closeAppsMenu() {},
      containsTarget() {
        return false;
      },
    };
  }

  appsToggleEl.addEventListener("click", (event) => {
    event.stopPropagation();
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
