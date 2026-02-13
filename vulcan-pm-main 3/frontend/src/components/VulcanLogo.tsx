import React from 'react';

interface VulcanLogoProps {
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: string;
}

const sizeMap = {
  sm: { icon: 24, text: 80, fontSize: 16 },
  md: { icon: 40, text: 120, fontSize: 24 },
  lg: { icon: 56, text: 160, fontSize: 32 },
  xl: { icon: 80, text: 240, fontSize: 48 },
};

// Starburst icon matching the reference - 16 pointed rays radiating from center
export const VulcanIcon: React.FC<{ size?: number; color?: string; className?: string }> = ({
  size = 40,
  color = 'currentColor',
  className = '',
}) => {
  // Generate rays programmatically for precision
  const rays: React.ReactNode[] = [];
  const numRays = 16;
  const centerX = 50;
  const centerY = 50;
  const innerRadius = 12;
  const outerRadius = 46;
  const rayWidth = 4;

  for (let i = 0; i < numRays; i++) {
    const angle = (i * 360) / numRays - 90; // Start from top
    const radians = (angle * Math.PI) / 180;

    // Calculate ray endpoints
    const innerX = centerX + innerRadius * Math.cos(radians);
    const innerY = centerY + innerRadius * Math.sin(radians);
    const outerX = centerX + outerRadius * Math.cos(radians);
    const outerY = centerY + outerRadius * Math.sin(radians);

    // Calculate perpendicular offsets for ray width (tapers to point)
    const perpAngle = radians + Math.PI / 2;
    const innerOffsetX = (rayWidth / 2) * Math.cos(perpAngle);
    const innerOffsetY = (rayWidth / 2) * Math.sin(perpAngle);

    rays.push(
      <polygon
        key={i}
        points={`
          ${outerX},${outerY}
          ${innerX - innerOffsetX},${innerY - innerOffsetY}
          ${innerX + innerOffsetX},${innerY + innerOffsetY}
        `}
        fill={color}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Center circle */}
      <circle cx={centerX} cy={centerY} r="8" fill={color} />
      {/* Rays */}
      {rays}
    </svg>
  );
};

// VULCAN text in geometric sans-serif style matching the reference
export const VulcanText: React.FC<{ width?: number; color?: string; className?: string }> = ({
  width = 200,
  color = 'currentColor',
  className = '',
}) => (
  <svg
    width={width}
    height={width * 0.19}
    viewBox="0 0 448 85"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <g fill={color}>
      {/* V - geometric with angled strokes */}
      <polygon points="0,5 14,5 32,62 50,5 64,5 40,80 24,80" />

      {/* U - rounded bottom */}
      <path d="M74,5 L88,5 L88,52 C88,62 96,70 110,70 C124,70 132,62 132,52 L132,5 L146,5 L146,54 C146,72 130,82 110,82 C90,82 74,72 74,54 Z" />

      {/* L - simple */}
      <polygon points="158,5 172,5 172,68 210,68 210,80 158,80" />

      {/* C - geometric curve */}
      <path d="M240,5 C262,5 276,14 282,26 L268,34 C264,26 254,18 240,18 C222,18 210,32 210,42.5 C210,53 222,67 240,67 C254,67 264,59 268,51 L282,59 C276,71 262,80 240,80 C214,80 196,64 196,42.5 C196,21 214,5 240,5 Z" />

      {/* A - with flat top (distinctive feature) */}
      <path d="M286,80 L302,80 L308,62 L340,62 L346,80 L362,80 L332,5 L316,5 Z M312,50 L324,18 L336,50 Z" />

      {/* N - angled middle stroke */}
      <polygon points="374,5 388,5 388,50 424,5 438,5 438,80 424,80 424,35 388,80 374,80" />
    </g>
  </svg>
);

export const VulcanLogo: React.FC<VulcanLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  color = 'currentColor',
}) => {
  const dimensions = sizeMap[size];

  if (variant === 'icon') {
    return <VulcanIcon size={dimensions.icon} color={color} className={className} />;
  }

  if (variant === 'text') {
    return <VulcanText width={dimensions.text} color={color} className={className} />;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <VulcanIcon size={dimensions.icon} color={color} />
      <VulcanText width={dimensions.text} color={color} />
    </div>
  );
};

export default VulcanLogo;
