(() => {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  for (const film of document.querySelectorAll("[data-agent-film]")) {
    const choices = [...film.querySelectorAll("[data-scene]")];
    const replay = film.querySelector(".film-replay");
    let animation;
    const animate = () => {
      animation?.revert();
      if (motion.matches || !window.gsap) return;
      const scene = film.querySelector("[data-scene-panel]:not([hidden])");
      animation = gsap.timeline();
      animation
        .from(scene.querySelector(".film-source"), {
          y: 15,
          opacity: 0,
          duration: 0.65,
          ease: "power3.out",
        })
        .from(
          scene.querySelectorAll(
            ".film-agent,.film-answer h3,.film-answer>p,.film-hint,.film-reference,.film-plan span",
          ),
          {
            y: 12,
            opacity: 0,
            stagger: 0.16,
            duration: 0.65,
            ease: "power2.out",
          },
          0.25,
        );
    };
    for (const choice of choices)
      choice.addEventListener("click", () => {
        animation?.revert();
        choices.forEach((button) => {
          const active = button === choice;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", String(active));
        });
        film
          .querySelectorAll("[data-scene-panel]")
          .forEach(
            (panel) =>
              (panel.hidden =
                panel.dataset.scenePanel !== choice.dataset.scene),
          );
        animate();
      });
    replay.addEventListener("click", animate);
    const preference = () => {
      if (motion.matches) animation?.revert();
      replay.disabled = motion.matches || !window.gsap;
      replay.textContent = motion.matches
        ? "Reduced motion enabled"
        : "Replay animation ↻";
    };
    motion.addEventListener("change", preference);
    preference();
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(film);
  }
})();

document.addEventListener("visibilitychange", () => {
  if (document.hidden)
    document
      .querySelectorAll(".agent-video-showcase video")
      .forEach((video) => video.pause());
});
