(() => {
  "use strict";

  const menuToggle = document.getElementById("menu-toggle");
  const navigation = document.getElementById("site-nav");

  const track = (eventName, label) => {
    if (typeof window.gtag !== "function") return;
    try {
      window.gtag("event", eventName, { event_label: label });
    } catch {
      // Analytics must never interrupt navigation or an enquiry.
    }
  };

  if (menuToggle && navigation) {
    const setMenuOpen = (open, returnFocus = false) => {
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      navigation.classList.toggle("is-open", open);
      if (returnFocus) menuToggle.focus();
    };

    menuToggle.addEventListener("click", () => {
      setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
    });

    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenuOpen(false);
    });

    document.addEventListener("click", (event) => {
      if (!navigation.contains(event.target) && !menuToggle.contains(event.target)) {
        setMenuOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
        setMenuOpen(false, true);
      }
    });

    setMenuOpen(false);
    document.documentElement.classList.add("js");
  }

  document.addEventListener("click", (event) => {
    const control = event.target.closest("[data-track]");
    if (control) track(control.dataset.track, control.dataset.label || "unlabelled_cta");
  });

  if (typeof window.IntersectionObserver === "function") {
    const viewedProjects = new Set();
    const projectObserver = new window.IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const project = entry.target.dataset.project;
        if (project && !viewedProjects.has(project)) {
          viewedProjects.add(project);
          track("project_view", project);
        }
        projectObserver.unobserve(entry.target);
      });
    }, { threshold: 0.25 });

    document.querySelectorAll("article[data-project]").forEach((project) => {
      projectObserver.observe(project);
    });
  }

  const motionPreference = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

  if (motionPreference && !motionPreference.matches && typeof window.IntersectionObserver === "function") {
    const activeAnimations = new Set();
    const entranceObserver = new window.IntersectionObserver((entries, observer) => {
      entries.forEach((entry, index) => {
        if (!entry.isIntersecting) return;
        const element = entry.target;
        observer.unobserve(element);
        if (motionPreference.matches || element.matches(":focus-within")) return;

        // Animate on arrival without hiding content or leaving inline styles behind.
        const animation = element.animate([
          { opacity: 0.55, transform: "translateY(10px)" },
          { opacity: 1, transform: "translateY(0)" }
        ], {
          duration: 560,
          delay: Math.min(index * 45, 135),
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "backwards"
        });
        activeAnimations.add(animation);
        animation.onfinish = animation.oncancel = () => activeAnimations.delete(animation);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });

    document.querySelectorAll([
      ".hero-copy > *", ".hero-visual", ".experience-strip", ".section-heading",
      "article[data-project]", ".service-card", ".about-copy", ".experience-item",
      ".education-note", ".contact-copy", "#contact-form"
    ].join(", ")).forEach((element) => {
      if (typeof element.animate === "function") entranceObserver.observe(element);
    });

    if (typeof motionPreference.addEventListener === "function") {
      motionPreference.addEventListener("change", (event) => {
        if (!event.matches) return;
        entranceObserver.disconnect();
        activeAnimations.forEach((animation) => animation.cancel());
        activeAnimations.clear();
      });
    }
  }

  const form = document.getElementById("contact-form");
  const formStatus = document.getElementById("form-status");
  const submitButton = document.getElementById("submit-message");
  if (!form || !formStatus || !submitButton) return;

  const projectContext = document.getElementById("project-context");
  const projectNames = Object.freeze({
    "growth-metrics": "growth-metrics",
    "revenue-operations": "Revenue OS + Ozzie",
    "sales-call-ai": "Sales-call transcription + Hermes",
    "klaviyo-integrations": "Klaviyo integrations",
    "sales-intelligence": "Sales intelligence"
  });

  document.addEventListener("click", (event) => {
    const enquiry = event.target.closest("[data-project-enquiry]");
    if (!enquiry || !projectContext) return;
    // Keep context separate from the visitor's message and out of analytics.
    const name = projectNames[enquiry.dataset.projectEnquiry];
    if (typeof name === "string") projectContext.value = name;
  });

  let submitting = false;
  let resetTimer;
  const buttonContents = Array.from(submitButton.childNodes);

  const restoreForm = () => {
    window.clearTimeout(resetTimer);
    submitting = false;
    submitButton.disabled = false;
    submitButton.replaceChildren(...buttonContents);
    form.removeAttribute("aria-busy");
    formStatus.textContent = "";
    delete formStatus.dataset.state;
  };

  // Restore controls when returning from the provider, including the back/forward cache.
  window.addEventListener("pageshow", restoreForm);

  form.addEventListener("submit", (event) => {
    if (submitting) {
      event.preventDefault();
      return;
    }

    // Let the browser POST directly so provider activation and CAPTCHA can be shown.
    // Do not infer success, clear the visitor's message, or automatically retry a POST.
    const nextPage = form.querySelector('input[name="_next"]');
    if (nextPage) {
      const isWebPage = ["http:", "https:"].includes(window.location.protocol);
      nextPage.disabled = !isWebPage;
      if (isWebPage) nextPage.value = new URL("thanks.html", window.location.href).href;
    }

    submitting = true;
    submitButton.disabled = true;
    submitButton.textContent = "Continue to FormSubmit...";
    form.setAttribute("aria-busy", "true");
    formStatus.textContent = "Continue on FormSubmit to finish sending your message.";
    formStatus.dataset.state = "pending";
    track("form_submit_attempt", "contact_form_native");

    // If navigation is blocked by a preview, leave the form available to try in a browser.
    resetTimer = window.setTimeout(() => {
      restoreForm();
      formStatus.textContent = "If FormSubmit did not open, open this site in your browser and try again.";
      formStatus.dataset.state = "error";
    }, 15000);
  });
})();
