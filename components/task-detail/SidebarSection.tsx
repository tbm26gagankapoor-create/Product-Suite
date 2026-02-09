
import React from 'react';

interface SidebarSectionProps {
  title: string;
  children?: React.ReactNode;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({ title, children }) => (
  <div className="space-y-3">
    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{title}</h4>
    <div className="space-y-3">
      {children}
    </div>
  </div>
);

export default SidebarSection;
