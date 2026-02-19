import gsap from "./src/index.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const motionFactor = prefersReducedMotion ? 0.75 : 1;
const EXIT_FADE_DURATION = prefersReducedMotion ? 0.2 : 0.5 * motionFactor;
const EXIT_SHELL_DURATION = prefersReducedMotion ? 0.22 : 0.78 * motionFactor;
const ENTRY_DURATION = prefersReducedMotion ? 0.2 : 0.62 * motionFactor;
const NAVIGATE_DELAY = prefersReducedMotion ? 0 : 170;
const ENTRY_FLAG = "urbanoise:page-transition-entry";

let transitionInFlight = false;
const root = document.documentElement;
const prefetchedUrls = new Set();

const markPendingEntry = () => {
  try {
    window.sessionStorage.setItem(ENTRY_FLAG, "1");
  } catch (_error) {
    // Ignore storage failures (private mode, disabled storage, etc.).
  }
};

const consumePendingEntry = () => {
  try {
    const flagged = window.sessionStorage.getItem(ENTRY_FLAG) === "1";
    if (flagged) {
      window.sessionStorage.removeItem(ENTRY_FLAG);
    }
    return flagged;
  } catch (_error) {
    return false;
  }
};

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

const resetOverlay = () => {
  const overlay = ensureOverlay();
  gsap.killTweensOf(overlay);
  gsap.set(overlay, { autoAlpha: 0, yPercent: 0, scale: 1, borderRadius: 0, clearProps: "transform,borderRadius" });
};

const runEntryTransition = () => {
  const overlay = ensureOverlay();
  gsap.killTweensOf(overlay);
  gsap.set(overlay, {
    autoAlpha: 1,
    yPercent: 0,
    scale: 1,
    borderRadius: 0,
    transformOrigin: "center center",
  });
  gsap.to(overlay, {
    autoAlpha: 0,
    yPercent: 12,
    scale: 0.985,
    duration: ENTRY_DURATION,
    ease: "power2.in",
    overwrite: true,
    onComplete: () => {
      gsap.set(overlay, { clearProps: "transform,borderRadius" });
    },
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

const prefetchUrl = (url) => {
  if (!(url instanceof URL)) return;
  if (url.origin !== window.location.origin) return;
  if (prefetchedUrls.has(url.href)) return;
  prefetchedUrls.add(url.href);

  const prefetchTag = document.createElement("link");
  prefetchTag.rel = "prefetch";
  prefetchTag.as = "document";
  prefetchTag.href = url.href;
  document.head?.appendChild(prefetchTag);
};

const attachLinkPrefetch = () => {
  const anchors = document.querySelectorAll("a[href]");
  anchors.forEach((anchor) => {
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (anchor.dataset.prefetchBound === "1") return;
    anchor.dataset.prefetchBound = "1";
    const triggerPrefetch = () => {
      const url = getNavigationUrl(anchor);
      if (!url) return;
      prefetchUrl(url);
    };
    anchor.addEventListener("pointerenter", triggerPrefetch, { once: true });
    anchor.addEventListener("focus", triggerPrefetch, { once: true });
    anchor.addEventListener("touchstart", triggerPrefetch, { once: true, passive: true });
  });
};

const warmCommonRoutes = () => {
  ["/", "/about-us/", "/start-a-project/"].forEach((path) => {
    const url = new URL(path, window.location.origin);
    if (url.pathname === window.location.pathname) return;
    prefetchUrl(url);
  });
};

const getFadeTargets = (overlay) =>
  Array.from(document.body?.children ?? []).filter((node) => {
    if (!(node instanceof HTMLElement)) return false;
    if (node === overlay) return false;
    if (node.classList.contains("instant-project-shell")) return false;
    if (node.tagName === "SCRIPT") return false;
    if (node.classList.contains("page-transition-overlay")) return false;
    return true;
  });

const runExitTransition = (url) => {
  if (transitionInFlight) return;
  transitionInFlight = true;
  prefetchUrl(url);
  let didNavigate = false;
  const navigateToTarget = () => {
    if (didNavigate) return;
    didNavigate = true;
    markPendingEntry();
    window.location.assign(url.href);
  };

  const overlay = ensureOverlay();
  const fadeTargets = getFadeTargets(overlay);
  gsap.killTweensOf([...fadeTargets, overlay]);
  gsap.set(overlay, {
    autoAlpha: 0,
    yPercent: 120,
    scale: 0.7,
    borderRadius: 26,
    transformOrigin: "center center",
  });

  if (fadeTargets.length) {
    gsap.to(fadeTargets, {
      autoAlpha: 0,
      y: -10,
      duration: EXIT_FADE_DURATION,
      ease: "power3.out",
      stagger: 0.03,
      overwrite: true,
    });
  }

  gsap.fromTo(
    overlay,
    {
      autoAlpha: 0,
      yPercent: 120,
      scale: 0.7,
      borderRadius: 26,
      transformOrigin: "center center",
    },
    {
      autoAlpha: 1,
      yPercent: 0,
      scale: 1,
      borderRadius: 0,
      duration: EXIT_SHELL_DURATION,
      ease: "power3.inOut",
      overwrite: true,
      onComplete: () => {
        navigateToTarget();
      },
    }
  );

  window.setTimeout(navigateToTarget, NAVIGATE_DELAY);
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

window.addEventListener("pageshow", (event) => {
  transitionInFlight = false;
  root.classList.remove("page-transition-entry");
  if (event.persisted) {
    resetOverlay();
  }
});

if (consumePendingEntry()) {
  runEntryTransition();
} else {
  resetOverlay();
}

root.classList.remove("page-transition-entry");
attachLinkPrefetch();
warmCommonRoutes();
