import React from 'react';
import { Palette, Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';

const AppearanceTab: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h1 className="text-2xl font-bold text-[#172B4D] dark:text-white">Appearance</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Customize how Vulcan looks for you
        </p>
      </div>

      {/* Theme Selection */}
      <SectionCard>
        <SectionHeader
          icon={Palette}
          title="Theme"
          description="Choose your preferred color scheme"
          gradient="from-pink-500 to-rose-600"
        />
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {/* Light Theme */}
            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border-2 transition-all ${
                theme === 'light'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                  : 'border-gray-200 dark:border-[#2D2F36] hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="w-full aspect-video bg-[#F8F9FC] rounded-lg border border-gray-200 mb-3 flex flex-col overflow-hidden">
                <div className="h-3 bg-white border-b border-gray-200" />
                <div className="flex-1 p-2">
                  <div className="h-2 w-1/2 bg-gray-200 rounded mb-1.5" />
                  <div className="h-2 w-3/4 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[#172B4D] dark:text-white">
                <Sun size={16} />
                Light
                {theme === 'light' && <Check size={16} className="text-blue-500" />}
              </div>
            </button>

            {/* Dark Theme */}
            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border-2 transition-all ${
                theme === 'dark'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                  : 'border-gray-200 dark:border-[#2D2F36] hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="w-full aspect-video bg-[#0B0C0E] rounded-lg border border-[#2D2F36] mb-3 flex flex-col overflow-hidden">
                <div className="h-3 bg-[#15171E] border-b border-[#2D2F36]" />
                <div className="flex-1 p-2">
                  <div className="h-2 w-1/2 bg-[#2D2F36] rounded mb-1.5" />
                  <div className="h-2 w-3/4 bg-[#2D2F36] rounded" />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[#172B4D] dark:text-white">
                <Moon size={16} />
                Dark
                {theme === 'dark' && <Check size={16} className="text-blue-500" />}
              </div>
            </button>

            {/* System Theme */}
            <button
              onClick={() => setTheme('system')}
              className={`p-4 rounded-xl border-2 transition-all ${
                theme === 'system'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                  : 'border-gray-200 dark:border-[#2D2F36] hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="w-full aspect-video bg-gradient-to-br from-[#F8F9FC] to-[#0B0C0E] rounded-lg border border-gray-200 dark:border-[#2D2F36] mb-3 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-500">AUTO</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[#172B4D] dark:text-white">
                <Monitor size={16} />
                System
                {theme === 'system' && <Check size={16} className="text-blue-500" />}
              </div>
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default AppearanceTab;
