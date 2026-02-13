import gsap from "./src/index.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ENTRY_DURATION = prefersReducedMotion ? 0.2 : 0.55;
const EXIT_DURATION = prefersReducedMotion ? 0.2 : 0.45;

let transitionInFlight = false;

const ensureOverlay = () => {
  let overlay = document.querySelector(".page-transition-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "page-transition-overlay";
    overlay.setAttribute("aria-hidden", "true");
    document.body?.prepend(overlay);
  }
  return overlay;
};

const runEntryTransition = () => {
  const overlay = ensureOverlay();
  gsap.killTweensOf(overlay);
  gsap.set(overlay, { autoAlpha: 1 });
  gsap.to(overlay, {
    autoAlpha: 0,
    duration: ENTRY_DURATION,
    ease: "power2.out",
  });
};

const getNavigationUrl = (anchor) => {
  const rawHref = anchor.getAttribute("href");
  if (!rawHref) return null;
  if (rawHref.startsWith("#")) return null;
  if (/^(mailto:|tel:|javascript:)/i.test(rawHref)) return null;
  if (anchor.hasAttribute("download")) return null;
  if (anchor.target && anchor.target !== "_self") return null;

  const url = new URL(rawHref, window.location.href);
  if (url.origin !== window.location.origin) return null;
  const pointsToFile = /\/[^/]+\.[^/]+$/.test(url.pathname);
  if (!pointsToFile && url.pathname !== "/" && !url.pathname.endsWith("/")) {
    url.pathname = `${url.pathname}/`;
  }
  if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash === window.location.hash) {
    return null;
  }

  return url;
};

const runExitTransition = (url) => {
  if (transitionInFlight) return;
  transitionInFlight = true;

  const overlay = ensureOverlay();
  gsap.killTweensOf(overlay);
  gsap.to(overlay, {
    autoAlpha: 1,
    duration: EXIT_DURATION,
    ease: "power2.inOut",
    onComplete: () => {
      window.location.assign(url.href);
    },
  });
};

document.addEventListener("click", (event) => {
  if (event.defaultPrevented) return;
  if (event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const anchor = event.target instanceof Element ? event.target.closest("a") : null;
  if (!anchor) return;

  const url = getNavigationUrl(anchor);
  if (!url) return;

  event.preventDefault();
  runExitTransition(url);
});

window.addEventListener("pageshow", () => {
  transitionInFlight = false;
  runEntryTransition();
});

runEntryTransition();
