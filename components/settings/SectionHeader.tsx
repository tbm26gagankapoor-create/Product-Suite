import React from 'react';

const SectionHeader: React.FC<{
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  gradient?: string;
}> = ({ icon: Icon, title, description, action, gradient = 'from-blue-500 to-indigo-600' }) => (
  <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-[#1F2128]">
    <div className="flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-[#172B4D] dark:text-white">{title}</h2>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
    </div>
    {action}
  </div>
);

export default SectionHeader;
