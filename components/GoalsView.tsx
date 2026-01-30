
import React, { useState } from 'react';
import { 
  Target, 
  Search,
  Filter,
} from 'lucide-react';

const GoalsView: React.FC = () => {
  const [activePeriod, setActivePeriod] = useState('Q4 2024');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0B0C0E] transition-colors duration-200">
      
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white dark:bg-[#15171E] border-b border-gray-200 dark:border-[#1F2128] px-8 py-6 z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
               <h1 className="text-3xl font-bold text-[#172B4D] dark:text-white mb-1 tracking-tight">Goals & OKRs</h1>
               <p className="text-[#5E6C84] dark:text-gray-400 text-sm">
                   Align your team with high-level objectives and measurable results.
               </p>
            </div>
            
            <div className="flex items-center gap-3">
                 <div className="flex bg-gray-100 dark:bg-[#0B0C0E] p-1 rounded-lg border border-gray-200 dark:border-[#2D2F36]">
                     {['Q3 2024', 'Q4 2024', 'Annual'].map(period => (
                         <button
                            key={period}
                            onClick={() => setActivePeriod(period)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                                activePeriod === period 
                                ? 'bg-white dark:bg-[#15171E] text-[#172B4D] dark:text-white shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                         >
                             {period}
                         </button>
                     ))}
                 </div>
            </div>
        </div>
      </div>

      {/* Fixed Toolbar */}
      <div className="flex-shrink-0 px-8 py-4 bg-white dark:bg-[#0B0C0E] flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#172B4D] dark:text-white">Objectives</h2>
          <div className="flex items-center gap-3">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input 
                    type="text" 
                    placeholder="Filter objectives..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-50 dark:bg-[#15171E] text-[#172B4D] dark:text-gray-200 pl-10 pr-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-[#2D2F36] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none w-64 transition-all shadow-sm"
                />
            </div>
            <button className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#172B4D] dark:hover:text-white transition-colors bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] px-3 py-2 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-[#1F2128]/50">
                    <Filter size={14} /> Group by: Team
            </button>
          </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-0">
          {/* Empty State */}
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-200 dark:border-[#1F2128] rounded-xl bg-gray-50 dark:bg-[#15171E]/50 h-full">
              <Target className="text-gray-300 dark:text-gray-600 mb-4" size={48} />
              <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400">No Goals Found</h3>
              <p className="text-sm text-gray-400 mt-2">Create a new objective to get started tracking OKRs.</p>
          </div>
      </div>

    </div>
  );
};

export default GoalsView;
