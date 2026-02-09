import React from 'react';

interface CardProps {
  children: React.ReactNode;
  hover?: boolean;
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  hover = false,
  className = '',
  onClick,
}) => {
  return (
    <div
      className={`bg-white dark:bg-[#15171E] rounded-xl border border-gray-100 dark:border-white/5 ${
        hover
          ? 'hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-lg transition-all cursor-pointer'
          : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
