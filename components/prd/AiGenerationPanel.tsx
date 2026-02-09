
import React from 'react';
import {
    Sparkles,
    ArrowRight,
    Loader2
} from 'lucide-react';

interface AiGenerationPanelProps {
    prompt: string;
    setPrompt: (value: string) => void;
    isGenerating: boolean;
    handleAiSubmit: () => void;
    handleKeyDown: (e: React.KeyboardEvent) => void;
}

const AiGenerationPanel: React.FC<AiGenerationPanelProps> = ({
    prompt,
    setPrompt,
    isGenerating,
    handleAiSubmit,
    handleKeyDown,
}) => {
    return (
        <div className="p-4 border-t border-gray-200 dark:border-[#1F2128] bg-white dark:bg-[#0B0C0E] z-20">
            <div className="max-w-4xl mx-auto relative">
                <div className="flex items-center gap-3 p-1.5 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl shadow-lg ring-1 ring-black/5 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                    <div className="pl-3 text-blue-500 dark:text-blue-400">
                        <Sparkles size={18} />
                    </div>
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask AI to edit or generate content (e.g. 'Add a table for user roles')..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-[#172B4D] dark:text-white placeholder-gray-400 py-2"
                    />
                    <button
                        onClick={handleAiSubmit}
                        disabled={isGenerating || !prompt.trim()}
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AiGenerationPanel;
