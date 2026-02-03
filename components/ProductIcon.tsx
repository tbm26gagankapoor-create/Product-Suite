import React, { useState, useEffect } from 'react';
import {
  Rocket, Target, Zap, Layers, Globe, Shield, Cpu, Database,
  Sparkles, Lightbulb, Package, Briefcase, Compass, Gem, Flame,
  Box, ChevronsRight, Star, Heart, Crown, Hexagon, Circle, Square,
  Triangle, Diamond, Aperture, Atom, Award, Bell, Bolt, Book,
  type LucideIcon
} from 'lucide-react';

// Available icons for products - exported for use in IconPickerModal
export const PRODUCT_ICONS: { name: string; Icon: LucideIcon }[] = [
  { name: 'Rocket', Icon: Rocket },
  { name: 'Target', Icon: Target },
  { name: 'Zap', Icon: Zap },
  { name: 'Layers', Icon: Layers },
  { name: 'Globe', Icon: Globe },
  { name: 'Shield', Icon: Shield },
  { name: 'Cpu', Icon: Cpu },
  { name: 'Database', Icon: Database },
  { name: 'Sparkles', Icon: Sparkles },
  { name: 'Lightbulb', Icon: Lightbulb },
  { name: 'Package', Icon: Package },
  { name: 'Briefcase', Icon: Briefcase },
  { name: 'Compass', Icon: Compass },
  { name: 'Gem', Icon: Gem },
  { name: 'Flame', Icon: Flame },
  { name: 'Star', Icon: Star },
  { name: 'Heart', Icon: Heart },
  { name: 'Crown', Icon: Crown },
  { name: 'Hexagon', Icon: Hexagon },
  { name: 'Circle', Icon: Circle },
  { name: 'Square', Icon: Square },
  { name: 'Triangle', Icon: Triangle },
  { name: 'Diamond', Icon: Diamond },
  { name: 'Aperture', Icon: Aperture },
  { name: 'Atom', Icon: Atom },
  { name: 'Award', Icon: Award },
  { name: 'Bell', Icon: Bell },
  { name: 'Bolt', Icon: Bolt },
  { name: 'Book', Icon: Book },
  { name: 'Box', Icon: Box },
];

// Available gradients for products - exported for use in IconPickerModal
export const PRODUCT_GRADIENTS = [
  { name: 'Violet Purple', value: 'from-violet-500 to-purple-600' },
  { name: 'Blue Cyan', value: 'from-blue-500 to-cyan-500' },
  { name: 'Emerald Teal', value: 'from-emerald-500 to-teal-500' },
  { name: 'Orange Red', value: 'from-orange-500 to-red-500' },
  { name: 'Pink Rose', value: 'from-pink-500 to-rose-500' },
  { name: 'Indigo Blue', value: 'from-indigo-500 to-blue-500' },
  { name: 'Amber Orange', value: 'from-amber-500 to-orange-500' },
  { name: 'Cyan Blue', value: 'from-cyan-500 to-blue-500' },
  { name: 'Rose Pink', value: 'from-rose-500 to-pink-500' },
  { name: 'Lime Green', value: 'from-lime-500 to-green-500' },
  { name: 'Fuchsia Purple', value: 'from-fuchsia-500 to-purple-500' },
  { name: 'Sky Blue', value: 'from-sky-500 to-blue-500' },
];

// Get deterministic theme based on project ID (for fallback)
export const getProductTheme = (id: string) => {
  const icons = PRODUCT_ICONS.slice(0, 15); // Use first 15 icons for deterministic selection
  const gradients = PRODUCT_GRADIENTS;

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  const iconIndex = Math.abs(hash) % icons.length;
  const gradientIndex = Math.abs(hash) % gradients.length;

  return {
    Icon: icons[iconIndex].Icon,
    iconName: icons[iconIndex].name,
    gradient: gradients[gradientIndex].value,
  };
};

// Get icon component by name
export const getIconByName = (name: string): LucideIcon | null => {
  const found = PRODUCT_ICONS.find(i => i.name.toLowerCase() === name.toLowerCase());
  return found ? found.Icon : null;
};

export interface ProductIconData {
  imageUrl?: string;
  icon?: string;       // Icon name (e.g., 'Rocket', 'Target')
  iconColor?: string;  // Gradient class (e.g., 'from-violet-500 to-purple-600')
}

interface ProductIconProps {
  project: {
    id: string;
    key?: string;
    name?: string;
    imageUrl?: string;
    icon?: string;
    iconColor?: string;
    color?: string; // Legacy color field
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallbackText?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6 rounded-md text-xs',
  sm: 'w-8 h-8 rounded-lg text-sm',
  md: 'w-11 h-11 rounded-xl text-base',
  lg: 'w-14 h-14 rounded-2xl text-lg',
  xl: 'w-20 h-20 rounded-2xl text-xl',
};

const iconSizes = {
  xs: 12,
  sm: 14,
  md: 18,
  lg: 28,
  xl: 40,
};

const ProductIcon: React.FC<ProductIconProps> = ({
  project,
  size = 'md',
  className = '',
  showFallbackText = false,
}) => {
  const [imageError, setImageError] = useState(false);

  // Reset error when project changes
  useEffect(() => {
    setImageError(false);
  }, [project.id, project.imageUrl]);

  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];

  // Priority 1: Custom image URL
  if (project.imageUrl && !imageError) {
    return (
      <img
        src={project.imageUrl}
        alt={project.name || 'Product'}
        className={`${sizeClass} object-cover shadow-lg ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  // Get the gradient/color to use
  const defaultTheme = getProductTheme(project.id);
  const gradient = project.iconColor || project.color || defaultTheme.gradient;

  // Priority 2: Custom icon name
  if (project.icon) {
    const CustomIcon = getIconByName(project.icon);
    if (CustomIcon) {
      return (
        <div
          className={`${sizeClass} bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg ${className}`}
        >
          <CustomIcon size={iconSize} strokeWidth={1.5} />
        </div>
      );
    }
  }

  // Priority 3: Fallback to deterministic icon based on ID
  const { Icon: FallbackIcon } = defaultTheme;

  // Special case for certain project keys
  if (showFallbackText && project.key) {
    if (project.key === 'INF') {
      return (
        <div
          className={`${sizeClass} bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg ${className}`}
        >
          <ChevronsRight size={iconSize} />
        </div>
      );
    }

    // Show first 2-3 chars for small sizes, icon for larger
    if (size === 'xs' || size === 'sm') {
      return (
        <div
          className={`${sizeClass} bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shadow-lg ${className}`}
        >
          {project.key.substring(0, 2)}
        </div>
      );
    }
  }

  return (
    <div
      className={`${sizeClass} bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg ${className}`}
    >
      <FallbackIcon size={iconSize} strokeWidth={1.5} />
    </div>
  );
};

export default ProductIcon;
