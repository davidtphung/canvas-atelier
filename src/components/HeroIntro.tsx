import './HeroIntro.css';

/** Compact editorial header above the canvas — museum wall label energy */
export function HeroIntro() {
  return (
    <div className="hero-intro">
      <p className="hero-kicker micro">Studio · Poster system</p>
      <h1 className="hero-title">Compose with restraint</h1>
      <p className="hero-lede">
        Spilled ink mode: drag with your finger, mouse, or trackpad — puddles smear,
        part, and settle like wet paint. Scroll the trackpad to shove ink. Export a
        modernist poster calm enough for a museum wall.
      </p>
    </div>
  );
}
