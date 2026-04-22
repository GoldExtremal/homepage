const GOOGLE_SERVICES_MENU_MODEL = {
  title: "Google Services",
  items: [
    {
      name: "Account",
      href: "https://myaccount.google.com/",
      icon: "https://www.gstatic.com/images/branding/product/2x/avatar_circle_blue_48dp.png",
    },
    {
      name: "Drive",
      href: "https://drive.google.com/",
      icon: "https://www.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png",
    },
    {
      name: "YouTube",
      href: "https://www.youtube.com/",
      icon: "https://www.google.com/s2/favicons?domain=youtube.com&sz=128",
    },
    {
      name: "Calendar",
      href: "https://calendar.google.com/",
      icon: "https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png",
    },
    {
      name: "Meet",
      href: "https://meet.google.com/",
      icon: "https://www.gstatic.com/images/branding/product/2x/meet_2020q4_48dp.png",
    },
    {
      name: "Translate",
      href: "https://translate.google.com/",
      icon: "https://www.google.com/s2/favicons?domain=translate.google.com&sz=128",
    },
    {
      name: "Sheets",
      href: "https://docs.google.com/spreadsheets/",
      icon: "https://www.gstatic.com/images/branding/product/2x/sheets_2020q4_48dp.png",
    },
    {
      name: "Docs",
      href: "https://docs.google.com/document/",
      icon: "https://www.gstatic.com/images/branding/product/2x/docs_2020q4_48dp.png",
    },
    {
      name: "Slides",
      href: "https://docs.google.com/presentation/",
      icon: "https://www.gstatic.com/images/branding/product/2x/slides_2020q4_48dp.png",
    },
  ],
  cta: {
    text: "More from Google",
    href: "https://about.google/products/",
  },
};

export function renderGoogleServicesMenu(menuEl) {
  if (!menuEl) return;

  const titleEl = document.createElement("h3");
  titleEl.textContent = GOOGLE_SERVICES_MENU_MODEL.title;

  const gridEl = document.createElement("div");
  gridEl.className = "apps-grid";

  GOOGLE_SERVICES_MENU_MODEL.items.forEach((item) => {
    const linkEl = document.createElement("a");
    linkEl.className = "apps-tile";
    linkEl.href = item.href;

    const iconWrapEl = document.createElement("span");
    iconWrapEl.className = "apps-item-icon";

    const iconEl = document.createElement("img");
    iconEl.src = item.icon;
    iconEl.alt = "";

    const labelEl = document.createElement("span");
    labelEl.textContent = item.name;

    iconWrapEl.append(iconEl);
    linkEl.append(iconWrapEl, labelEl);
    gridEl.append(linkEl);
  });

  const ctaEl = document.createElement("a");
  ctaEl.className = "apps-more-btn";
  ctaEl.href = GOOGLE_SERVICES_MENU_MODEL.cta.href;
  ctaEl.textContent = GOOGLE_SERVICES_MENU_MODEL.cta.text;

  menuEl.replaceChildren(titleEl, gridEl, ctaEl);
}
