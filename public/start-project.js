import gsap from "./src/index.js";
import ScrollTrigger from "./src/ScrollTrigger.js";
import ScrollToPlugin from "./src/ScrollToPlugin.js";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
window.gsap = gsap;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const motionFactor = prefersReducedMotion ? 0.75 : 1;

const body = document.body;
const header = document.querySelector(".post-header");
const introSection = document.querySelector(".project-intro");
const heroTitle = introSection?.querySelector(".manifesto-hero-title");
const manifesto = introSection?.querySelector(".project-manifesto");
const manifestoTitle = introSection?.querySelector(".manifesto-title");
const manifestoSecondary = manifesto
  ? Array.from(manifesto.querySelectorAll(".manifesto-block, .manifesto-signoff"))
  : [];
const architectureWordEl = heroTitle?.querySelector("[data-architecture-word]");
const enterCta = introSection?.querySelector("[data-project-intro-cta]");
const introTextTrigger = introSection?.querySelector("[data-project-intro-trigger]");
const scrollDownCta = introSection?.querySelector("[data-project-scroll-cta]");
const sectionScrollCtas = Array.from(document.querySelectorAll("[data-section-scroll-cta]"));
const highlightLine = introSection?.querySelector(".manifesto-highlight-line");
const revealSections = Array.from(document.querySelectorAll(".service-section, .footer-page"));
const firstServiceSection = document.querySelector(".service-section");

const LOCK_CLASS = "scroll-locked";
const architectureWords = [
  "architecture",
  "architektur",
  "architettura",
  "architecture",
  "arkitektur",
  "architectuur",
  "建筑",
  "建築",
  "المعمار",
];

let scrollLockY = 0;
let autoEnterQueued = false;
let entryRequested = false;
let entered = false;
let highlightInitialized = false;
let scrollEffectsInitialized = false;
let architectureWordIndex = 0;
let architectureWordTween = null;
let architectureWordInterval = null;
let autoEnterTimeout = null;
let scrollTween = null;

const lockScroll = () => {
  if (!body) return;
  scrollLockY = window.scrollY || document.documentElement.scrollTop || 0;
  body.classList.add(LOCK_CLASS);
  body.style.position = "fixed";
  body.style.top = `-${scrollLockY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
};

const unlockScroll = () => {
  if (!body) return;
  body.classList.remove(LOCK_CLASS);
  body.style.position = "";
  body.style.top = "";
  body.style.left = "";
  body.style.right = "";
  body.style.width = "";

  const targetY = scrollLockY;
  const html = document.documentElement;
  const previousScrollBehavior = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  window.scrollTo(0, targetY);
  html.style.scrollBehavior = previousScrollBehavior;
};

const queueAutoEnter = () => {
  if (autoEnterQueued || entered || entryRequested) return;
  autoEnterQueued = true;
  autoEnterTimeout = window.setTimeout(() => {
    autoEnterTimeout = null;
    enterManifesto();
  }, 2500);
};

const animateWindowScroll = (targetY, durationSeconds) => {
  const startY = window.scrollY || document.documentElement.scrollTop || 0;
  if (Math.abs(targetY - startY) < 1) return;

  const html = document.documentElement;
  const previousScrollBehavior = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";

  scrollTween?.kill();
  scrollTween = gsap.to(window, {
    scrollTo: { y: targetY, autoKill: false },
    duration: durationSeconds,
    ease: "power2.inOut",
    overwrite: true,
    onComplete: () => {
      html.style.scrollBehavior = previousScrollBehavior;
      scrollTween = null;
    },
    onInterrupt: () => {
      html.style.scrollBehavior = previousScrollBehavior;
      scrollTween = null;
    },
  });
};

const findNextSection = (fromSection) => {
  let candidate = fromSection?.nextElementSibling || null;
  while (candidate) {
    if (candidate.matches?.(".service-section, .footer-page")) {
      return candidate;
    }
    candidate = candidate.nextElementSibling;
  }
  return null;
};

const scrollToSection = (targetSection, durationSeconds = 1.6) => {
  if (!(targetSection instanceof HTMLElement) || body.classList.contains(LOCK_CLASS)) return;

  const pageY = window.scrollY || document.documentElement.scrollTop || 0;
  const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const headerOffset = header instanceof HTMLElement ? header.getBoundingClientRect().height + 24 : 24;
  const topPadding = headerOffset + 10;
  const bottomPadding = 18;

  const sectionTitle = targetSection.querySelector(".film-title");
  const primaryCopy =
    targetSection.querySelector(".film-copy, .consultation-copy, .footer-inner") || targetSection;
  const nextCta = targetSection.querySelector("[data-section-scroll-cta]");
  const topAnchor = sectionTitle instanceof HTMLElement ? sectionTitle : primaryCopy;

  const topAnchorTopY = topAnchor.getBoundingClientRect().top + pageY;
  const copyBottomY = primaryCopy.getBoundingClientRect().bottom + pageY;
  const ctaBottomY = nextCta instanceof HTMLElement ? nextCta.getBoundingClientRect().bottom + pageY : copyBottomY;
  const blockBottomY = Math.max(copyBottomY, ctaBottomY);

  const viewportBottomAtTopAnchor = topAnchorTopY - topPadding + window.innerHeight - bottomPadding;
  let targetY = topAnchorTopY - topPadding;

  // If the full content block fits, keep title visible and shift slightly up to keep CTA in view too.
  if (blockBottomY <= viewportBottomAtTopAnchor) {
    const extraSpace = viewportBottomAtTopAnchor - blockBottomY;
    targetY -= Math.min(extraSpace * 0.3, 18);
  }

  const clampedTargetY = Math.min(maxY, Math.max(0, targetY));
  animateWindowScroll(clampedTargetY, durationSeconds);
};

const scrollToFirstService = () => {
  if (!(firstServiceSection instanceof HTMLElement) || !entered || body.classList.contains(LOCK_CLASS)) return;
  scrollToSection(firstServiceSection, 1.6);
};

const setArchitectureWord = (nextWord) => {
  if (!architectureWordEl) return;
  if (prefersReducedMotion) {
    architectureWordEl.textContent = nextWord;
    return;
  }
  architectureWordTween?.kill();
  architectureWordTween = gsap.timeline();
  architectureWordTween
    .to(architectureWordEl, {
      autoAlpha: 0,
      y: -2,
      duration: 0.16,
      ease: "power1.in",
    })
    .add(() => {
      architectureWordEl.textContent = nextWord;
    })
    .to(architectureWordEl, {
      autoAlpha: 1,
      y: 0,
      duration: 0.2,
      ease: "power1.out",
    });
};

const initArchitectureWordCycle = () => {
  if (!architectureWordEl || architectureWords.length < 2) return;
  architectureWordIndex = 0;
  architectureWordEl.textContent = architectureWords[architectureWordIndex];
  gsap.set(architectureWordEl, { autoAlpha: 1, y: 0 });

  architectureWordInterval = window.setInterval(() => {
    architectureWordIndex = (architectureWordIndex + 1) % architectureWords.length;
    setArchitectureWord(architectureWords[architectureWordIndex]);
  }, 1750);
};

const stopArchitectureWordCycle = () => {
  if (architectureWordInterval) {
    window.clearInterval(architectureWordInterval);
    architectureWordInterval = null;
  }
  architectureWordTween?.kill();
  architectureWordTween = null;
};

const measureTitleMorph = () => {
  if (!(heroTitle instanceof HTMLElement) || !(manifestoTitle instanceof HTMLElement)) {
    return null;
  }

  let restore = null;
  if (manifesto) {
    restore = {
      y: Number(gsap.getProperty(manifesto, "y")) || 0,
      scale: Number(gsap.getProperty(manifesto, "scale")) || 1,
    };
    gsap.set(manifesto, { y: 0, scale: 1 });
  }

  const heroRect = heroTitle.getBoundingClientRect();
  const targetRect = manifestoTitle.getBoundingClientRect();

  if (manifesto && restore) {
    gsap.set(manifesto, restore);
  }

  const heroCenterX = heroRect.left + heroRect.width * 0.5;
  const heroCenterY = heroRect.top + heroRect.height * 0.5;
  const targetCenterX = targetRect.left + targetRect.width * 0.5;
  const targetCenterY = targetRect.top + targetRect.height * 0.5;
  const scaleFromHeight = heroRect.height > 0 ? targetRect.height / heroRect.height : 1;
  const scaleFromWidth = heroRect.width > 0 ? targetRect.width / heroRect.width : 1;
  const scale = Math.min(scaleFromHeight, scaleFromWidth);

  return {
    x: targetCenterX - heroCenterX,
    y: targetCenterY - heroCenterY,
    scale: Number(scale.toFixed(4)),
  };
};

const initHighlightAnimation = () => {
  if (highlightInitialized || !highlightLine) return;
  highlightInitialized = true;

  gsap.set(highlightLine, { "--line-fill": "0%" });
  gsap.to(highlightLine, {
    "--line-fill": "100%",
    ease: "none",
    scrollTrigger: {
      trigger: introSection || highlightLine,
      start: "top top",
      end: "+=220",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
};

const initScrollSectionEffects = () => {
  if (scrollEffectsInitialized) return;
  scrollEffectsInitialized = true;

  if (introSection) {
    const petrolColor = getComputedStyle(body).getPropertyValue("--pantone-8245c").trim() || "#3f8484";
    gsap.fromTo(
      introSection,
      {
        backgroundColor: petrolColor,
      },
      {
        backgroundColor: "#000000",
        ease: "none",
        scrollTrigger: {
          trigger: introSection,
          start: "center top",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    );
  }

  revealSections.forEach((section) => {
    const isFooter = section.classList.contains("footer-page");
    const revealTarget = isFooter
      ? section.querySelector(".footer-inner") || section
      : section.querySelector(".film-inner") || section;

    if (!revealTarget) return;
    const yIn = prefersReducedMotion ? 0 : 34;
    const yOut = prefersReducedMotion ? 0 : -10;
    const minAlpha = isFooter ? 0.82 : 0.68;

    gsap.set(revealTarget, {
      autoAlpha: 0,
      y: yIn,
    });

    const sectionTl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: section,
        start: "top 95%",
        end: "bottom 5%",
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    sectionTl
      .to(revealTarget, {
        autoAlpha: 1,
        y: 0,
        duration: 0.34,
      })
      .to(revealTarget, {
        autoAlpha: 1,
        y: 0,
        duration: 0.38,
      })
      .to(revealTarget, {
        autoAlpha: minAlpha,
        y: yOut,
        duration: 0.28,
      });
  });
};

const enterManifesto = () => {
  if (entered || entryRequested) return;
  entryRequested = true;
  if (autoEnterTimeout) {
    window.clearTimeout(autoEnterTimeout);
    autoEnterTimeout = null;
  }

  const ctaExitDuration = 0.38 * motionFactor;
  const titleMorphDuration = 1.62 * motionFactor;
  const contentRevealDuration = 1.6 * motionFactor;
  const headerRevealDuration = 0.42 * motionFactor;
  const titleMorph = measureTitleMorph();
  const bodyRevealStart = titleMorph
    ? titleMorphDuration + 0.04 * motionFactor
    : 0.18 * motionFactor;
  const headerRevealStart = Math.max(
    bodyRevealStart,
    bodyRevealStart + contentRevealDuration - headerRevealDuration * 1.05,
  );

  const tl = gsap.timeline({
    defaults: { ease: "power2.out" },
    onComplete: () => {
      entered = true;
      unlockScroll();
      if (scrollDownCta) {
        gsap.set(scrollDownCta, { pointerEvents: "auto" });
      }
      initHighlightAnimation();
      initScrollSectionEffects();
      ScrollTrigger.refresh();

      const focusTarget = manifesto?.querySelector(".manifesto-block p");
      if (focusTarget instanceof HTMLElement) {
        focusTarget.setAttribute("tabindex", "-1");
        focusTarget.focus({ preventScroll: true });
        focusTarget.removeAttribute("tabindex");
      }
    },
  });

  if (enterCta) {
    tl.to(
      enterCta,
      {
        autoAlpha: 0,
        y: -10,
        duration: ctaExitDuration,
      },
      0,
    );
  }

  if (titleMorph && heroTitle) {
    tl.to(
      heroTitle,
      {
        x: titleMorph.x,
        y: titleMorph.y,
        scale: titleMorph.scale,
        autoAlpha: 1,
        ease: "power2.inOut",
        duration: titleMorphDuration,
      },
      0,
    );
    tl.set(
      heroTitle,
      {
        pointerEvents: "none",
        cursor: "default",
      },
      titleMorphDuration,
    );
  } else if (heroTitle) {
    tl.to(
      heroTitle,
      {
        autoAlpha: 0,
        duration: 0.45 * motionFactor,
      },
      0,
    );
  }

  if (manifesto) {
    tl.set(
      manifesto,
      {
        autoAlpha: 1,
        pointerEvents: "auto",
      },
      bodyRevealStart,
    );
  }

  if (manifestoSecondary.length) {
    tl.to(
      manifestoSecondary,
      {
        autoAlpha: 1,
        y: 0,
        duration: contentRevealDuration,
        stagger: 0.03,
      },
      bodyRevealStart + 0.02 * motionFactor,
    );
  }

  if (scrollDownCta) {
    tl.to(
      scrollDownCta,
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.46 * motionFactor,
      },
      bodyRevealStart + contentRevealDuration * 0.72,
    );
  }

  if (header) {
    tl.to(
      header,
      {
        autoAlpha: 1,
        y: 0,
        pointerEvents: "auto",
        duration: headerRevealDuration,
        overwrite: true,
      },
      headerRevealStart,
    );
  }
};

if (!body || !introSection || !heroTitle || !manifesto) {
  // No-op when required intro elements are missing.
} else {
  window.scrollTo(0, 0);
  scrollLockY = 0;
  lockScroll();

  gsap.set(manifesto, {
    autoAlpha: 0,
    pointerEvents: "none",
  });
  if (manifestoSecondary.length) {
    gsap.set(manifestoSecondary, { autoAlpha: 0, y: 24 });
  }
  gsap.set(heroTitle, { autoAlpha: 1, x: 0, y: 0, scale: 1, transformOrigin: "50% 50%" });
  if (enterCta) {
    gsap.set(enterCta, { autoAlpha: 0, y: 16 });
  }
  if (scrollDownCta) {
    gsap.set(scrollDownCta, { autoAlpha: 0, y: 10, pointerEvents: "none" });
  }
  initArchitectureWordCycle();

  if (header) {
    gsap.set(header, { autoAlpha: 0, y: -12, pointerEvents: "none" });
  }

  window.addEventListener("load", queueAutoEnter, { once: true });
  setTimeout(queueAutoEnter, 900);

  enterCta?.addEventListener("click", enterManifesto);
  introTextTrigger?.addEventListener("click", enterManifesto);
  scrollDownCta?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    scrollToFirstService();
  });
  sectionScrollCtas.forEach((cta) => {
    cta.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!entered) return;
      const currentSection = cta.closest(".service-section");
      if (!(currentSection instanceof HTMLElement)) return;
      const nextSection = findNextSection(currentSection);
      if (!nextSection) return;
      scrollToSection(nextSection, 1.6);
    });
  });
}
