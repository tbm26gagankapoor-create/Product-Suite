
import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { CopilotModal } from './CopilotModal';

interface CopilotFloatingButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  initialQuery: string;
  onClearQuery: () => void;
}

const CopilotFloatingButton: React.FC<CopilotFloatingButtonProps> = ({
  isOpen,
  onToggle,
  initialQuery,
  onClearQuery,
}) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onToggle();
    }, 200);
  };

  // Clear query after it's been consumed
  useEffect(() => {
    if (isOpen && initialQuery) {
      const timer = setTimeout(() => onClearQuery(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialQuery, onClearQuery]);

  return (
    <>
      {/* FAB Button */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105 transition-all animate-copilotPulse"
          title="Open Copilot"
        >
          <Sparkles size={24} />
        </button>
      )}

      {/* Floating Panel */}
      {(isOpen || isClosing) && (
        <div
          className={`fixed bottom-6 right-6 z-[95] w-[900px] h-[600px] max-w-[calc(100vw-48px)] max-h-[calc(100vh-48px)] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden ${
            isClosing ? 'animate-copilotPanelOut' : 'animate-copilotPanelIn'
          }`}
        >
          <CopilotModal
            isOpen={isOpen}
            onClose={handleClose}
            initialQuery={initialQuery}
            mode="floating"
          />
        </div>
      )}
    </>
  );
};

export default CopilotFloatingButton;
