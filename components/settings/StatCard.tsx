import React from 'react';

const StatCard: React.FC<{
  icon: React.ElementType;
  value: number | string;
  label: string;
  color: string;
}> = ({ icon: Icon, value, label, color }) => (
  <div className="bg-gray-50 dark:bg-[#1F2128] rounded-xl p-4 border border-gray-100 dark:border-[#2D2F36]">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-[#172B4D] dark:text-white">{value}</div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</div>
      </div>
    </div>
  </div>
);

export default StatCard;
