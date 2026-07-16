import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function base(props: IconProps, paths: ReactNode) {
  const { title, ...rest } = props;
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {paths}
    </svg>
  );
}

export const Icons = {
  select: (p: IconProps) =>
    base(p, <path d="M4 4l7 16 2.5-6.5L20 11 4 4z" />),
  blob: (p: IconProps) =>
    base(
      p,
      <path d="M12 4c3.5 0 6 2.2 6.5 5.2.6 3.5-1.2 6.3-3.8 7.5-2.2 1-4.7.6-6.4-1.1C5.8 13.1 5 10.2 6.2 7.8 7.5 5.2 9.6 4 12 4z" />,
    ),
  ink: (p: IconProps) =>
    base(
      p,
      <>
        <path d="M7 14c0-3 2-5 5-6 2-.7 4 0 5.5 2 1.2 1.6 1.5 3.5.5 5.2-1.2 2-3.5 3.3-6 3.3-2.8 0-5-1.8-5-4.5z" />
        <path d="M9 9c.5-2 1.8-3.5 3.5-4.2" />
        <circle cx="15.5" cy="8" r="1.2" fill="currentColor" stroke="none" />
      </>,
    ),
  pen: (p: IconProps) =>
    base(p, <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />),
  hand: (p: IconProps) =>
    base(
      p,
      <path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12m0-4.5a1.5 1.5 0 0 1 3 0V12m0-3a1.5 1.5 0 0 1 3 0v5.5a5 5 0 0 1-5 5H11a5 5 0 0 1-4.6-3.1L4 14.5a1.5 1.5 0 0 1 2.5-1.6L8 15" />,
    ),
  subtract: (p: IconProps) =>
    base(
      p,
      <>
        <circle cx="10" cy="12" r="6" />
        <circle cx="15" cy="12" r="5" />
      </>,
    ),
  union: (p: IconProps) =>
    base(
      p,
      <>
        <circle cx="9" cy="12" r="5.5" />
        <circle cx="15" cy="12" r="5.5" />
      </>,
    ),
  grid: (p: IconProps) =>
    base(
      p,
      <>
        <rect x="4" y="4" width="16" height="16" rx="1" />
        <path d="M4 12h16M12 4v16" />
      </>,
    ),
  layers: (p: IconProps) =>
    base(
      p,
      <>
        <path d="M12 3l9 5-9 5-9-5 9-5z" />
        <path d="M3 13l9 5 9-5" />
      </>,
    ),
  upload: (p: IconProps) =>
    base(
      p,
      <>
        <path d="M12 16V5M8 8l4-4 4 4" />
        <path d="M4 19h16" />
      </>,
    ),
  download: (p: IconProps) =>
    base(
      p,
      <>
        <path d="M12 4v11M8 11l4 4 4-4" />
        <path d="M4 19h16" />
      </>,
    ),
  save: (p: IconProps) =>
    base(
      p,
      <>
        <path d="M5 4h11l3 3v13H5V4z" />
        <path d="M9 4v5h7M9 18v-5h6v5" />
      </>,
    ),
  undo: (p: IconProps) => base(p, <path d="M9 14L4 9l5-5M4 9h10a5 5 0 1 1 0 10h-2" />),
  redo: (p: IconProps) => base(p, <path d="M15 14l5-5-5-5M20 9H10a5 5 0 1 0 0 10h2" />),
  play: (p: IconProps) => base(p, <path d="M8 5v14l11-7L8 5z" fill="currentColor" stroke="none" />),
  pause: (p: IconProps) =>
    base(
      p,
      <>
        <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
        <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
      </>,
    ),
  spark: (p: IconProps) =>
    base(p, <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />),
  settings: (p: IconProps) =>
    base(
      p,
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
      </>,
    ),
  library: (p: IconProps) =>
    base(
      p,
      <>
        <rect x="4" y="5" width="5" height="14" rx="1" />
        <rect x="10" y="5" width="5" height="14" rx="1" />
        <path d="M18 6l2 13h-5l2-13z" />
      </>,
    ),
  eye: (p: IconProps) =>
    base(
      p,
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
        <circle cx="12" cy="12" r="2.5" />
      </>,
    ),
  eyeOff: (p: IconProps) =>
    base(
      p,
      <>
        <path d="M3 3l18 18M10.5 6.2A9 9 0 0 1 12 6c6.5 0 10 6 10 6a16 16 0 0 1-3.2 3.7M7 7.5A15 15 0 0 0 2 12s3.5 6 10 6c1.3 0 2.5-.2 3.6-.6" />
      </>,
    ),
  lock: (p: IconProps) =>
    base(
      p,
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </>,
    ),
  unlock: (p: IconProps) =>
    base(
      p,
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 7.5-2" />
      </>,
    ),
  duplicate: (p: IconProps) =>
    base(
      p,
      <>
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>,
    ),
  trash: (p: IconProps) =>
    base(
      p,
      <>
        <path d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12" />
      </>,
    ),
  close: (p: IconProps) => base(p, <path d="M6 6l12 12M18 6L6 18" />),
  help: (p: IconProps) =>
    base(
      p,
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1.9-1.1 1.8V14" />
        <circle cx="12" cy="17" r="0.6" fill="currentColor" />
      </>,
    ),
  menu: (p: IconProps) =>
    base(
      p,
      <>
        <path d="M5 8h14M5 12h14M5 16h14" />
      </>,
    ),
  chevronLeft: (p: IconProps) => base(p, <path d="M14 6l-6 6 6 6" />),
  chevronRight: (p: IconProps) => base(p, <path d="M10 6l6 6-6 6" />),
  alive: (p: IconProps) =>
    base(
      p,
      <path d="M4 14c2-6 4-8 8-8s6 2 8 8c-2 2-5 3-8 3s-6-1-8-3zM9 12c.5-1 1.5-1.5 3-1.5" />,
    ),
  sun: (p: IconProps) =>
    base(
      p,
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>,
    ),
  moon: (p: IconProps) =>
    base(p, <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z" />),
  system: (p: IconProps) =>
    base(
      p,
      <>
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>,
    ),
};
