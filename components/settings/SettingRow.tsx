import React from 'react';

const SettingRow: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
  noBorder?: boolean;
}> = ({ title, description, children, noBorder = false }) => (
  <div className={`flex items-center justify-between px-6 py-4 ${!noBorder ? 'border-b border-gray-100 dark:border-[#1F2128]' : ''}`}>
    <div className="flex-1 mr-4">
      <h3 className="text-sm font-semibold text-[#172B4D] dark:text-white">{title}</h3>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      )}
    </div>
    {children}
  </div>
);

export default SettingRow;
