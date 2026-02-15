import gsap from "./src/index.js";
import ScrollTrigger from "./src/ScrollTrigger.js";
import ScrollSmoother from "./src/ScrollSmoother.js";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
window.gsap = gsap;

const wrapper = document.querySelector("#smooth-wrapper");
const content = document.querySelector("#smooth-content");
const introSection = document.querySelector(".project-intro");
const revealSections = gsap.utils.toArray(".service-section, .footer-page");

if (!wrapper || !content || !revealSections.length) {
  ScrollTrigger.refresh();
} else {
  let smoother = null;
  try {
    smoother = ScrollSmoother.create({
      wrapper,
      content,
      smooth: prefersReducedMotion ? 0 : 0.95,
      smoothTouch: prefersReducedMotion ? 0 : 0.1,
      effects: false,
      normalizeScroll: true,
      ignoreMobileResize: true,
    });
  } catch (error) {
    // Keep native scrolling if smoother creation fails.
  }

  if (introSection) {
    const petrolColor = getComputedStyle(document.body).getPropertyValue("--pantone-8245c").trim() || "#3f8484";
    const introTextTargets = gsap.utils.toArray(
      ".project-intro .manifesto-title, .project-intro .manifesto-block, .project-intro .manifesto-signoff",
    );
    const highlightLine = introSection.querySelector(".manifesto-highlight-line");

    if (introTextTargets.length) {
      if (prefersReducedMotion) {
        gsap.set(introTextTargets, { autoAlpha: 1, y: 0 });
      } else {
        gsap.set(introTextTargets, { autoAlpha: 0, y: 18 });
        gsap.to(introTextTargets, {
          autoAlpha: 1,
          y: 0,
          duration: 0.85,
          ease: "power2.out",
          stagger: 0.12,
          delay: 0.1,
          clearProps: "opacity,visibility,transform",
        });
      }
    }

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

    if (highlightLine) {
      gsap.set(highlightLine, { "--line-fill": "0%" });

      const highlightTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: highlightLine,
          start: "top 56%",
          end: "top 30%",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      highlightTimeline.to(highlightLine, {
        "--line-fill": "100%",
        ease: "none",
        duration: 1,
      }, 0);
    }
  }

  revealSections.forEach((section) => {
    const isFooter = section.classList.contains("footer-page");
    const revealTarget = isFooter
      ? section.querySelector(".footer-inner") || section
      : section.querySelector(".film-inner") || section;

    if (!revealTarget) return;

    gsap.fromTo(
      revealTarget,
      {
        autoAlpha: 0,
        y: prefersReducedMotion ? 0 : 42,
      },
      {
        autoAlpha: 1,
        y: 0,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top 90%",
          end: "top 52%",
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    );
  });

  ScrollTrigger.refresh();
}
