interface EgyptFlagProps {
  className?: string;
}

export function EgyptFlag({ className = "w-5 h-3.5" }: EgyptFlagProps) {
  return (
    <svg
      viewBox="0 0 900 600"
      className={`${className} rounded-[3px] shadow-xs border border-neutral-200 shrink-0 inline-block`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="علم مصر"
    >
      <rect width="900" height="200" fill="#C8102E" />
      <rect y="200" width="900" height="200" fill="#FFFFFF" />
      <rect y="400" width="900" height="200" fill="#000000" />
      <g transform="translate(450, 300) scale(0.6)">
        <path
          d="M-30,-75 C-15,-90 15,-90 30,-75 C45,-60 65,-40 75,10 C80,35 60,65 40,85 C25,95 -25,95 -40,85 C-60,65 -80,35 -75,10 C-65,-40 -45,-60 -30,-75 Z"
          fill="#C59B27"
        />
        <path d="M-10,-85 C-5,-105 15,-105 20,-85 C15,-70 -5,-70 -10,-85 Z" fill="#C59B27" />
        <path
          d="M-20,-20 L20,-20 L20,30 C20,45 0,60 0,60 C0,60 -20,45 -20,30 Z"
          fill="#FFFFFF"
          stroke="#C59B27"
          strokeWidth="3"
        />
        <rect x="-6" y="-20" width="12" height="60" fill="#C59B27" />
        <path d="M-35,85 L35,85 L25,105 L-25,105 Z" fill="#C59B27" />
      </g>
    </svg>
  );
}
