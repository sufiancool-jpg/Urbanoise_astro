const sendAnalyticsEvent = (eventName, params = {}, callback) => {
  if (typeof window.gtag !== "function") {
    callback?.();
    return;
  }

  window.gtag("event", eventName, {
    page_path: window.location.pathname,
    page_location: window.location.href,
    transport_type: "beacon",
    ...params,
    event_callback: callback,
  });
};

const trackStartProjectPageView = () => {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  if (pathname !== "/start-a-project") return;
  sendAnalyticsEvent("start_project_page_view", {
    page_title: document.title,
  });
};

const trackNewsletterSubscribes = () => {
  const forms = Array.from(document.querySelectorAll(".footer-newsletter-form"));
  if (!forms.length) return;

  forms.forEach((form, index) => {
    if (form.dataset.analyticsBound === "1") return;
    form.dataset.analyticsBound = "1";

    let pendingSubmission = false;
    let emailDomain = "";

    form.addEventListener("submit", () => {
      const emailInput = form.querySelector('input[name="EMAIL"]');
      const emailValue = emailInput instanceof HTMLInputElement ? emailInput.value.trim() : "";
      const atIndex = emailValue.lastIndexOf("@");
      emailDomain = atIndex > -1 ? emailValue.slice(atIndex + 1).toLowerCase() : "";
      pendingSubmission = true;
    });

    const targetName = form.getAttribute("target");
    if (!targetName) return;
    const targetFrame = document.querySelector(`iframe[name="${targetName}"]`);
    if (!(targetFrame instanceof HTMLIFrameElement)) return;

    targetFrame.addEventListener("load", () => {
      if (!pendingSubmission) return;
      pendingSubmission = false;
      sendAnalyticsEvent("newsletter_subscribe", {
        form_name: "footer_newsletter",
        form_index: index + 1,
        email_domain: emailDomain || "unknown",
      });
      emailDomain = "";
    });
  });
};

const parseLinkMeta = (anchor) => {
  const rawHref = anchor.getAttribute("href") || "";
  if (!rawHref) return { rawHref, absoluteHref: "", hostname: "" };
  try {
    const resolved = new URL(rawHref, window.location.href);
    return {
      rawHref,
      absoluteHref: resolved.href,
      hostname: resolved.hostname.toLowerCase(),
    };
  } catch (_error) {
    return { rawHref, absoluteHref: rawHref, hostname: "" };
  }
};

const trackLinkClicks = () => {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest("a[href]");
    if (!(link instanceof HTMLAnchorElement)) return;

    const { rawHref, absoluteHref, hostname } = parseLinkMeta(link);
    const linkText = link.textContent?.trim() || link.getAttribute("aria-label") || "";
    const inFooter = Boolean(link.closest(".footer-page"));

    if (rawHref.startsWith("mailto:")) {
      sendAnalyticsEvent("email_click", {
        email_address: rawHref.replace(/^mailto:/i, ""),
        link_text: linkText,
        link_class: link.className || "",
      });
    }

    if (hostname.includes("linkedin.com")) {
      sendAnalyticsEvent("linkedin_click", {
        link_url: absoluteHref || rawHref,
        link_text: linkText,
        link_class: link.className || "",
      });
    }

    if (inFooter) {
      sendAnalyticsEvent("footer_link_click", {
        link_url: absoluteHref || rawHref,
        link_text: linkText,
        link_class: link.className || "",
      });
    }
  });
};

trackStartProjectPageView();
trackNewsletterSubscribes();
trackLinkClicks();
