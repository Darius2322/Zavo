import React, { useState, useEffect, useRef } from "react";

// Each slide can specify a different focal point per breakpoint so the
// important subject (hands, garment, machine) never gets cropped out —
// set via CSS custom properties consumed by the stylesheet below.
const DEFAULT_SLIDES = [
  { src: "/images/hero-folded-shirts.jpg", alt: "Neatly folded shirts", posDesktop: "center 30%", posMobile: "center 20%" },
  { src: "/images/laundromat-wide.jpg", alt: "Rows of commercial washing machines", posDesktop: "center 55%", posMobile: "center 60%" },
  { src: "/images/sweaters-closeup.jpg", alt: "Freshly folded sweaters", posDesktop: "center 45%", posMobile: "center 40%" },
  { src: "/images/iron-closeup-teal.jpg", alt: "Iron ready on the board", posDesktop: "left center", posMobile: "left center" },
];

const SLIDE_MS = 6500; // how long each image stays before crossfading
const FADE_MS = 1800; // crossfade duration

export function HeroSlideshow({ slides = DEFAULT_SLIDES, children, minHeight = 560 }) {
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0); // bumped every slide change so the Ken Burns animation restarts cleanly
  const reducedMotion = useRef(typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
      setCycle((c) => c + 1);
    }, SLIDE_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <div style={{ position: "relative", minHeight, overflow: "hidden", display: "flex", alignItems: "center" }}>
      {slides.map((s, i) => (
        <img
          key={`${i}-${i === index ? cycle : "idle"}`}
          src={s.src}
          alt={i === index ? s.alt : ""}
          aria-hidden={i !== index}
          className={i === index ? "hero-slide hero-slide-active" : "hero-slide"}
          style={{
            "--pos-desktop": s.posDesktop || "center",
            "--pos-mobile": s.posMobile || s.posDesktop || "center",
            opacity: i === index ? 1 : 0,
            transitionDuration: `${FADE_MS}ms`,
            animationDuration: reducedMotion.current ? "0ms" : `${SLIDE_MS + FADE_MS}ms`,
          }}
        />
      ))}
      {/* Neutral scrim — kept light so the photos stay the visual focus;
          slightly stronger toward the bottom-left where the text sits. */}
      <div className="hero-scrim" />
      <div style={{ position: "relative", zIndex: 2, width: "100%" }}>{children}</div>

      <style>{`
        .hero-slide {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; object-position: var(--pos-desktop);
          transition-property: opacity; transition-timing-function: ease-in-out;
          transform: scale(1); will-change: transform, opacity;
        }
        .hero-slide-active { animation-name: nyota-ken-burns; animation-timing-function: ease-out; animation-fill-mode: forwards; }
        @keyframes nyota-ken-burns {
          from { transform: scale(1) translate(0, 0); }
          to   { transform: scale(1.06) translate(-1%, -1%); }
        }
        .hero-scrim {
          position: absolute; inset: 0; z-index: 1;
          background: linear-gradient(115deg, rgba(9,20,56,0.72) 0%, rgba(9,20,56,0.42) 42%, rgba(9,20,56,0.15) 75%);
        }
        @media (max-width: 640px) {
          .hero-slide { object-position: var(--pos-mobile); }
          .hero-scrim { background: linear-gradient(180deg, rgba(9,20,56,0.35) 0%, rgba(9,20,56,0.78) 65%, rgba(9,20,56,0.88) 100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-slide { animation: none !important; transition-duration: 400ms !important; }
        }
      `}</style>
    </div>
  );
}
