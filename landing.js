const revealTargets = [
  ".section-heading",
  ".value-grid article",
  ".workflow-band",
  ".pricing-card",
  ".final-cta"
];

document.documentElement.classList.add("motion-ready");

const elements = document.querySelectorAll(revealTargets.join(","));
elements.forEach((element, index) => {
  element.classList.add("reveal-on-scroll");
  element.style.setProperty("--reveal-delay", `${Math.min(index * 55, 260)}ms`);
});

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.14,
    rootMargin: "0px 0px -8% 0px"
  });

  elements.forEach((element) => observer.observe(element));
} else {
  elements.forEach((element) => element.classList.add("is-visible"));
}
