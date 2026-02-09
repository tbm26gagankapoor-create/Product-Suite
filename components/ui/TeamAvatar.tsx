import React from 'react';
import { useConfig } from '../../context/ConfigContext';
import { Team } from '../../types';

interface TeamAvatarProps {
  team: Team;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-lg',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-3xl',
};

const fallbackColors = [
  'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
];

const TeamAvatar: React.FC<TeamAvatarProps> = ({ team, size = 'md', className = '' }) => {
  const { themeColors } = useConfig();
  const initials = team.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const teamAvatarColors = themeColors.filter(c => c.category === 'team_avatar');
  const colorIndex = team.name.length % (teamAvatarColors.length || fallbackColors.length);
  const colorClass = teamAvatarColors.length > 0
    ? `${teamAvatarColors[colorIndex].light_classes} dark:${teamAvatarColors[colorIndex].dark_classes.replace(/\s+/g, ' dark:')}`
    : fallbackColors[colorIndex];

  if (team.avatarUrl && team.avatarUrl.trim() !== '' && !team.avatarUrl.includes('ui-avatars.com')) {
    return (
      <img
        src={team.avatarUrl}
        alt={team.name}
        className={`${sizeClasses[size]} rounded-xl object-cover ${className}`}
      />
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-xl flex items-center justify-center font-bold ${colorClass} ${className}`}>
      {initials}
    </div>
  );
};

export default TeamAvatar;
