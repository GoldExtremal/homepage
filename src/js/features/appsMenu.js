export function initAppsMenu({ appsWrapEl, appsToggleEl }) {
  appsToggleEl.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = appsWrapEl.classList.toggle("open");
    appsToggleEl.setAttribute("aria-expanded", String(isOpen));
  });

  function closeAppsMenu() {
    appsWrapEl.classList.remove("open");
    appsToggleEl.setAttribute("aria-expanded", "false");
  }

  return {
    closeAppsMenu,
    containsTarget(target) {
      return target instanceof Element && Boolean(target.closest(".apps-wrap"));
    },
  };
}
