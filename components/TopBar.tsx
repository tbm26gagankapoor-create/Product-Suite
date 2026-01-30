
import React from 'react';
import { Search, Bell, HelpCircle, Plus, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useProjectData } from '../context/ProjectDataContext';

const TopBar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { currentUser } = useProjectData();

  return (
    <div className="h-14 bg-white dark:bg-[#0B0C0E] border-b border-gray-200 dark:border-[#1F2128] flex items-center justify-between px-6 flex-shrink-0 transition-colors duration-200 z-20">
      <div className="flex-1 flex justify-center max-w-2xl mx-auto">
        <div className="relative w-full max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-gray-500 transition-colors" size={16} />
            <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-gray-100 dark:bg-[#1F2128] text-[#172B4D] dark:text-gray-200 pl-10 pr-4 py-1.5 rounded-full text-sm border border-transparent focus:bg-white dark:focus:bg-[#0F1115] focus:border-blue-500 focus:outline-none transition-all placeholder:text-gray-500"
            />
        </div>
      </div>

      <div className="flex items-center gap-3 ml-4">
        <button 
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors"
            title="Toggle Theme"
        >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white pl-2 pr-3 py-1.5 rounded-full hover:opacity-90 transition-opacity shadow-sm">
             <Plus size={14} strokeWidth={3} />
             <span className="text-xs font-bold">Create</span>
        </button>

        <div className="h-6 w-px bg-gray-200 dark:bg-[#1F2128] mx-1"></div>

        <button className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:text-[#172B4D] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors">
            <HelpCircle size={18} />
        </button>

        <button className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:text-[#172B4D] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-[#0B0C0E]"></span>
        </button>
        
        {currentUser && (
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 cursor-pointer overflow-hidden ring-2 ring-transparent hover:ring-blue-500 transition-all ml-1">
                <img src={currentUser.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            </div>
        )}
      </div>
    </div>
  );
};

export default TopBar;
