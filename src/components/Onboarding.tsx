import { useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { Icons } from './icons';
import './Onboarding.css';

const STEPS = [
  {
    title: 'A finished poster, already',
    body: 'Canvas Atelier opens with a curated modernist composition — cream paper, fine grid, and organic charcoal forms. You begin inside a museum object, not an empty tool.',
  },
  {
    title: 'Spilled ink — finger & trackpad',
    body: 'Open Spilled ink (I). Press and drag like a finger through wet paint: puddles smear with viscous lag, grow under pressure, and drip along long strokes. Hover parts nearby ink; two-finger trackpad scroll shoves the composition. Mouse, trackpad, and touch all work.',
  },
  {
    title: 'Influence from images',
    body: 'Upload a photo as reference, texture, or tracing guide. Threshold, blur, and influence controls turn light and shadow into soft vector contours.',
  },
  {
    title: 'Refine in language',
    body: 'Ask for “more asymmetric,” “increase negative space,” or “calmer and more museum-like.” The studio rebalances composition with intent, not noise.',
  },
  {
    title: 'Export stills and motion',
    body: 'Save crisp PNG posters, record a short living MP4 (or WebM fallback), and keep full project JSON for later versions. Your work stays printable, shareable, and editable.',
  },
];

export function Onboarding() {
  const open = useStudioStore((s) => s.onboardingOpen);
  const setOnboarding = useStudioStore((s) => s.setOnboarding);
  const [step, setStep] = useState(0);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="modal-backdrop onboarding-backdrop" role="presentation">
      <div
        className="modal onboarding-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <div className="onboarding-kicker micro">Studio tour · {step + 1} of {STEPS.length}</div>
        <h2 id="onboarding-title">{current.title}</h2>
        <p className="onboarding-body">{current.body}</p>

        <div className="onboarding-dots" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? 'is-active' : ''} />
          ))}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setOnboarding(false)}>
            Skip
          </button>
          {!isLast ? (
            <button type="button" className="btn btn-primary" onClick={() => setStep((s) => s + 1)}>
              Continue
              <Icons.chevronRight />
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setOnboarding(false)}>
              Enter the atelier
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
