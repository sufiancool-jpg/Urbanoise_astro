const body = document.body;
const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav-links");
const phoneMq = window.matchMedia("(max-width: 640px)");
const forceBurgerMenu =
  body?.classList.contains("blog-index-body") || body?.classList.contains("blog-post-body");

if (body && toggle && nav) {
  const isBurgerViewport = () => forceBurgerMenu || phoneMq.matches;

  const syncToggleVisibility = () => {
    const shouldShowToggle = isBurgerViewport();
    toggle.hidden = !shouldShowToggle;
    toggle.setAttribute("aria-hidden", String(!shouldShowToggle));
    if (shouldShowToggle) {
      toggle.removeAttribute("tabindex");
      return;
    }
    toggle.setAttribute("tabindex", "-1");
  };

  const closeMenu = () => {
    body.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    body.classList.add("menu-open");
    toggle.setAttribute("aria-expanded", "true");
  };

  const toggleMenu = () => {
    if (body.classList.contains("menu-open")) {
      closeMenu();
      return;
    }
    openMenu();
  };

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isBurgerViewport()) return;
    toggleMenu();
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });

  document.addEventListener("click", (event) => {
    if (!body.classList.contains("menu-open")) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (toggle.contains(target) || nav.contains(target)) return;
    closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  const handleViewportChange = () => {
    syncToggleVisibility();
    if (!isBurgerViewport()) {
      closeMenu();
    }
  };

  if (phoneMq.addEventListener) {
    phoneMq.addEventListener("change", handleViewportChange);
  } else if (phoneMq.addListener) {
    phoneMq.addListener(handleViewportChange);
  }

  syncToggleVisibility();
  closeMenu();
}
