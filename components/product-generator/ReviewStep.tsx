import React from 'react';
import {
  Check,
  Plus,
  Lightbulb,
  Edit3,
  RefreshCw,
  Zap,
  Loader2,
} from 'lucide-react';
import { Suggestion, WizardStep } from './types';
import { renderMarkdown, getSuggestionIcon, getSuggestionColor } from './utils';

interface ReviewStepProps {
  isTransitioning: boolean;
  transitionDirection: 'forward' | 'backward';
  productName: string;
  productImage: string | null;
  description: string;
  tags: string;
  refinedVision: string;
  setRefinedVision: (val: string) => void;
  suggestions: Suggestion[];
  toggleSuggestion: (id: string) => void;
  handleMoreSuggestions: () => void;
  isAiLoading: boolean;
  handleStepChange: (step: WizardStep, direction: 'forward' | 'backward') => void;
  StepSummary: React.FC<{ stepName: string; onEdit: () => void; children: React.ReactNode }>;
}

const ReviewStep: React.FC<ReviewStepProps> = ({
  isTransitioning,
  transitionDirection,
  productName,
  productImage,
  description,
  tags,
  refinedVision,
  setRefinedVision,
  suggestions,
  toggleSuggestion,
  handleMoreSuggestions,
  isAiLoading,
  handleStepChange,
  StepSummary,
}) => {
  return (
    <div className={`flex w-full h-full overflow-hidden ${
      isTransitioning ? 'opacity-0' : transitionDirection === 'forward' ? 'animate-slideInFromRight' : 'animate-slideInFromLeft'
    }`}>
        {/* Vision Editor - Left */}
        <div className="flex-1 p-6 border-r border-gray-100 dark:border-[#1F2128] flex flex-col min-w-0 overflow-hidden">
            {/* Step Summary from Input */}
            <StepSummary stepName="Define" onEdit={() => handleStepChange('input', 'backward')}>
              <div className="flex items-center gap-4">
                {productImage && (
                  <img src={productImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#172B4D] dark:text-white truncate">{productName || 'Untitled Product'}</p>
                  <p className="text-xs text-gray-400 truncate">{description || 'No description'}</p>
                </div>
                {tags && (
                  <div className="flex gap-1 flex-shrink-0">
                    {tags.split(',').slice(0, 2).map((tag, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-[#1F2128] rounded-full text-gray-500">{tag.trim()}</span>
                    ))}
                  </div>
                )}
              </div>
            </StepSummary>

            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Lightbulb size={16} className="text-amber-500" />
                    <h3 className="text-sm font-bold text-[#172B4D] dark:text-white">Product Vision</h3>
                </div>
                <span className="text-[10px] text-gray-400 flex items-center gap-1 bg-gray-100 dark:bg-[#1F2128] px-2 py-1 rounded">
                    <Edit3 size={10} /> Click to edit
                </span>
            </div>
            <div
                contentEditable
                suppressContentEditableWarning
                onBlur={(e: React.FocusEvent<HTMLDivElement>) => {
                    // Extract text content and preserve basic structure
                    const html = e.currentTarget.innerHTML;
                    // Convert HTML back to simple text with line breaks
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;

                    // Convert HTML elements back to markdown-like structure
                    const processNode = (node: Node): string => {
                        if (node.nodeType === Node.TEXT_NODE) {
                            return node.textContent || '';
                        }
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as HTMLElement;
                            const tag = element.tagName.toLowerCase();
                            const text = Array.from(element.childNodes).map(processNode).join('');

                            switch(tag) {
                                case 'h1': return `# ${text}\n\n`;
                                case 'h2': return `## ${text}\n\n`;
                                case 'h3': return `### ${text}\n\n`;
                                case 'strong': return `**${text}**`;
                                case 'em': return `*${text}*`;
                                case 'li': return `- ${text}\n`;
                                case 'ul': return `${text}\n`;
                                case 'br': return '\n';
                                case 'div': return text + '\n';
                                default: return text;
                            }
                        }
                        return '';
                    };

                    const markdown = Array.from(tempDiv.childNodes).map(processNode).join('');
                    setRefinedVision(markdown.trim());
                }}
                className="flex-1 w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl p-6 text-sm overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-[#172B4D] [&_h1]:dark:text-white [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-[#172B4D] [&_h2]:dark:text-white [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-[#172B4D] [&_h3]:dark:text-white [&_h3]:mt-6 [&_h3]:mb-3 [&_strong]:font-semibold [&_strong]:text-[#172B4D] [&_strong]:dark:text-white [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-4 [&_ul]:space-y-1 [&_li]:ml-4 [&_li]:mb-2 [&_li]:text-[#172B4D] [&_li]:dark:text-gray-200"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(refinedVision) }}
            />
        </div>

        {/* Suggestions - Right */}
        <div className="w-80 flex-shrink-0 flex flex-col bg-gray-50 dark:bg-[#0B0C0E] border-l border-gray-200 dark:border-[#1F2128]">
            <div className="p-4 border-b border-gray-100 dark:border-[#1F2128] flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Zap size={14} className="text-amber-500" />
                    <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Suggestions</h3>
                </div>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">
                    {suggestions.filter(s => s.selected).length}/{suggestions.length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {suggestions.length > 0 ? suggestions.map(s => (
                    <button
                        key={s.id}
                        onClick={() => toggleSuggestion(s.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                            s.selected
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                            : 'bg-white dark:bg-[#15171E] border-gray-200 dark:border-[#2D2F36] hover:border-blue-300 dark:hover:border-blue-700'
                        }`}
                    >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${getSuggestionColor(s.type)}`}>
                                {getSuggestionIcon(s.type)}
                                {s.type}
                            </span>
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                                s.selected ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-[#2D2F36] text-gray-400'
                            }`}>
                                {s.selected ? <Check size={10} /> : <Plus size={10} />}
                            </div>
                        </div>
                        <h4 className="font-semibold text-xs text-[#172B4D] dark:text-white mb-1">{s.title}</h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2">{s.description}</p>
                    </button>
                )) : (
                    <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                        <Lightbulb size={24} className="text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-xs text-gray-400">No suggestions yet</p>
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-gray-100 dark:border-[#1F2128] flex-shrink-0">
                <button
                    onClick={handleMoreSuggestions}
                    disabled={isAiLoading}
                    className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                    {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Generate More Ideas
                </button>
            </div>
        </div>
    </div>
  );
};

export default ReviewStep;
