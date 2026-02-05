import React from 'react';
import ProductIcon from './ProductIcon';
import { Project } from '../types';

interface ProductChipProps {
  project: Project | {
    id: string;
    name: string;
    key?: string;
    imageUrl?: string;
    icon?: string;
    iconColor?: string;
    color?: string;
  };
  size?: 'xs' | 'sm' | 'md';
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

const ProductChip: React.FC<ProductChipProps> = ({
  project,
  size = 'sm',
  onClick,
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(e);
    }
  };

  // Size configurations
  const sizeConfig = {
    xs: {
      iconSize: 'xs' as const,
      padding: 'px-2 py-1',
      gap: 'gap-1.5',
      text: 'text-[11px]',
    },
    sm: {
      iconSize: 'xs' as const,
      padding: 'px-3 py-1.5',
      gap: 'gap-2',
      text: 'text-xs',
    },
    md: {
      iconSize: 'sm' as const,
      padding: 'px-4 py-2',
      gap: 'gap-2',
      text: 'text-sm',
    },
  };

  const config = sizeConfig[size];

  // Glass morphism styles
  const glassStyle: React.CSSProperties = {
    background: 'linear-gradient(0deg, rgba(230, 230, 230, 0.15), rgba(230, 230, 230, 0.15)), rgba(51, 51, 51, 0.25)',
    backgroundBlendMode: 'plus-darker, normal',
    boxShadow: `
      0px 0px 2px rgba(0, 0, 0, 0.08),
      0px 1px 6px rgba(0, 0, 0, 0.08),
      inset 1px 1px 1px 0.5px rgba(255, 255, 255, 0.5),
      inset -1px -1px 1px 0.5px rgba(255, 255, 255, 0.3),
      inset 0px 0px 1px 1px rgba(255, 255, 255, 0.1),
      inset 0px 0px 12px rgba(255, 255, 255, 0.1)
    `,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  };

  // Dark mode glass styles
  const darkGlassStyle: React.CSSProperties = {
    background: 'linear-gradient(0deg, rgba(40, 40, 50, 0.6), rgba(40, 40, 50, 0.6)), rgba(20, 20, 30, 0.4)',
    backgroundBlendMode: 'plus-darker, normal',
    boxShadow: `
      0px 0px 2px rgba(0, 0, 0, 0.2),
      0px 1px 8px rgba(0, 0, 0, 0.15),
      inset 1px 1px 1px 0.5px rgba(255, 255, 255, 0.08),
      inset -1px -1px 1px 0.5px rgba(255, 255, 255, 0.04),
      inset 0px 0px 1px 1px rgba(255, 255, 255, 0.05),
      inset 0px 0px 16px rgba(100, 100, 120, 0.1)
    `,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  };

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center ${config.gap} ${config.padding}
        ${config.text} font-semibold tracking-tight
        text-gray-700 dark:text-white/90
        rounded-full
        border border-white/20 dark:border-white/10
        hover:scale-[1.02] hover:brightness-105
        active:scale-[0.98]
        transition-all duration-150 ease-out
        product-chip-glass
        ${className}
      `}
      style={glassStyle}
    >
      <ProductIcon project={project} size={config.iconSize} className="shadow-sm" />
      <span className="truncate max-w-[120px]">{project.name}</span>

      {/* Inline style tag for dark mode */}
      <style>{`
        .dark .product-chip-glass {
          background: linear-gradient(0deg, rgba(40, 40, 50, 0.6), rgba(40, 40, 50, 0.6)), rgba(20, 20, 30, 0.4) !important;
          box-shadow:
            0px 0px 2px rgba(0, 0, 0, 0.2),
            0px 1px 8px rgba(0, 0, 0, 0.15),
            inset 1px 1px 1px 0.5px rgba(255, 255, 255, 0.08),
            inset -1px -1px 1px 0.5px rgba(255, 255, 255, 0.04),
            inset 0px 0px 1px 1px rgba(255, 255, 255, 0.05),
            inset 0px 0px 16px rgba(100, 100, 120, 0.1) !important;
        }
        .dark .product-chip-glass:hover {
          background: linear-gradient(0deg, rgba(50, 50, 60, 0.7), rgba(50, 50, 60, 0.7)), rgba(30, 30, 40, 0.5) !important;
        }
        .product-chip-glass:hover {
          background: linear-gradient(0deg, rgba(240, 240, 240, 0.2), rgba(240, 240, 240, 0.2)), rgba(60, 60, 60, 0.25) !important;
        }
      `}</style>
    </button>
  );
};

export default ProductChip;
