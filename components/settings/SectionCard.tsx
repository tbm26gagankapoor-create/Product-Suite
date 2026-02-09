import React from 'react';

const SectionCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-[#15171E] rounded-2xl border border-gray-200 dark:border-[#1F2128] shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

export default SectionCard;
