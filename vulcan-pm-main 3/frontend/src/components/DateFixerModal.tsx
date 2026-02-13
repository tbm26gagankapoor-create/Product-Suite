
import React, { useState } from 'react';
import { X, Calendar, ArrowRight, Check, Clock } from 'lucide-react';
import { Task } from '../types';

interface DateFixerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onSave: (updates: { taskId: string; date: string }[]) => void;
}

const DateFixerModal: React.FC<DateFixerModalProps> = ({ isOpen, onClose, tasks, onSave }) => {
  const [dates, setDates] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!isOpen) return null;

  // Handle case where all tasks are processed or empty
  if (tasks.length === 0) {
      return null; 
  }

  const currentTask = tasks[currentIndex];
  const isLast = currentIndex === tasks.length - 1;

  const handleDateChange = (date: string) => {
    setDates(prev => ({ ...prev, [currentTask.id]: date }));
  };

  const handleNext = () => {
    if (isLast) {
      handleSave();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSave = () => {
    const updates = Object.entries(dates).map(([taskId, date]) => ({ taskId, date }));
    onSave(updates);
    onClose();
  };

  const handleSkip = () => {
      if (isLast) {
          handleSave();
      } else {
          setCurrentIndex(prev => prev + 1);
      }
  };

  // Calculate progress
  const progress = ((currentIndex + 1) / tasks.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#15171E] w-full max-w-lg rounded-xl shadow-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1F2128] flex justify-between items-center bg-gray-50 dark:bg-[#1F2128]">
          <div className="flex items-center gap-2">
             <div className="p-1.5 bg-amber-100 dark:bg-amber-500/20 rounded-md text-amber-600 dark:text-amber-400">
               <Clock size={16} />
             </div>
             <div>
                 <h3 className="font-bold text-[#172B4D] dark:text-white text-sm">Set Due Dates</h3>
                 <p className="text-xs text-gray-500 dark:text-gray-400">Task {currentIndex + 1} of {tasks.length}</p>
             </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-gray-100 dark:bg-[#0B0C0E]">
            <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>

        {/* Body */}
        <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#0B0C0E] flex items-center justify-center mb-6 border-2 border-gray-200 dark:border-[#2D2F36]">
                <Calendar size={32} className="text-gray-400" />
            </div>
            
            <h2 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2 max-w-sm leading-tight">
                {currentTask.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs">
                This task currently has no due date. When should it be completed?
            </p>

            <div className="w-full max-w-xs space-y-4">
                <input 
                    type="date" 
                    value={dates[currentTask.id] || ''}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl px-4 py-3 text-sm text-[#172B4D] dark:text-white focus:outline-none focus:border-blue-500 transition-all text-center font-bold"
                    autoFocus
                />
            </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-[#1F2128] flex justify-between items-center bg-gray-50/50 dark:bg-[#1F2128]/50">
            <button 
                onClick={handleSkip}
                className="text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-4 py-2 transition-colors"
            >
                Skip
            </button>
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleNext}
                    disabled={!dates[currentTask.id]}
                    className="flex items-center gap-2 bg-[#172B4D] dark:bg-white text-white dark:text-black px-6 py-2 rounded-lg text-sm font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLast ? 'Finish' : 'Next'} <ArrowRight size={14} />
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default DateFixerModal;
