import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const ChatsIcon = () => (
  <svg {...base}>
    <path d="M4 18.5V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H8.5L4 20z" />
  </svg>
);

export const ComposeIcon = () => (
  <svg {...base}>
    <path d="M12 20h8" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);

export const LogoutIcon = () => (
  <svg {...base}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const SearchIcon = () => (
  <svg {...base} width={18} height={18}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

export const SendIcon = () => (
  <svg {...base} width={20} height={20} fill="currentColor" stroke="none">
    <path d="M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a.99.99 0 0 0-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" />
  </svg>
);

export const BackIcon = () => (
  <svg {...base}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const CloseIcon = () => (
  <svg {...base} width={20} height={20}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export const CheckIcon = ({ double }: { double?: boolean }) => (
  <svg {...base} width={16} height={16} viewBox="0 0 16 16" strokeWidth={1.6}>
    {double ? (
      <>
        <path d="M1.5 8.5l3 3 6-7" />
        <path d="M7.5 11.5l6-7" />
      </>
    ) : (
      <path d="M3 8.5l3 3 7-7.5" />
    )}
  </svg>
);

export const ClockIcon = () => (
  <svg {...base} width={14} height={14} viewBox="0 0 16 16" strokeWidth={1.5}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 5v3l2 1.5" />
  </svg>
);
