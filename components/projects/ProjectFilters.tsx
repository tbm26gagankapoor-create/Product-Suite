
import React from 'react';
import {
  Search, Plus, Download, LayoutGrid, List as ListIcon
} from 'lucide-react';

interface ProjectFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  onImportClick: () => void;
  onNewProductClick: () => void;
}

const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  searchTerm,
  onSearchChange,
  activeFilter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  onImportClick,
  onNewProductClick,
}) => {
  return (
    <>
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white dark:bg-[#15171E] border-b border-gray-200 dark:border-[#1F2128] px-8 py-6 z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-[#172B4D] dark:text-white mb-1">Products</h1>
            <p className="text-[#5E6C84] dark:text-gray-400 text-sm">Manage your ongoing initiatives and track progress.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-blue-500" size={16} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="bg-gray-50 dark:bg-[#0B0C0E] text-[#172B4D] dark:text-gray-200 pl-9 pr-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-[#2D2F36] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none w-64 transition-all"
              />
            </div>

            <div className="h-8 w-px bg-gray-200 dark:bg-[#2D2F36] mx-1"></div>

            <button
              onClick={onImportClick}
              className="flex items-center gap-2 bg-white dark:bg-[#15171E] hover:bg-gray-50 dark:hover:bg-[#1F2128] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-bold transition-all shadow-sm text-sm"
            >
              <Download size={16} strokeWidth={2.5} />
              <span>Import</span>
            </button>

            <button
              onClick={onNewProductClick}
              className="flex items-center gap-2 bg-[#172B4D] dark:bg-white text-white dark:text-black hover:opacity-90 px-4 py-2 rounded-lg font-bold transition-all shadow-lg hover:shadow-xl text-sm"
            >
              <Plus size={16} strokeWidth={3} />
              <span>New Product</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fixed Toolbar */}
      <div className="flex-shrink-0 px-8 py-4 flex items-center justify-between bg-[#F4F5F7] dark:bg-[#0B0C0E] border-b border-gray-200 dark:border-[#1F2128]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-2 hidden sm:inline-block">Filter By:</span>
            <div className="flex gap-1">
              {['All', 'Active', 'Completed', 'Archived'].map(filter => (
                <button
                  key={filter}
                  onClick={() => onFilterChange(filter)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activeFilter === filter
                      ? 'bg-gray-200 dark:bg-[#2D2F36] text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1F2128]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-2 hidden sm:inline-block">View:</span>
          <div className="flex gap-1">
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-gray-200 dark:bg-[#2D2F36] text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1F2128]'}`}
            >
              <ListIcon size={16} />
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-gray-200 dark:bg-[#2D2F36] text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1F2128]'}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProjectFilters;
