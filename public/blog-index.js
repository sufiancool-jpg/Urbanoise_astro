import gsap from "./src/index.js";

const modal = document.querySelector("[data-blog-modal]");
const panel = modal?.querySelector("[data-blog-modal-panel]");
const backdrop = modal?.querySelector("[data-blog-modal-backdrop]");
const modalContent = modal?.querySelector("[data-blog-modal-content]");
const openLinks = document.querySelectorAll("[data-blog-open]");
const sourceNodes = document.querySelectorAll("[data-blog-source]");
const closeNodes = modal?.querySelectorAll("[data-blog-close]") ?? [];

if (!modal || !panel || !backdrop || !modalContent || !openLinks.length || !sourceNodes.length) {
  // No-op when blog modal markup is absent.
} else {
  const prefersReducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sources = new Map(
    Array.from(sourceNodes).map((node) => [node.getAttribute("data-blog-source"), node])
  );

  let opener = null;
  let active = false;
  let openTween;
  let closeTween;

  const getPanelTransformFromOpener = (trigger) => {
    if (!trigger) {
      return { x: 0, y: 28, scaleX: 0.9, scaleY: 0.9 };
    }

    const sourceRect = trigger.getBoundingClientRect();
    const targetRect = panel.getBoundingClientRect();

    if (!sourceRect.width || !sourceRect.height || !targetRect.width || !targetRect.height) {
      return { x: 0, y: 28, scaleX: 0.9, scaleY: 0.9 };
    }

    const sourceCenterX = sourceRect.left + sourceRect.width / 2;
    const sourceCenterY = sourceRect.top + sourceRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    return {
      x: sourceCenterX - targetCenterX,
      y: sourceCenterY - targetCenterY,
      scaleX: sourceRect.width / targetRect.width,
      scaleY: sourceRect.height / targetRect.height,
    };
  };

  const getFocusable = () =>
    Array.from(
      modal.querySelectorAll(
        "a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex='-1'])"
      )
    );

  const setDialogLabel = (slug) => {
    const title = modalContent.querySelector(".blog-modal-title");
    if (!title) {
      panel.removeAttribute("aria-labelledby");
      return;
    }

    if (!title.id) {
      title.id = `blog-modal-title-${slug}`;
    }

    panel.setAttribute("aria-labelledby", title.id);
  };

  const finishClose = () => {
    modal.hidden = true;
    modal.classList.remove("is-open");
    modalContent.innerHTML = "";
    panel.removeAttribute("aria-labelledby");
    document.body.classList.remove("scroll-locked");
    active = false;

    if (opener && typeof opener.focus === "function") {
      opener.focus();
    }

    opener = null;
  };

  const openModal = (slug, trigger) => {
    const source = sources.get(slug);
    if (!source) {
      return;
    }

    openTween?.kill();
    closeTween?.kill();

    opener = trigger;
    modalContent.innerHTML = source.innerHTML;
    setDialogLabel(slug);

    modal.hidden = false;
    modal.classList.add("is-open");
    document.body.classList.add("scroll-locked");

    if (prefersReducedMotionQuery.matches) {
      gsap.set(backdrop, { autoAlpha: 1 });
      gsap.set(panel, { autoAlpha: 1, y: 0 });
      active = true;
      modal.querySelector(".blog-modal-close")?.focus();
      return;
    }

    const from = getPanelTransformFromOpener(trigger);

    gsap.set(backdrop, { autoAlpha: 0 });
    gsap.set(panel, {
      autoAlpha: 0.35,
      x: from.x,
      y: from.y,
      scaleX: from.scaleX,
      scaleY: from.scaleY,
      transformOrigin: "50% 50%",
      willChange: "transform, opacity",
    });

    openTween = gsap.timeline({ defaults: { ease: "expo.out" } });
    openTween
      .to(backdrop, { autoAlpha: 1, duration: 0.42 }, 0)
      .to(
        panel,
        {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          duration: 0.72,
          ease: "expo.out",
        },
        0.02
      )
      .eventCallback("onComplete", () => {
        active = true;
        gsap.set(panel, { clearProps: "willChange" });
        modal.querySelector(".blog-modal-close")?.focus();
      });
  };

  const closeModal = () => {
    if (modal.hidden) {
      return;
    }

    openTween?.kill();
    closeTween?.kill();

    if (prefersReducedMotionQuery.matches) {
      finishClose();
      return;
    }

    const to = getPanelTransformFromOpener(opener);

    gsap.set(panel, { willChange: "transform, opacity" });
    closeTween = gsap.timeline({ defaults: { ease: "expo.inOut" } });
    closeTween
      .to(
        panel,
        {
          autoAlpha: 0.22,
          x: to.x,
          y: to.y,
          scaleX: to.scaleX,
          scaleY: to.scaleY,
          duration: 0.5,
        },
        0
      )
      .to(backdrop, { autoAlpha: 0, duration: 0.36 }, 0.04)
      .eventCallback("onComplete", () => {
        gsap.set(panel, { clearProps: "willChange,x,y,scaleX,scaleY" });
        finishClose();
      });
  };

  openLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const slug = link.getAttribute("data-blog-open");
      if (!slug) {
        return;
      }

      event.preventDefault();
      openModal(slug, link);
    });
  });

  closeNodes.forEach((node) => {
    node.addEventListener("click", (event) => {
      event.preventDefault();
      closeModal();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (!active) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = getFocusable();
    if (!focusable.length) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement;

    if (event.shiftKey && current === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  });
}
