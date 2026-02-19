import gsap from "./src/index.js";
import ScrollTrigger from "./src/ScrollTrigger.js";
import ScrollToPlugin from "./src/ScrollToPlugin.js";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
window.gsap = gsap;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const body = document.body;
const header = document.querySelector(".post-header");
const introSection = document.querySelector(".project-intro");
const heroTitle = introSection?.querySelector(".manifesto-hero-title");
const architectureWordEl = heroTitle?.querySelector("[data-architecture-word]");
const manifesto = introSection?.querySelector(".project-manifesto");
const manifestoSecondary = manifesto
  ? Array.from(manifesto.querySelectorAll(".manifesto-block, .manifesto-signoff"))
  : [];
const scrollDownCta = introSection?.querySelector("[data-project-scroll-cta]");
const sectionScrollCtas = Array.from(document.querySelectorAll("[data-section-scroll-cta]"));
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

let scrollEffectsInitialized = false;
let scrollTween = null;
let wheelDeltaAccumulator = 0;
let touchStartY = null;
let touchGestureHandled = false;
let snapSettleTimeout = null;
let architectureWordIndex = 0;
let architectureWordTween = null;
let architectureWordInterval = null;

const animateWindowScroll = (targetY, durationSeconds) => {
  const startY = window.scrollY || document.documentElement.scrollTop || 0;
  if (Math.abs(targetY - startY) < 1) return;

  const html = document.documentElement;
  const previousScrollBehavior = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";

  if (snapSettleTimeout) {
    window.clearTimeout(snapSettleTimeout);
    snapSettleTimeout = null;
  }
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

const getCurrentScrollY = () => window.scrollY || document.documentElement.scrollTop || 0;

const isEditableTarget = (target) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName));

const getSectionTargetY = (targetSection) => {
  if (!(targetSection instanceof HTMLElement)) return null;

  if (targetSection === introSection) {
    return 0;
  }

  const pageY = getCurrentScrollY();
  const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const headerOffset = header instanceof HTMLElement ? header.getBoundingClientRect().height + 24 : 24;
  const topPadding = headerOffset + 10;
  const bottomPadding = 18;
  const ctaBottomViewportPadding = 14;

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

  if (blockBottomY <= viewportBottomAtTopAnchor) {
    const extraSpace = viewportBottomAtTopAnchor - blockBottomY;
    targetY -= Math.min(extraSpace * 0.3, 18);
  }

  if (nextCta instanceof HTMLElement) {
    const ctaBottomAtTarget = ctaBottomY - targetY;
    const maxCtaBottom = window.innerHeight - ctaBottomViewportPadding;
    if (ctaBottomAtTarget > maxCtaBottom) {
      targetY += ctaBottomAtTarget - maxCtaBottom;
    }
  }

  return Math.min(maxY, Math.max(0, targetY));
};

const navigableSections = [introSection, ...revealSections].filter((section) => section instanceof HTMLElement);

const getClosestSectionIndex = () => {
  const currentY = getCurrentScrollY();
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  navigableSections.forEach((section, index) => {
    const targetY = getSectionTargetY(section);
    if (typeof targetY !== "number") return;
    const distance = Math.abs(targetY - currentY);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
};

const scrollToSectionIndex = (sectionIndex, durationSeconds = 1.1) => {
  if (body.classList.contains(LOCK_CLASS) || scrollTween || !navigableSections.length) return;
  const clampedIndex = Math.max(0, Math.min(navigableSections.length - 1, sectionIndex));
  scrollToSection(navigableSections[clampedIndex], durationSeconds);
};

const stepSection = (direction, durationSeconds = 1.1) => {
  if (!Number.isFinite(direction) || direction === 0 || !navigableSections.length) return;
  const currentIndex = getClosestSectionIndex();
  const nextIndex = Math.max(0, Math.min(navigableSections.length - 1, currentIndex + direction));
  if (nextIndex === currentIndex) return;
  scrollToSectionIndex(nextIndex, durationSeconds);
};

const handleWheelSectionSnap = (event) => {
  if (body.classList.contains(LOCK_CLASS)) return;
  if (Math.abs(event.deltaY) < 1) return;
  event.preventDefault();
  event.stopPropagation();
  if (scrollTween) return;

  wheelDeltaAccumulator += event.deltaY;
  if (Math.abs(wheelDeltaAccumulator) < 22) return;
  const direction = wheelDeltaAccumulator > 0 ? 1 : -1;
  wheelDeltaAccumulator = 0;
  stepSection(direction, 1.05);
};

const handleTouchStartSectionSnap = (event) => {
  if (!event.touches.length) return;
  touchStartY = event.touches[0].clientY;
  touchGestureHandled = false;
};

const handleTouchMoveSectionSnap = (event) => {
  if (body.classList.contains(LOCK_CLASS)) return;
  if (!event.touches.length || touchStartY === null) return;

  const currentY = event.touches[0].clientY;
  const deltaY = touchStartY - currentY;

  event.preventDefault();
  event.stopPropagation();
  if (touchGestureHandled || scrollTween || Math.abs(deltaY) < 28) return;

  touchGestureHandled = true;
  stepSection(deltaY > 0 ? 1 : -1, 1.05);
};

const handleTouchEndSectionSnap = () => {
  touchStartY = null;
  touchGestureHandled = false;
};

const handleKeydownSectionSnap = (event) => {
  if (body.classList.contains(LOCK_CLASS)) return;
  if (isEditableTarget(event.target)) return;
  if (scrollTween) {
    event.preventDefault();
    return;
  }

  const key = event.key;
  const isDown = key === "ArrowDown" || key === "PageDown" || key === "End" || (key === " " && !event.shiftKey);
  const isUp = key === "ArrowUp" || key === "PageUp" || key === "Home" || (key === " " && event.shiftKey);
  if (!isDown && !isUp) return;

  event.preventDefault();
  event.stopPropagation();
  stepSection(isDown ? 1 : -1, 1.05);
};

const scheduleSnapToClosestSection = () => {
  if (body.classList.contains(LOCK_CLASS) || scrollTween || !navigableSections.length) return;
  if (snapSettleTimeout) {
    window.clearTimeout(snapSettleTimeout);
  }
  snapSettleTimeout = window.setTimeout(() => {
    snapSettleTimeout = null;
    if (scrollTween || body.classList.contains(LOCK_CLASS)) return;
    scrollToSectionIndex(getClosestSectionIndex(), 0.7);
  }, 120);
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
  const targetY = getSectionTargetY(targetSection);
  if (typeof targetY !== "number") return;
  animateWindowScroll(targetY, durationSeconds);
};

const scrollToFirstService = () => {
  if (!(firstServiceSection instanceof HTMLElement) || body.classList.contains(LOCK_CLASS)) return;
  scrollToSection(firstServiceSection, 1.6);
};

const removePhotoNote = () => {
  const photoNote = document.querySelector(".photo-section .film-copy-note");
  if (!(photoNote instanceof HTMLElement)) return;
  photoNote.remove();
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
  architectureWordInterval && window.clearInterval(architectureWordInterval);
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

if (!body || !introSection || !manifesto) {
  // No-op when required intro elements are missing.
} else {
  window.scrollTo(0, 0);
  wheelDeltaAccumulator = 0;
  removePhotoNote();

  gsap.set(manifesto, {
    autoAlpha: 1,
    pointerEvents: "auto",
  });
  if (manifestoSecondary.length) {
    gsap.set(manifestoSecondary, { autoAlpha: 1, y: 0 });
  }
  if (heroTitle) {
    gsap.set(heroTitle, {
      autoAlpha: 1,
      xPercent: -50,
      yPercent: -50,
      x: 0,
      y: 0,
      scale: 0.85,
      transformOrigin: "50% 50%",
      pointerEvents: "none",
      cursor: "default",
    });
  }
  initArchitectureWordCycle();
  if (scrollDownCta) {
    gsap.set(scrollDownCta, { autoAlpha: 1, y: 0, pointerEvents: "auto" });
  }
  if (header) {
    gsap.set(header, { autoAlpha: 1, y: 0, pointerEvents: "auto" });
  }
  initScrollSectionEffects();
  ScrollTrigger.refresh();

  window.addEventListener("scroll", scheduleSnapToClosestSection, { passive: true });
  window.addEventListener("wheel", handleWheelSectionSnap, { passive: false });
  window.addEventListener("touchstart", handleTouchStartSectionSnap, { passive: true });
  window.addEventListener("touchmove", handleTouchMoveSectionSnap, { passive: false });
  window.addEventListener("touchend", handleTouchEndSectionSnap, { passive: true });
  window.addEventListener("keydown", handleKeydownSectionSnap);
  window.addEventListener("beforeunload", stopArchitectureWordCycle, { once: true });

  scrollDownCta?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    scrollToFirstService();
  });
  sectionScrollCtas.forEach((cta) => {
    cta.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const currentSection = cta.closest(".service-section");
      if (!(currentSection instanceof HTMLElement)) return;
      const nextSection = findNextSection(currentSection);
      if (!nextSection) return;
      scrollToSection(nextSection, 1.6);
    });
  });
}
