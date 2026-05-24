import type { SVGProps } from "react";

export function ShoenMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="38" height="38" rx="12" fill="currentColor" opacity="0.12" />
      <path d="M13 28c5-12 13-12 18 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 20h12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

