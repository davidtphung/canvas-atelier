import './HeroIntro.css';

/** Compact editorial header above the canvas — museum wall label energy */
export function HeroIntro() {
  return (
    <div className="hero-intro">
      <p className="hero-kicker micro">Studio · Poster system</p>
      <h1 className="hero-title">Compose with restraint</h1>
      <p className="hero-lede">
        Paint with the cursor — press harder for larger blobs (stylus pressure, or
        Shift for heavy / Alt for light on mouse). Drag to stroke; scroll to shove.
        Export a modernist poster calm enough for a museum wall.
      </p>
    </div>
  );
}
