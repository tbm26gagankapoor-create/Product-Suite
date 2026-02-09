import React from 'react';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses: Record<string, string> = {
  xs: 'w-5 h-5 text-[8px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-16 h-16 text-lg',
};

const colorPalette = [
  'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  'bg-green-500/20 text-green-600 dark:text-green-400',
  'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  'bg-pink-500/20 text-pink-600 dark:text-pink-400',
  'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function getColor(name: string): string {
  const index = name.length % colorPalette.length;
  return colorPalette[index];
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
}) => {
  if (src && src.trim() !== '') {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold ${getColor(name)} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
