import gsap from "./src/index.js";

const swap = document.querySelector("[data-about-swap]");
const photo = swap?.querySelector("[data-about-photo]");
const copy = swap?.querySelector("[data-about-copy]");
const cta = swap?.querySelector(".about-us-hover-cta");
const hoverCapableQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
const compactViewportQuery = window.matchMedia("(max-width: 900px)");

if (!swap || !photo || !copy) {
  // No-op when markup is absent.
} else {
  const prefersReducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeTween;
  let isBound = false;
  let isTouchBound = false;
  let isRevealed = false;
  const shouldUseTouchMode = () => !hoverCapableQuery.matches;
  const shouldExpandInHoverMode = () => hoverCapableQuery.matches && compactViewportQuery.matches;

  const getPhotoHeight = () => photo.getBoundingClientRect().height;
  const getCopyHeight = () => Math.ceil(copy.scrollHeight);
  const getExpandedHeight = () => Math.max(getPhotoHeight(), getCopyHeight() + 8);

  const revealText = () => {
    activeTween?.kill();

    if (prefersReducedMotionQuery.matches) {
      if (shouldExpandInHoverMode()) {
        gsap.set(swap, { height: getExpandedHeight() });
      }
      gsap.set(photo, { autoAlpha: 0 });
      gsap.set(copy, { autoAlpha: 1 });
      return;
    }

    activeTween = gsap.timeline({ defaults: { duration: 0.45, ease: "power2.out" } });
    if (shouldExpandInHoverMode()) {
      activeTween.to(swap, { height: getExpandedHeight(), duration: 0.35 }, 0);
    }
    activeTween.to(photo, { autoAlpha: 0 }, 0).to(copy, { autoAlpha: 1 }, 0);
  };

  const revealPhoto = () => {
    activeTween?.kill();

    if (prefersReducedMotionQuery.matches) {
      if (shouldExpandInHoverMode()) {
        gsap.set(swap, { height: getPhotoHeight() });
      } else {
        gsap.set(swap, { clearProps: "height" });
      }
      gsap.set(photo, { autoAlpha: 1 });
      gsap.set(copy, { autoAlpha: 0 });
      return;
    }

    activeTween = gsap.timeline({ defaults: { duration: 0.45, ease: "power2.out" } });
    if (shouldExpandInHoverMode()) {
      activeTween.to(swap, { height: getPhotoHeight(), duration: 0.35 }, 0);
    } else {
      activeTween.set(swap, { clearProps: "height" }, 0);
    }
    activeTween.to(photo, { autoAlpha: 1 }, 0).to(copy, { autoAlpha: 0 }, 0);
  };

  const bindEvents = () => {
    if (isBound) {
      return;
    }
    swap.addEventListener("pointerenter", revealText);
    swap.addEventListener("pointerleave", revealPhoto);
    swap.addEventListener("focusin", revealText);
    swap.addEventListener("focusout", revealPhoto);
    isBound = true;
  };

  const unbindEvents = () => {
    if (!isBound) {
      return;
    }
    swap.removeEventListener("pointerenter", revealText);
    swap.removeEventListener("pointerleave", revealPhoto);
    swap.removeEventListener("focusin", revealText);
    swap.removeEventListener("focusout", revealPhoto);
    isBound = false;
  };

  const revealTextInstant = () => {
    isRevealed = true;
    swap.classList.add("is-revealed");
    gsap.set(swap, { height: getExpandedHeight() });
    gsap.set(photo, { autoAlpha: 0 });
    gsap.set(copy, { autoAlpha: 1 });
  };

  const revealPhotoInstant = () => {
    isRevealed = false;
    swap.classList.remove("is-revealed");
    gsap.set(swap, { height: getPhotoHeight() });
    gsap.set(photo, { autoAlpha: 1 });
    gsap.set(copy, { autoAlpha: 0 });
  };

  const toggleTouchReveal = () => {
    activeTween?.kill();
    const collapsedHeight = getPhotoHeight();
    const expandedHeight = getExpandedHeight();

    if (isRevealed) {
      isRevealed = false;
      swap.classList.remove("is-revealed");
      activeTween = gsap.timeline({ defaults: { ease: "power2.out" } });
      activeTween
        .to(copy, { autoAlpha: 0, duration: 0.2 }, 0)
        .to(photo, { autoAlpha: 1, duration: 0.2 }, 0)
        .to(swap, { height: collapsedHeight, duration: 0.35 }, 0.06);
      return;
    }

    isRevealed = true;
    swap.classList.add("is-revealed");
    activeTween = gsap.timeline({ defaults: { ease: "power2.out" } });
    activeTween
      .to(swap, { height: expandedHeight, duration: 0.35 }, 0)
      .to(photo, { autoAlpha: 0, duration: 0.25 }, 0.3)
      .to(copy, { autoAlpha: 1, duration: 0.25 }, 0.3);
  };

  const bindTouchEvents = () => {
    if (isTouchBound) {
      return;
    }
    swap.addEventListener("click", toggleTouchReveal);
    isTouchBound = true;
  };

  const unbindTouchEvents = () => {
    if (!isTouchBound) {
      return;
    }
    swap.removeEventListener("click", toggleTouchReveal);
    isTouchBound = false;
  };

  const syncMode = () => {
    activeTween?.kill();

    if (!shouldUseTouchMode()) {
      unbindTouchEvents();
      swap.classList.remove("is-touch");
      if (cta) {
        cta.textContent = "Hover to reveal";
      }
      if (shouldExpandInHoverMode()) {
        gsap.set(swap, { height: getPhotoHeight() });
      } else {
        gsap.set(swap, { clearProps: "height" });
      }
      gsap.set(photo, { autoAlpha: 1 });
      gsap.set(copy, { autoAlpha: 0 });
      bindEvents();
      return;
    }

    unbindEvents();
    swap.classList.add("is-touch");
    if (cta) {
      cta.textContent = "Tap to reveal";
    }
    revealPhotoInstant();
    bindTouchEvents();
  };

  syncMode();
  window.addEventListener("resize", () => {
    if (shouldUseTouchMode()) {
      if (isRevealed) {
        gsap.set(swap, { height: getExpandedHeight() });
        return;
      }
      gsap.set(swap, { height: getPhotoHeight() });
      return;
    }

    if (!shouldExpandInHoverMode()) {
      gsap.set(swap, { clearProps: "height" });
      return;
    }

    const hovering = swap.matches(":hover") || swap.matches(":focus-within");
    gsap.set(swap, { height: hovering ? getExpandedHeight() : getPhotoHeight() });
  });
  if (typeof hoverCapableQuery.addEventListener === "function") {
    hoverCapableQuery.addEventListener("change", syncMode);
    compactViewportQuery.addEventListener("change", syncMode);
  } else if (typeof hoverCapableQuery.addListener === "function") {
    hoverCapableQuery.addListener(syncMode);
    compactViewportQuery.addListener(syncMode);
  }
}
