import { useState } from 'react';
import {
  CRYPTO_METHODS,
  DONATE_COPY,
  VENMO_URL,
  X_PROFILE_URL,
  type CryptoMethod,
} from './donateData';

function CryptoCard({ method }: { method: CryptoMethod }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(method.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="donate-card">
      <div className="donate-card-head">
        <div className="donate-card-title-row">
          <span className="donate-asset-badge" aria-hidden="true">
            {method.key === 'btc' ? '₿' : method.name.slice(0, 1)}
          </span>
          <p className="donate-asset-name">{method.name}</p>
        </div>
        <p className="donate-network micro">{method.network}</p>
      </div>
      <div className="donate-address-row">
        <code className="donate-address" title={method.address}>
          {method.address}
        </code>
        <button
          type="button"
          className="btn btn-secondary donate-copy"
          onClick={() => void copy()}
          aria-label={copied ? `Copied ${method.name} address` : `Copy ${method.name} address`}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export function DonatePanel() {
  return (
    <div className="donate-panel">
      <header className="donate-hero">
        <p className="micro about-kicker">Support</p>
        <h2 className="donate-title">{DONATE_COPY.title}</h2>
        <p className="donate-intro">{DONATE_COPY.intro}</p>
      </header>

      <section className="donate-section" aria-labelledby="donate-methods-heading">
        <h3 id="donate-methods-heading" className="section-label">
          {DONATE_COPY.methodsHeading}
        </h3>

        <a
          href={VENMO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="donate-venmo"
        >
          <span className="donate-venmo-mark" aria-hidden="true">
            V
          </span>
          <span className="donate-venmo-text">
            <span className="donate-asset-name">{DONATE_COPY.venmoLabel}</span>
            <span className="donate-venmo-hint">{DONATE_COPY.venmoHint}</span>
          </span>
          <span className="donate-external" aria-hidden="true">
            ↗
          </span>
        </a>
      </section>

      <section className="donate-section" aria-labelledby="donate-crypto-heading">
        <h3 id="donate-crypto-heading" className="section-label">
          {DONATE_COPY.cryptoHeading}
        </h3>
        <div className="donate-crypto-list">
          {CRYPTO_METHODS.map((m) => (
            <CryptoCard key={m.key} method={m} />
          ))}
        </div>
      </section>

      <aside className="donate-disclaimer" aria-label="Donation notices">
        <p className="donate-disclaimer-title">Please note</p>
        <ul>
          {DONATE_COPY.disclaimers.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </aside>

      <p className="donate-questions">
        {DONATE_COPY.questions}{' '}
        <a
          href={X_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="about-link"
        >
          @davidtphung
        </a>{' '}
        {DONATE_COPY.onX}
      </p>
    </div>
  );
}
