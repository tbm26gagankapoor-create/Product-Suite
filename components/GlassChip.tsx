import React from 'react';
import { LucideIcon } from 'lucide-react';

type ChipVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'pink' | 'cyan';
type ChipSize = 'xs' | 'sm' | 'md';

interface GlassChipProps {
  children: React.ReactNode;
  variant?: ChipVariant;
  size?: ChipSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  pill?: boolean;
}

// Variant-specific tint colors for the glass effect
const variantStyles: Record<ChipVariant, { light: string; dark: string; text: string; darkText: string }> = {
  default: {
    light: 'rgba(120, 120, 130, 0.15)',
    dark: 'rgba(60, 60, 70, 0.4)',
    text: 'text-gray-700',
    darkText: 'dark:text-gray-200',
  },
  primary: {
    light: 'rgba(59, 130, 246, 0.15)',
    dark: 'rgba(59, 130, 246, 0.25)',
    text: 'text-blue-700',
    darkText: 'dark:text-blue-300',
  },
  success: {
    light: 'rgba(34, 197, 94, 0.15)',
    dark: 'rgba(34, 197, 94, 0.25)',
    text: 'text-emerald-700',
    darkText: 'dark:text-emerald-300',
  },
  warning: {
    light: 'rgba(245, 158, 11, 0.15)',
    dark: 'rgba(245, 158, 11, 0.25)',
    text: 'text-amber-700',
    darkText: 'dark:text-amber-300',
  },
  danger: {
    light: 'rgba(239, 68, 68, 0.15)',
    dark: 'rgba(239, 68, 68, 0.25)',
    text: 'text-red-700',
    darkText: 'dark:text-red-300',
  },
  purple: {
    light: 'rgba(147, 51, 234, 0.15)',
    dark: 'rgba(147, 51, 234, 0.25)',
    text: 'text-purple-700',
    darkText: 'dark:text-purple-300',
  },
  pink: {
    light: 'rgba(236, 72, 153, 0.15)',
    dark: 'rgba(236, 72, 153, 0.25)',
    text: 'text-pink-700',
    darkText: 'dark:text-pink-300',
  },
  cyan: {
    light: 'rgba(6, 182, 212, 0.15)',
    dark: 'rgba(6, 182, 212, 0.25)',
    text: 'text-cyan-700',
    darkText: 'dark:text-cyan-300',
  },
};

const sizeStyles: Record<ChipSize, { padding: string; text: string; iconSize: number; gap: string }> = {
  xs: { padding: 'px-1.5 py-0.5', text: 'text-[9px]', iconSize: 10, gap: 'gap-1' },
  sm: { padding: 'px-2 py-1', text: 'text-[10px]', iconSize: 12, gap: 'gap-1.5' },
  md: { padding: 'px-2.5 py-1.5', text: 'text-xs', iconSize: 14, gap: 'gap-1.5' },
};

const GlassChip: React.FC<GlassChipProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  pill = false,
}) => {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const glassStyle: React.CSSProperties = {
    background: `linear-gradient(0deg, ${variantStyle.light}, ${variantStyle.light}), rgba(51, 51, 51, 0.08)`,
    backgroundBlendMode: 'plus-darker, normal',
    boxShadow: `
      0px 0px 1px rgba(0, 0, 0, 0.06),
      0px 1px 4px rgba(0, 0, 0, 0.06),
      inset 1px 1px 1px 0px rgba(255, 255, 255, 0.4),
      inset -1px -1px 1px 0px rgba(255, 255, 255, 0.2),
      inset 0px 0px 1px 0.5px rgba(255, 255, 255, 0.1),
      inset 0px 0px 8px rgba(255, 255, 255, 0.08)
    `,
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  };

  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      onClick={onClick}
      className={`
        inline-flex items-center ${sizeStyle.gap} ${sizeStyle.padding}
        ${sizeStyle.text} font-semibold uppercase tracking-wide
        ${variantStyle.text} ${variantStyle.darkText}
        ${pill ? 'rounded-full' : 'rounded-md'}
        border border-white/20 dark:border-white/10
        ${onClick ? 'hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] cursor-pointer' : ''}
        transition-all duration-150 ease-out
        glass-chip glass-chip-${variant}
        ${className}
      `}
      style={glassStyle}
    >
      {Icon && iconPosition === 'left' && <Icon size={sizeStyle.iconSize} />}
      {children}
      {Icon && iconPosition === 'right' && <Icon size={sizeStyle.iconSize} />}

      <style>{`
        .dark .glass-chip-default {
          background: linear-gradient(0deg, rgba(60, 60, 70, 0.4), rgba(60, 60, 70, 0.4)), rgba(20, 20, 25, 0.3) !important;
        }
        .dark .glass-chip-primary {
          background: linear-gradient(0deg, rgba(59, 130, 246, 0.25), rgba(59, 130, 246, 0.25)), rgba(20, 20, 30, 0.3) !important;
        }
        .dark .glass-chip-success {
          background: linear-gradient(0deg, rgba(34, 197, 94, 0.25), rgba(34, 197, 94, 0.25)), rgba(20, 25, 20, 0.3) !important;
        }
        .dark .glass-chip-warning {
          background: linear-gradient(0deg, rgba(245, 158, 11, 0.25), rgba(245, 158, 11, 0.25)), rgba(25, 22, 15, 0.3) !important;
        }
        .dark .glass-chip-danger {
          background: linear-gradient(0deg, rgba(239, 68, 68, 0.25), rgba(239, 68, 68, 0.25)), rgba(25, 18, 18, 0.3) !important;
        }
        .dark .glass-chip-purple {
          background: linear-gradient(0deg, rgba(147, 51, 234, 0.25), rgba(147, 51, 234, 0.25)), rgba(22, 18, 28, 0.3) !important;
        }
        .dark .glass-chip-pink {
          background: linear-gradient(0deg, rgba(236, 72, 153, 0.25), rgba(236, 72, 153, 0.25)), rgba(25, 18, 22, 0.3) !important;
        }
        .dark .glass-chip-cyan {
          background: linear-gradient(0deg, rgba(6, 182, 212, 0.25), rgba(6, 182, 212, 0.25)), rgba(15, 22, 25, 0.3) !important;
        }
        .dark .glass-chip {
          box-shadow:
            0px 0px 1px rgba(0, 0, 0, 0.15),
            0px 1px 4px rgba(0, 0, 0, 0.1),
            inset 1px 1px 1px 0px rgba(255, 255, 255, 0.06),
            inset -1px -1px 1px 0px rgba(255, 255, 255, 0.03),
            inset 0px 0px 1px 0.5px rgba(255, 255, 255, 0.04),
            inset 0px 0px 12px rgba(255, 255, 255, 0.03) !important;
        }
      `}</style>
    </Component>
  );
};

export default GlassChip;
