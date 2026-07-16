import { useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { Icons } from './icons';
import './Onboarding.css';

const STEPS = [
  {
    title: 'Paint the paper',
    body: 'The canvas fills your screen. Use Paint (I) and drag. Harder press makes larger ink. Empty canvas clears the paper.',
  },
  {
    title: 'Tools that matter',
    body: 'Paint, Select, Move on the rail. Grid, Layers, Upload, Alive when you need them. Settings holds size, style, and refine.',
  },
  {
    title: 'Export when ready',
    body: 'Save locally, export PNG or H.264 MP4. About and Donate live in the top nav.',
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
