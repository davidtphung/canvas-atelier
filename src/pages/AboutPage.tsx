import { Link, useSearchParams } from 'react-router-dom';
import { TopBar } from '../components/TopBar';
import { ViewCounter } from '../components/ViewCounter';
import { useStudioStore } from '../store/useStudioStore';
import { DonatePanel } from './DonatePanel';
import './AboutPage.css';

type AboutTab = 'about' | 'donate';

export function AboutPage() {
  const a11y = useStudioStore((s) => s.a11y);
  const [params] = useSearchParams();
  const tab: AboutTab = params.get('tab') === 'donate' ? 'donate' : 'about';

  return (
    <div className={`app-shell about-shell ${a11y.largeTargets ? 'large-targets' : ''}`}>
      <a href="#about-main" className="skip-link">
        Skip to about
      </a>
      <TopBar />

      <main className="about-page" id="about-main">
        <div className="about-tabs" role="tablist" aria-label="About sections">
          <Link
            to="/about"
            role="tab"
            id="tab-about"
            aria-selected={tab === 'about'}
            aria-controls="panel-about"
            className={`about-tab ${tab === 'about' ? 'is-active' : ''}`}
            replace
          >
            About
          </Link>
          <Link
            to="/about?tab=donate"
            role="tab"
            id="tab-donate"
            aria-selected={tab === 'donate'}
            aria-controls="panel-donate"
            className={`about-tab ${tab === 'donate' ? 'is-active' : ''}`}
            replace
          >
            Donate
          </Link>
        </div>

        {tab === 'about' ? (
          <div
            role="tabpanel"
            id="panel-about"
            aria-labelledby="tab-about"
            className="about-panel"
          >
            <header className="about-hero">
              <p className="micro about-kicker">About · Studio</p>
              <h1 className="about-title">Canvas Atelier</h1>
              <p className="about-lede">
                A museum-quality generative art studio for abstract modernist posters,
                cream paper, a fine grid, and organic ink that moves like spilled paint.
              </p>
            </header>

            <div className="about-art" aria-hidden="true">
              <svg viewBox="0 0 400 220" className="about-mark">
                <rect width="400" height="220" fill="var(--canvas-paper, #F4EFE6)" />
                <g stroke="currentColor" strokeOpacity="0.08" strokeWidth="1">
                  <path d="M40 0v220M80 0v220M120 0v220M160 0v220M200 0v220M240 0v220M280 0v220M320 0v220M360 0v220" />
                  <path d="M0 40h400M0 80h400M0 120h400M0 160h400M0 200h400" />
                </g>
                <path
                  fill="var(--canvas-ink, #1A1A1A)"
                  d="M48 150c-4-40 22-72 55-78 26-5 48 6 62 24 16 20 20 44 8 64-14 24-40 38-70 38-28 0-50-14-55-48z"
                />
                <ellipse
                  cx="280"
                  cy="62"
                  rx="48"
                  ry="38"
                  fill="var(--canvas-ink, #1A1A1A)"
                  transform="rotate(-18 280 62)"
                />
                <ellipse
                  cx="320"
                  cy="150"
                  rx="36"
                  ry="42"
                  fill="var(--canvas-ink, #1A1A1A)"
                  transform="rotate(12 320 150)"
                />
                <ellipse
                  cx="130"
                  cy="118"
                  rx="22"
                  ry="20"
                  fill="var(--canvas-paper, #F4EFE6)"
                  transform="rotate(10 130 118)"
                />
                <circle cx="300" cy="88" r="12" fill="var(--canvas-paper, #F4EFE6)" />
              </svg>
            </div>

            <section className="about-section">
              <h2 className="section-label">Compose with restraint</h2>
              <p>
                Canvas Atelier is a quiet, tactile studio for making abstract posters. It draws
                from mid-century modernism, Eames-era clarity, Apple Human Interface restraint,
                and the editorial calm of pages like Thinking Machines Inkling announcement,
                not as a clone, but as a standard of intention.
              </p>
              <p>
                The default surface is archival cream paper with a drafting grid. Forms are
                organic charcoal masses with cutouts. You can spill ink with your finger, mouse,
                or trackpad; press harder for larger pools; shove paint with a two-finger scroll;
                and export stills or motion when the composition feels finished.
              </p>
            </section>

            <section className="about-section">
              <h2 className="section-label">What you can do</h2>
              <ul className="about-list">
                <li>
                  <strong>Paint</strong>: Liquid ink brush with real spill physics
                </li>
                <li>
                  <strong>Compose</strong>: Styles, grid, cutouts, natural-language refine
                </li>
                <li>
                  <strong>Format</strong>: Real art-world canvas sizes, portrait or landscape
                </li>
                <li>
                  <strong>Export</strong>: High-res PNG and H.264 MP4 for QuickTime
                </li>
                <li>
                  <strong>Save</strong>: Local project library and JSON files
                </li>
              </ul>
            </section>

            <section className="about-section">
              <h2 className="section-label">Credits</h2>
              <p>
                Built by{' '}
                <a
                  href="https://x.com/davidtphung"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-link"
                >
                  David T Phung
                </a>
                .
              </p>
              <p>
                Created by <strong>NLT143 RESEARCH</strong>.
              </p>
              <p className="about-meta">
                Open studio · generative craft · museum-grade restraint
              </p>
            </section>

            <footer className="about-footer">
              <Link to="/" className="btn btn-primary">
                Open the studio
              </Link>
              <Link to="/about?tab=donate" className="btn btn-secondary" replace>
                Donate
              </Link>
              <a
                href="https://x.com/davidtphung"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
              >
                @davidtphung
              </a>
            </footer>
          </div>
        ) : (
          <div
            role="tabpanel"
            id="panel-donate"
            aria-labelledby="tab-donate"
            className="about-panel"
          >
            <DonatePanel />
            <footer className="about-footer">
              <Link to="/" className="btn btn-primary">
                Open the studio
              </Link>
              <Link to="/about" className="btn btn-secondary" replace>
                About
              </Link>
            </footer>
          </div>
        )}

        <ViewCounter variant="plaque" />
      </main>
    </div>
  );
}
