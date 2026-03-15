import { useId } from "react";

export function Leaf({ className = "h-7 w-7", style }: { className?: string; style?: React.CSSProperties }) {
  const id = useId();
  const gradientId = `leaf-grad-${id}`;

  return (
    <svg
      viewBox="0 0 48 48"
      className={`leaf-sway ${className}`}
      aria-hidden="true"
      style={style}
    >
      <path
        d="M34 7c-9 1-16 5-20 12-3 5-3 11-1 16 5 0 11-1 16-5C36 24 40 17 41 8c-2-1-4-1-7-1Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M15 34c6-5 11-10 16-17"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id={gradientId} x1="10" y1="8" x2="40" y2="37">
          {/* We now use CSS variables for the stops so the leaf follows the live theme */}
          <stop stopColor="var(--accent-light, #95D5B2)" />
          <stop offset="0.55" stopColor="var(--accent, #52B788)" />
          <stop offset="1" stopColor="var(--accent-dark, #2D6A4F)" />
        </linearGradient>
      </defs>
    </svg>
  );
}