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

  const form = document.getElementById("contact-form");
  const formStatus = document.getElementById("form-status");
  const submitButton = document.getElementById("submit-message");
  if (!form || !formStatus || !submitButton) return;

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
