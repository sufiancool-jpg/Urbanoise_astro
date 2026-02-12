import { gsap } from "./src/index.js";
import Flip from "./src/Flip.js";
import ScrollToPlugin from "./src/ScrollToPlugin.js";

gsap.registerPlugin(Flip, ScrollToPlugin);
window.gsap = gsap;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const motionFactor = prefersReducedMotion ? 0.75 : 1;
const phoneMq = window.matchMedia("(max-width: 480px)");

const body = document.body;
const header = document.querySelector(".site-header");
const brand = document.querySelector(".site-brand");

const logo = document.querySelector(".logo");
const logoWrap = logo ? logo.querySelector(".logo-wrap") : null;
const logoLetters = logo ? [...logo.querySelectorAll(".logo-letter")] : [];
const lettersUrb = logo ? [...logo.querySelectorAll(".logo-letter-urb")] : [];
const lettersAno = logo ? [...logo.querySelectorAll(".logo-letter-ano")] : [];
const lettersIse = logo ? [...logo.querySelectorAll(".logo-letter-ise")] : [];
const logoButton = document.querySelector(".logo-button");

const stage = document.querySelector(".stage");
const stageOverlay = document.querySelector(".stage-overlay");
const enterCta = document.querySelector(".enter-cta");

const videoFrame = document.querySelector(".video-frame");
const video = document.querySelector(".hero-video");
const fallback = document.querySelector(".video-fallback");
const scrollBumper = document.querySelector(".scroll-bumper");

const aboutSection = document.querySelector("#about");
const aboutLink = document.querySelector('a[href="#about"]');
const footerBackLink = document.querySelector('a[href="#stage"]');
const mockupSection = document.querySelector("#mockup");
const articlesSection = document.querySelector(".articles-section");
const newsletterForm = document.querySelector(".footer-newsletter-form");
const newsletterStatus = document.querySelector(".footer-newsletter-status");
const articleOverlay = document.querySelector(".article-overlay");
const articleFrame = document.querySelector(".article-frame");
const articleFrameBody = document.querySelector(".article-frame-body");
const articleContent = document.querySelector(".article-content");
const articleLoading = document.querySelector(".article-loading");
const articleClose = document.querySelector(".article-close");
const articleLinks = Array.from(document.querySelectorAll(".article-thumb-link[data-post-id]"));
const articleDataScript = document.querySelector("#article-data");
let articleData = [];
if (articleDataScript?.textContent) {
  try {
    const parsed = JSON.parse(articleDataScript.textContent);
    articleData = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    articleData = [];
  }
}
const articleDataById = new Map(
  articleData
    .filter((item) => item?.id)
    .map((item) => [String(item.id), item])
);

const LOCK_CLASS = "scroll-locked";
const ENTERED_CLASS = "is-entered";
const ARTICLE_OPEN_CLASS = "article-open";

let entered = false;
let logoTarget = { x: 0, y: 0, scale: 1 };
let scrollLockY = 0;
let logoIntroDelayTween = null;
let logoIntroTween = null;
let enterTween = null;
let aboutSlideTween = null;
let aboutObserver = null;
let mockupObserver = null;
let entryRequested = false;
let logoReadyForClick = false;
let articleOpen = false;

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
  window.scrollTo(0, scrollLockY);
};

const hideHeaderNow = () => {
  if (!header) return;
  gsap.set(header, { autoAlpha: 0, y: -12 });
};

const showHeaderNow = () => {
  if (!header) return;
  gsap.to(header, {
    autoAlpha: 1,
    y: 0,
    duration: 0.35 * motionFactor,
    ease: "power2.out",
    overwrite: true,
  });
};

const setAtAbout = (on) => {
  const isActive = Boolean(on);
  body?.classList.toggle("at-about", isActive);
  if (!brand) return;
  gsap.to(brand, {
    autoAlpha: isActive ? 0 : 1,
    duration: 0.2 * motionFactor,
    ease: "power2.out",
    overwrite: true,
  });
};

const setAtMockup = (on) => {
  body?.classList.toggle("at-mockup", Boolean(on));
};

const initAboutObserver = () => {
  if (!aboutSection || !("IntersectionObserver" in window)) return;
  aboutObserver?.disconnect();
  aboutObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.target !== aboutSection) return;
        setAtAbout(entry.isIntersecting);
      });
    },
    {
      root: null,
      rootMargin: "-30% 0px -40% 0px",
      threshold: 0.01,
    }
  );
  aboutObserver.observe(aboutSection);
};

const initMockupObserver = () => {
  if (!mockupSection || !("IntersectionObserver" in window)) return;
  mockupObserver?.disconnect();
  mockupObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.target !== mockupSection) return;
        setAtMockup(entry.isIntersecting);
      });
    },
    {
      root: null,
      rootMargin: "-35% 0px -55% 0px",
      threshold: 0.01,
    }
  );
  mockupObserver.observe(mockupSection);
};

let articlesObserver = null;
const setAtArticles = (on) => {
  body?.classList.toggle("at-articles", Boolean(on));
};

const initArticlesObserver = () => {
  if (!articlesSection || !("IntersectionObserver" in window)) return;
  articlesObserver?.disconnect();
  articlesObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.target !== articlesSection) return;
        setAtArticles(entry.isIntersecting);
      });
    },
    {
      root: null,
      rootMargin: "-45% 0px -45% 0px",
      threshold: 0.01,
    }
  );
  articlesObserver.observe(articlesSection);
};

const stripHtml = (value) => (value ? value.replace(/<[^>]+>/g, "").trim() : "");

const setArticleLoading = (on) => {
  if (!articleLoading) return;
  articleLoading.hidden = !on;
  articleLoading.style.display = on ? "block" : "none";
};

const renderArticle = (article) => {
  if (!articleContent) return;
  const title = stripHtml(article?.title ?? "Untitled");
  const content = article?.content ?? "";
  const featuredUrl = article?.featuredUrl ?? "";
  const featuredAlt = article?.featuredAlt ?? title;
  const categories = Array.isArray(article?.categories)
    ? article.categories.filter(Boolean)
    : [];
  const dateValue = article?.date ? new Date(article.date) : null;
  const formattedDate = dateValue
    ? dateValue.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const metaParts = [];
  if (formattedDate) {
    metaParts.push(`<time datetime="${article.date}">${formattedDate}</time>`);
  }
  if (categories.length) {
    metaParts.push(`<span>${categories.join(" · ")}</span>`);
  }

  const metaMarkup = metaParts.length ? `<div class="article-meta">${metaParts.join("")}</div>` : "";
  const heroMarkup = featuredUrl
    ? `<figure class="article-hero"><img src="${featuredUrl}" alt="${featuredAlt}" loading="lazy" /></figure>`
    : "";

  articleContent.innerHTML = `
    ${metaMarkup}
    <h1 class="article-title">${title}</h1>
    ${heroMarkup}
    <div class="article-body">${content}</div>
  `;
};

const openArticleOverlay = (article, fallbackUrl) => {
  if (!articleOverlay || !articleFrame || !articleContent || !body) {
    if (fallbackUrl) window.location.href = fallbackUrl;
    return;
  }
  if (!article) {
    if (fallbackUrl) window.location.href = fallbackUrl;
    return;
  }
  if (articleOpen) return;
  articleOverlay.hidden = false;
  articleOpen = true;
  body.classList.add(ARTICLE_OPEN_CLASS);
  articleOverlay.classList.add("is-active");
  articleOverlay.setAttribute("aria-hidden", "false");
  articleContent.innerHTML = "";
  setArticleLoading(true);
  if (articleFrameBody) {
    articleFrameBody.scrollTop = 0;
  }
  lockScroll();

  gsap.to(articleOverlay, {
    autoAlpha: 1,
    duration: 0.25 * motionFactor,
    ease: "power2.out",
    overwrite: true,
  });
  gsap.to(articleFrame, {
    yPercent: 0,
    scale: 1,
    duration: 0.85 * motionFactor,
    ease: "power2.out",
    overwrite: true,
  });

  renderArticle(article);
  setArticleLoading(false);
  articleClose?.focus();
};

const closeArticleOverlay = () => {
  if (!articleOverlay || !articleFrame || !body || !articleOpen) return;
  articleOpen = false;
  body.classList.remove(ARTICLE_OPEN_CLASS);

  gsap.to(articleFrame, {
    yPercent: 120,
    scale: 0.95,
    duration: 0.45 * motionFactor,
    ease: "power2.in",
    overwrite: true,
    onComplete: () => {
      articleOverlay.classList.remove("is-active");
      articleOverlay.setAttribute("aria-hidden", "true");
      gsap.set(articleOverlay, { autoAlpha: 0 });
      articleOverlay.hidden = true;
      if (articleContent) articleContent.innerHTML = "";
      setArticleLoading(false);
      unlockScroll();
    },
  });
  gsap.to(articleOverlay, {
    autoAlpha: 0,
    duration: 0.3 * motionFactor,
    ease: "power2.out",
    overwrite: true,
  });
};

const hideBumperNow = () => {
  if (!scrollBumper) return;
  scrollBumper.setAttribute("disabled", "disabled");
  gsap.set(scrollBumper, { autoAlpha: 0, y: 16 });
};

const showBumperNow = () => {
  if (!scrollBumper) return;
  scrollBumper.removeAttribute("disabled");
  gsap.to(scrollBumper, {
    autoAlpha: 1,
    y: 0,
    duration: 0.35 * motionFactor,
    ease: "power2.out",
    overwrite: true,
  });
};

const pulseCursor = () => {
  if (!enterCta) return;
  enterCta.classList.remove("cursor-animate");
  // force reflow to restart animation
  void enterCta.offsetWidth;
  enterCta.classList.add("cursor-animate");
  setTimeout(() => enterCta.classList.remove("cursor-animate"), 1200);
};


const revealLogoLetters = () => {
  if (logoWrap) {
    gsap.fromTo(
      logoWrap,
      { autoAlpha: 0 },
      {
        autoAlpha: 1,
        duration: 0.7 * motionFactor,
        ease: "power2.out",
        overwrite: true,
      }
    );
  }
};

const computeLogoTarget = () => {
  if (!logo || !brand) return;

  gsap.set(logo, { x: 0, y: 0, scale: 1 });
  brand.style.fontSize = "";
  brand.style.letterSpacing = "";

  const headerY = header ? gsap.getProperty(header, "y") : 0;
  if (header) {
    gsap.set(header, { y: 0 });
  }

  const logoRect = logo.getBoundingClientRect();

  const brandRect = brand.getBoundingClientRect();
  const scale = brandRect.width / logoRect.width;

  const useCenteredTarget = phoneMq.matches;
  const logoCenterX = logoRect.left + logoRect.width / 2;
  const brandCenterX = brandRect.left + brandRect.width / 2;

  logoTarget = {
    x: Math.round(useCenteredTarget ? brandCenterX - logoCenterX : brandRect.left - logoRect.left),
    y: Math.round(brandRect.top - logoRect.top),
    scale: Number(scale.toFixed(4)),
  };

  if (header) {
    gsap.set(header, { y: headerY });
  }
};

const ensureLogoRow = ({ duration = 1.0, onComplete } = {}) => {
  if (!logoWrap || !logoLetters.length) return null;
  logoIntroDelayTween?.kill();
  logoIntroDelayTween = null;
  logoIntroTween?.kill();
  logoIntroTween = null;

  const fromRect = logoWrap.getBoundingClientRect();

  // Measure the final inline size so we can avoid a "snap" when clearing the lock.
  const wasStack = logoWrap.classList.contains("logo--stack");
  logoWrap.classList.remove("logo--stack");
  logoWrap.classList.add("logo--row");
  logoWrap.style.width = "";
  logoWrap.style.height = "";
  const toRect = logoWrap.getBoundingClientRect();
  if (wasStack) {
    logoWrap.classList.add("logo--stack");
  }
  logoWrap.classList.remove("logo--row");

  // Lock the wrapper size during FLIP so centering stays stable while targets go absolute.
  logoWrap.style.width = `${fromRect.width}px`;
  logoWrap.style.height = `${fromRect.height}px`;

  const state = Flip.getState([logoWrap, ...logoLetters]);
  logoWrap.classList.remove("logo--stack");
  logoWrap.classList.add("logo--row");

  logoIntroTween = Flip.from(state, {
    duration,
    ease: "power3.inOut",
    absolute: true,
    nested: true,
    stagger: 0.02,
    onComplete: () => {
      gsap.set(logoLetters, { clearProps: "transform" });
      logoWrap.style.width = `${toRect.width}px`;
      logoWrap.style.height = `${toRect.height}px`;
      requestAnimationFrame(() => {
        logoWrap.style.width = "";
        logoWrap.style.height = "";
      });
      gsap.set(logoWrap, { autoAlpha: 1 });
      logoReadyForClick = true;
      onComplete?.();
    },
  });
  return logoIntroTween;
};

const forceLogoRowState = () => {
  if (!logoWrap) return;
  logoIntroDelayTween?.kill();
  logoIntroDelayTween = null;
  logoIntroTween?.kill();
  logoIntroTween = null;
  gsap.set(logoLetters, { clearProps: "transform" });
  logoWrap.classList.remove("logo--stack");
  logoWrap.classList.add("logo--row");
  logoWrap.style.width = "";
  logoWrap.style.height = "";
  gsap.set(logoWrap, { autoAlpha: 1, clearProps: "transform" });
  logoReadyForClick = true;
};

let logoIntroPlayed = false;
const animateLogoIntro = () => {
  if (logoIntroPlayed) return;
  if (!logoWrap || !logoLetters.length) return;
  logoIntroPlayed = true;

  const revealEnterCta = () => {
    if (!enterCta) return;
    gsap.fromTo(
      enterCta,
      { autoAlpha: 0, y: 6 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.35 * motionFactor,
        ease: "power2.out",
        overwrite: true,
      }
    );
    gsap.delayedCall(0.2 * motionFactor, pulseCursor);
  };

  logoWrap.classList.add("logo--stack");
  logoWrap.classList.remove("logo--row");

  logoIntroDelayTween = gsap.delayedCall(0.02 * motionFactor, () => {
    if (entered) return;
    revealLogoLetters();
    revealEnterCta();
    ensureLogoRow({
      duration: 1.6 * motionFactor,
      onComplete: () => {
        gsap.set(logoWrap, { autoAlpha: 1 });
        computeLogoTarget();
        gsap.delayedCall(0.25, pulseCursor);
      },
    });
  });
};

const ensureFontsReady = () => {
  if (!document.fonts?.ready) return Promise.resolve();
  if (document.fonts.status === "loaded") return Promise.resolve();
  return Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, 1200)),
  ]);
};

const scrollToTarget = (target, offset = 0) => {
  if (!target) return;
  const y =
    typeof target === "number"
      ? target + offset
      : (target?.offsetTop ?? 0) + offset;
  gsap.to(window, {
    scrollTo: { y, autoKill: false },
    duration: 0.6,
    ease: "power2.out",
  });
};

const scrollToAbout = () => {
  if (entered) {
    scrollToTarget(aboutSection, 10);
    return;
  }
  enterSite({ scrollAfter: true, scrollTarget: aboutSection, scrollOffset: 10 });
};

const enterSite = ({ scrollAfter = false, scrollTarget = null, scrollOffset = 0 } = {}) => {
  if (entered) {
    if (scrollAfter) scrollToTarget(scrollTarget || aboutSection, scrollOffset);
    return;
  }
  if (enterTween) return;
  entryRequested = true;
  enterTween = true;

  const startEnter = () => {
    const introIsActive =
      Boolean(logoIntroDelayTween) || Boolean(logoIntroTween && logoIntroTween.isActive());
    if (introIsActive) {
      forceLogoRowState();
    }
    entered = true;
    body?.classList.add(ENTERED_CLASS);
    revealLogoLetters();

    const needsRow = logoWrap?.classList.contains("logo--stack") || introIsActive;
    const heroRevealDuration = 1.35 * motionFactor;
    const rowDuration = 0.95 * motionFactor;
    const headerRevealDuration = 0.35 * motionFactor;
    let heroStart = 0;

    const tl = gsap.timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => {
        enterTween = null;
        unlockScroll();
        stageOverlay?.setAttribute("aria-hidden", "true");
        showBumperNow();
        if (scrollAfter) {
          const target = scrollTarget || aboutSection;
          const offset = scrollOffset || 0;
          scrollToTarget(target, offset);
        }
      },
    });
    enterTween = tl;

    if (enterCta) {
      tl.to(enterCta, { autoAlpha: 0, y: -10, duration: 0.35 * motionFactor }, 0);
    }

    if (needsRow) {
      const rowTween = ensureLogoRow({
        duration: rowDuration,
      });
      if (rowTween) {
        tl.add(rowTween, 0);
        heroStart = rowDuration;
      }
      tl.add(() => computeLogoTarget(), heroStart);
    } else {
      tl.add(() => computeLogoTarget(), 0);
    }

    const headerRevealStart = heroStart + (heroRevealDuration - headerRevealDuration * 1.05);

    if (header) {
      tl.to(
        header,
        {
          autoAlpha: 1,
          y: 0,
          duration: headerRevealDuration,
          ease: "power2.out",
          overwrite: true,
        },
        headerRevealStart
      );
    }

    if (videoFrame) {
      tl.to(
        videoFrame,
        {
          yPercent: 0,
          scale: 1,
          rotateX: 0,
          rotateY: 0,
          borderRadius: 0,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.55)",
          autoAlpha: 1,
          duration: heroRevealDuration,
          ease: "power2.out",
        },
        heroStart
      );
    }

    if (video) {
      tl.fromTo(
        video,
        { scale: 1.1 },
        { scale: 1, duration: heroRevealDuration, ease: "none" },
        heroStart
      );
    }

    if (logo) {
      tl.to(
        logo,
        {
          x: () => logoTarget.x,
          y: () => logoTarget.y,
          scale: () => logoTarget.scale,
          transformOrigin: () => (phoneMq.matches ? "center top" : "left top"),
          duration: heroRevealDuration,
          ease: "power2.out",
        },
        heroStart
      )
        .set(logo, { autoAlpha: 0 }, heroStart + heroRevealDuration)
        .set(brand, { autoAlpha: 1 }, heroStart + heroRevealDuration);
    }

    if (stageOverlay) {
      tl.to(
        stageOverlay,
        {
          autoAlpha: 0,
          duration: 0.3 * motionFactor,
          ease: "power2.out",
        },
        heroStart + heroRevealDuration - 0.15 * motionFactor
      );
    }
  };

  ensureFontsReady()
    .then(startEnter)
    .catch(() => {
      if (enterTween === true) {
        enterTween = null;
      }
      entryRequested = false;
    });
};

// Initial state
window.scrollTo(0, 0);
scrollLockY = 0;
lockScroll();
hideHeaderNow();
hideBumperNow();
gsap.set(brand, { autoAlpha: 0 });
if (logoWrap) {
  gsap.set(logoWrap, { autoAlpha: 0 });
}
  if (enterCta) {
    gsap.set(enterCta, { autoAlpha: 0, y: 16 });
  }
if (videoFrame) {
  gsap.set(videoFrame, {
    yPercent: 120,
    scale: 0.7,
    rotateX: 12,
    rotateY: 0,
    transformOrigin: "center center",
    autoAlpha: 0,
  });
}

if (articleOverlay && articleFrame) {
  gsap.set(articleOverlay, { autoAlpha: 0 });
  gsap.set(articleFrame, { yPercent: 120, scale: 0.95 });
}

if (video && fallback) {
  video.addEventListener("canplay", () => fallback.classList.add("is-hidden"));
}

ensureFontsReady().then(() => computeLogoTarget());
initAboutObserver();
initMockupObserver();
initArticlesObserver();

// Logo intro + CTA reveal
const queueLogoIntro = () => {
  if (logoIntroPlayed) return;
  gsap.delayedCall(0.18, () => {
    requestAnimationFrame(() => requestAnimationFrame(animateLogoIntro));
  });
};
window.addEventListener("load", queueLogoIntro, { once: true });
setTimeout(queueLogoIntro, 900);

// Enter interactions
const triggerEntrance = () => {
  if (!logoReadyForClick || entryRequested) return;
  entryRequested = true;
  enterSite();
};
logoButton?.addEventListener("click", () => {
  triggerEntrance();
});
logoButton?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    triggerEntrance();
  }
});
enterCta?.addEventListener("click", () => {
  triggerEntrance();
});

// Scroll bumper
scrollBumper?.addEventListener("click", scrollToAbout);

// Header about link
aboutLink?.addEventListener("click", (event) => {
  event.preventDefault();
  scrollToAbout();
});

footerBackLink?.addEventListener("click", (event) => {
  event.preventDefault();
  scrollToTarget(stage || "#stage");
});

articleLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const postId = link.dataset.postId;
    if (!postId) return;
    event.preventDefault();
    const article = articleDataById.get(postId);
    openArticleOverlay(article, link.href);
  });
});

articleClose?.addEventListener("click", () => {
  closeArticleOverlay();
});

articleOverlay?.addEventListener("click", (event) => {
  if (event.target === articleOverlay) {
    closeArticleOverlay();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeArticleOverlay();
  }
});

if (newsletterForm) {
  const brevoTarget = document.querySelector("iframe[name=\"brevo-target\"]");
  let newsletterSubmitting = false;

  newsletterForm.addEventListener("submit", () => {
    newsletterSubmitting = true;
    if (newsletterStatus) {
      newsletterStatus.textContent = "Submitting...";
    }
  });

  brevoTarget?.addEventListener("load", () => {
    if (!newsletterSubmitting) return;
    newsletterSubmitting = false;
    if (newsletterStatus) {
      newsletterStatus.textContent = "Thanks — you’re subscribed.";
    }
    newsletterForm.reset();
  });
}



// Keep target updated on resize
window.addEventListener("resize", () => {
  if (!entered) computeLogoTarget();
});


const aboutSlideTrack = document.querySelector(".about-slide-track");
const aboutVariantButtons = Array.from(document.querySelectorAll(".about-variant-button"));
const aboutBaseVariant = {
  title: 'We are <span class="about-title-brand">Urbanoise</span>.',
  lead: "Narrative-driven work with a cinematic backbone.",
  paragraphs: [
    "URBANOISE is a production company founded by director/cinematographer <span class=\"about-highlight\">Sufian Ararah</span> and photographer and architect <span class=\"about-highlight\">Rokas Jankus</span> in 2025, dedicated to architectural documentaries in film and photography.",
    "At the core of our practice lies observation rather than staging. We document processes, uses, transitions and atmospheres as they unfold, allowing architecture to be understood within its real context.",
    "URBANOISE stands for a documentary and artistic engagement with architecture and urban space. Works that aim not at attention, but at understanding.",
  ],
  image: "Photos/us2.JPG",
  alt: "Urbanoise founders portrait",
  photoSlots: [
    {
      name: "default",
      images: ["Photos/us2.JPG"],
    },
  ],
};

const visionPhotos = Array.from({ length: 11 }, (_, index) => `Photos/about/${index + 1}.jpg`);

const aboutVisionVariant = {
  title: 'We make <span class="about-title-brand">Films</span>.',
  lead: "We believe that moving images hold a great potential to make architecture truly tangible.",
  paragraphs: [
    "We work closely with our partners to capture and articulate the full picture behind a project — the approach, methods, and systems that shape a structure.",
    "In dialogue with architects and design studios, we highlight the defining features of a design through considered cinematography, framing, and movement, while also taking into account the sonic qualities of space and material.",
    "What we deliver is a coherent body of work that reflects the depth of effort behind an architectural project.",
    "Our films aim to reveal the less obvious subtleties architecture is built upon — atmosphere, rhythm, use, and presence — rather than simply its appearance.",
  ],
  alt: "Urbanoise founders portrait",
  photoSlots: [
    {
      name: "slot-1",
      images: visionPhotos.slice(0, 3),
      interval: 20000,
      delay: 0,
      duration: 0.6,
    },
    {
      name: "slot-2",
      images: visionPhotos.slice(3, 6),
      interval: 21000,
      delay: 5000,
      duration: 0.65,
    },
    {
      name: "slot-3",
      images: visionPhotos.slice(6, 9),
      interval: 22000,
      delay: 10000,
      duration: 0.7,
    },
    {
      name: "slot-4",
      images: visionPhotos.slice(9, 11),
      interval: 23000,
      delay: 15000,
      duration: 0.75,
    },
  ],
  formatsHeading: "Formats",
  formats: [
    "Long-form architectural films (7–12 min)",
    "Short-form architectural documentary films (2.5–4.5 min)",
    "Visual minutes, frames in motion, and audio-visual edits designed for social media representation",
  ],
};

const aboutPhotographyVariant = {
  primaryTitle: 'We make <span class="about-title-highlight">Photographs</span>.',
  lead:
    "Photography complements our films where <span class=\"about-highlight\">concentration, precision</span> and<span class=\"about-highlight\"> reduction</span> are required.",
  paragraphs: [
    "Photography complements our films where concentration, precision, and reduction are required.",
    "It allows us to isolate space, material, and detail — moments where stillness reveals structure more clearly than movement.",
    "Our photographic work focuses on clarity and intent rather than decoration.",
    "Through careful framing, light, and timing, we document architecture and environments with attention to proportion, texture, and atmosphere, creating images that communicate rather than embellish.",
  ],
  alt: "Urbanoise founders portrait",
  photoCarousel: {
    images: [
      "Photos/slide/1.jpg",
      "Photos/slide/Architektur_Hausderseele-05.jpg",
      "Photos/slide/Architektur_Hausderseele-15.jpg",
      "Photos/slide/Architektur_Hausderseele-17.jpg",
      "Photos/slide/Architektur_Hausderseele-24.jpg",
      "Photos/slide/Architektur_MIX-11 2.jpg",
      "Photos/slide/Architektur_MIX-11.jpg",
      "Photos/slide/Architektur_MIX-12.jpg",
      "Photos/slide/Architektur_MIX-14.jpg",
      "Photos/slide/Architektur_MIX-16.jpg",
      "Photos/slide/Architektur_Neues Theater-02.jpg",
      "Photos/slide/Architektur_Neues Theater-06.jpg",
      "Photos/slide/Architektur_Neues Theater-08.jpg",
      "Photos/slide/Architektur_Neues Theater-09.jpg",
      "Photos/slide/Architektur_Neues Theater-Tryptichon.jpg",
      "Photos/slide/Architektur_Sanaa-3.jpg",
      "Photos/slide/Architektur_Sanaa-4.jpg",
      "Photos/slide/Architektur_Stealthbomber-07.jpg",
      "Photos/slide/Hasselburg-1.jpg",
      "Photos/slide/Hasselburg-2.jpg",
      "Photos/slide/Hasselburg-3.jpg",
    ],
    interval: 16000,
    duration: 0.6,
    delay: 0,
  },
  formatsHeading: "Formats",
  formats: [
    "Architectural photography",
    "Editorial & documentary photography",
    "Detail and material studies",
    "Series and visual sets for publications, exhibitions, and digital platforms",
  ],
};

const aboutConsultationsVariant = {
  primaryTitle: 'We make <span class="about-title-highlight">campaigns</span>.',
  lead:
    "We work with partners to define clear media strategies rooted in purpose rather than noise.",
  paragraphs: [
    "Our consultation work focuses on shaping clear, purpose-driven media campaigns — defining structure, visual language, and distribution as one coherent system.",
    "In addition, we offer workshops and seminars in filmmaking and photography for firms, institutions, and organizations interested in documenting their own work with clarity and consistency.",
  ],
  alt: "Urbanoise founders portrait",
  photoSlots: [
    {
      name: "slot-1",
      images: visionPhotos.slice(0, 3),
      interval: 20000,
      delay: 0,
      duration: 0.6,
    },
    {
      name: "slot-2",
      images: visionPhotos.slice(3, 6),
      interval: 21000,
      delay: 5000,
      duration: 0.65,
    },
    {
      name: "slot-3",
      images: visionPhotos.slice(6, 9),
      interval: 22000,
      delay: 10000,
      duration: 0.7,
    },
    {
      name: "slot-4",
      images: visionPhotos.slice(9, 11),
      interval: 23000,
      delay: 15000,
      duration: 0.75,
    },
  ],
  formatsHeading: "Formats",
  formats: [
    "Media & campaign strategy",
    "Narrative and content structure",
    "Visual language & direction",
    "Platform and distribution guidance",
  ],
};

const aboutVariants = [
  { key: "films", ...aboutVisionVariant },
  { key: "photography", ...aboutPhotographyVariant },
  { key: "consultations", ...aboutConsultationsVariant },
  ...["about"].map((key) => ({ key, ...aboutBaseVariant })),
];

const updateVariantButtons = (activeKey) => {
  aboutVariantButtons.forEach((button) => {
    const isActive = button.dataset.variant === activeKey;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
};

const aboutPhoneLabel = document.querySelector(".about-phone-label");
const aboutPhonePrev = document.querySelector(".about-phone-prev");
const aboutPhoneNext = document.querySelector(".about-phone-next");

const getVariantLabel = (key) => {
  const button = aboutVariantButtons.find((btn) => btn.dataset.variant === key);
  return button ? button.textContent.trim() : key;
};

const updatePhoneLabel = () => {
  if (!aboutPhoneLabel) return;
  const key = aboutVariants[aboutActiveIndex]?.key;
  aboutPhoneLabel.textContent = getVariantLabel(key);
};

let aboutActiveIndex = 0;
const setAboutVariant = (index, { animate = true } = {}) => {
  if (!aboutSlideTrack) return;
  const clampedIndex = ((index % aboutVariants.length) + aboutVariants.length) % aboutVariants.length;
  aboutActiveIndex = clampedIndex;

  const xPercent = -100 * clampedIndex;
  updateVariantButtons(aboutVariants[clampedIndex]?.key);
  updatePhoneLabel();

  if (!animate) {
    gsap.set(aboutSlideTrack, { xPercent });
    return;
  }

  if (aboutSlideTween) {
    aboutSlideTween.kill();
  }
  aboutSlideTween = gsap.to(aboutSlideTrack, {
    xPercent,
    duration: 0.75,
    ease: "power2.inOut",
  });
};

const createSlide = (variant) => {
  const slide = document.createElement("article");
  slide.className = "about-slide";
  slide.dataset.variantKey = variant.key;
  const paragraphs = variant.paragraphs
    .map((paragraph) => `<p class="about-paragraph">${paragraph}</p>`)
    .join("");
  const formatsList = variant.formats
    ? `
        <div class="about-formats">
          <p class="about-paragraph about-formats-heading">${variant.formatsHeading ?? "Formats"}</p>
          <ul class="about-formats-list">
            ${variant.formats.map((format) => `<li>${format}</li>`).join("")}
          </ul>
        </div>
      `
    : "";
  const titleMarkup =
    variant.primaryTitle ?? variant.title ?? 'We are <span class="about-title-brand">Urbanoise</span>.';
  const secondaryTitleMarkup = variant.secondaryTitle
    ? `<p class="about-secondary-title">${variant.secondaryTitle}</p>`
    : "";
  const photoSlots = variant.photoSlots ?? (variant.images ? variant.images.map((image, index) => ({
    name: `slot-${index}`,
    images: [image],
  })) : []);
  const slotsMarkup = photoSlots
    .map((slotConfig, index) => {
      const slotImages = (Array.isArray(slotConfig.images) ? slotConfig.images : []).filter(Boolean);
      if (!slotImages.length) return "";
      const attrs = [
        `data-slot="${slotConfig.name ?? index}"`,
        `data-images='${JSON.stringify(slotImages)}'`,
        `data-interval="${slotConfig.interval ?? 5000}"`,
        `data-duration="${slotConfig.duration ?? 0.9}"`,
        `data-delay="${slotConfig.delay ?? 0}"`,
      ].join(" ");
      return `
        <div class="about-photo-slot" ${attrs}>
          <img class="about-photo" src="${slotImages[0]}" alt="${variant.alt ?? ""}" loading="lazy" />
        </div>
      `;
    })
    .join("");
  const stackMarkup = slotsMarkup
    ? `
        <div class="about-slide-image">
          <div class="about-photo-stack">
            ${slotsMarkup}
          </div>
        </div>
      `
    : "";
  const carousel = variant.photoCarousel;
  const carouselMarkup =
    carousel && carousel.images?.length
      ? `
        <div class="about-slide-image">
          <div
            class="about-photo-carousel"
            data-images='${JSON.stringify(carousel.images)}'
            data-interval="${carousel.interval ?? 8000}"
            data-duration="${carousel.duration ?? 0.6}"
            data-delay="${carousel.delay ?? 0}"
          >
            <img class="about-photo" src="${carousel.images[0]}" alt="${variant.alt ?? ""}" loading="lazy" />
          </div>
        </div>
      `
      : "";
  const imageStack = carouselMarkup || stackMarkup;
  slide.innerHTML = `
    <div class="about-slide-text">
      <h2 class="about-title">${titleMarkup}</h2>
      ${secondaryTitleMarkup}
      <p class="about-lead">${variant.lead}</p>
      <div class="about-copy">
        ${paragraphs}
      </div>
      ${formatsList}
    </div>
    ${imageStack}
  `;
  return slide;
};

const photoSlotTimers = new WeakMap();

const clearPhotoSlotRotation = (slotEl) => {
  const timers = photoSlotTimers.get(slotEl);
  if (!timers) return;
  if (timers.intervalId) clearInterval(timers.intervalId);
  if (timers.timeoutId) clearTimeout(timers.timeoutId);
  photoSlotTimers.delete(slotEl);
};

const setupPhotoSlotRotation = (slotEl) => {
  clearPhotoSlotRotation(slotEl);
  const rawImages = slotEl.dataset.images;
  if (!rawImages) return;
  let images;
  try {
    images = JSON.parse(rawImages);
  } catch (error) {
    return;
  }
  if (!images || images.length < 2) return;

  const interval = Number(slotEl.dataset.interval) || 5000;
  const duration = Number(slotEl.dataset.duration) || 0.9;
  const delay = Number(slotEl.dataset.delay) || 0;
  const img = slotEl.querySelector("img");
  let currentIndex = 0;
  slotEl.dataset.busy = "false";
  if (img) {
    gsap.set(img, { yPercent: 0 });
  }

  const animateNextImage = () => {
    const nextIndex = (currentIndex + 1) % images.length;
    if (!img || slotEl.dataset.busy === "true") return;
    slotEl.dataset.busy = "true";
    const timeline = gsap.timeline({ defaults: { ease: "power2.inOut" } });
    timeline
      .to(img, { xPercent: -100, duration: duration / 2 })
      .add(() => {
        img.src = images[nextIndex];
        gsap.set(img, { xPercent: 100 });
      })
      .to(img, { xPercent: 0, duration: duration / 2 })
      .add(() => {
        slotEl.dataset.busy = "false";
      });
    currentIndex = nextIndex;
  };

  const startRotation = () => {
    const initialDelay = delay > 0 ? delay : interval;
    const timeoutId = setTimeout(() => {
      animateNextImage();
      const intervalId = setInterval(animateNextImage, interval);
      photoSlotTimers.set(slotEl, { intervalId, timeoutId: null });
    }, initialDelay);
    photoSlotTimers.set(slotEl, { intervalId: null, timeoutId });
  };

  startRotation();
};

const setupPhotoCarousel = (carouselEl) => {
  const rawImages = carouselEl.dataset.images;
  if (!rawImages) return;
  let images;
  try {
    images = JSON.parse(rawImages);
  } catch (error) {
    return;
  }
  if (!images || images.length < 2) return;

  const interval = Number(carouselEl.dataset.interval) || 8000;
  const duration = Number(carouselEl.dataset.duration) || 0.6;
  const delay = Number(carouselEl.dataset.delay) || 0;
  const img = carouselEl.querySelector("img");
  let currentIndex = 0;
  carouselEl.dataset.busy = "false";

  const animate = () => {
    const nextIndex = (currentIndex + 1) % images.length;
    if (!img || carouselEl.dataset.busy === "true") return;
    carouselEl.dataset.busy = "true";
    const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });
    tl
      .to(img, { xPercent: -100, duration: duration / 2 })
      .add(() => {
        img.src = images[nextIndex];
        gsap.set(img, { xPercent: 100 });
      })
      .to(img, { xPercent: 0, duration: duration / 2 })
      .add(() => {
        carouselEl.dataset.busy = "false";
      });
    currentIndex = nextIndex;
  };

  const start = () => {
    const initialDelay = delay > 0 ? delay : interval;
    const timeoutId = setTimeout(() => {
      animate();
      const intervalId = setInterval(animate, interval);
      photoSlotTimers.set(carouselEl, { intervalId, timeoutId: null });
    }, initialDelay);
    photoSlotTimers.set(carouselEl, { intervalId: null, timeoutId });
  };

  start();
};

const initPhotoSlotRotations = () => {
  document.querySelectorAll(".about-photo-slot").forEach((slot) => {
    setupPhotoSlotRotation(slot);
  });
};

const initPhotoCarousels = () => {
  document.querySelectorAll(".about-photo-carousel").forEach((carousel) => {
    setupPhotoCarousel(carousel);
  });
};

if (aboutSlideTrack) {
  aboutVariants.forEach((variant) => {
    aboutSlideTrack.appendChild(createSlide(variant));
  });
  initPhotoSlotRotations();
  initPhotoCarousels();
}
const getVariantIndexByKey = (key) =>
  aboutVariants.findIndex((variant) => variant.key === key);

if (aboutVariantButtons.length) {
  aboutVariantButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.variant;
      const index = getVariantIndexByKey(key);
      if (index >= 0) {
        setAboutVariant(index);
      }
    });
  });
}
aboutPhonePrev?.addEventListener("click", () => {
  setAboutVariant(aboutActiveIndex - 1);
});
aboutPhoneNext?.addEventListener("click", () => {
  setAboutVariant(aboutActiveIndex + 1);
});
setAboutVariant(0, { animate: false });
