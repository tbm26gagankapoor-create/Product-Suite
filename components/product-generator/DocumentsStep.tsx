import React from 'react';
import {
  Loader2,
  X,
  Edit3,
  RefreshCw,
  MessageSquare,
  Send,
  Bot,
  PenLine,
  HelpCircle,
  CheckCircle2,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { DocChatMessage, Suggestion, WizardStep } from './types';

interface DocumentsStepProps {
  isTransitioning: boolean;
  transitionDirection: 'forward' | 'backward';
  refinedVision: string;
  suggestions: Suggestion[];
  activeDocSection: string;
  setActiveDocSection: (id: string) => void;
  generatedDocs: Record<string, string>;
  docGenerationProgress: Record<string, 'pending' | 'generating' | 'completed' | 'error'>;
  currentGeneratingDoc: string | null;
  docNavItems: Array<{ id: string; label: string; icon: any }>;
  docContentRef: React.RefObject<HTMLDivElement>;
  handleDocBlur: (e: React.FocusEvent<HTMLDivElement>) => void;
  handleRetryDocument: (sectionId: string) => void;
  // Chat
  isChatPanelOpen: boolean;
  setIsChatPanelOpen: (open: boolean) => void;
  docChatMessages: DocChatMessage[];
  docChatInput: string;
  setDocChatInput: (val: string) => void;
  isDocChatLoading: boolean;
  handleDocChatSubmit: () => void;
  docChatEndRef: React.RefObject<HTMLDivElement>;
  handleStepChange: (step: WizardStep, direction: 'forward' | 'backward') => void;
  StepSummary: React.FC<{ stepName: string; onEdit: () => void; children: React.ReactNode }>;
}

const DocumentsStep: React.FC<DocumentsStepProps> = ({
  isTransitioning,
  transitionDirection,
  refinedVision,
  suggestions,
  activeDocSection,
  setActiveDocSection,
  generatedDocs,
  docGenerationProgress,
  currentGeneratingDoc,
  docNavItems,
  docContentRef,
  handleDocBlur,
  handleRetryDocument,
  isChatPanelOpen,
  setIsChatPanelOpen,
  docChatMessages,
  docChatInput,
  setDocChatInput,
  isDocChatLoading,
  handleDocChatSubmit,
  docChatEndRef,
  handleStepChange,
  StepSummary,
}) => {
  return (
    <div className={`flex w-full h-full overflow-hidden ${
      isTransitioning ? 'opacity-0' : transitionDirection === 'forward' ? 'animate-slideInFromRight' : 'animate-slideInFromLeft'
    }`}>
        {/* Document Navigation */}
        <div className="w-56 bg-gray-50 dark:bg-[#0B0C0E] border-r border-gray-200 dark:border-[#1F2128] flex flex-col flex-shrink-0 overflow-hidden">
            <div className="p-3 border-b border-gray-100 dark:border-[#1F2128]">
                <h3 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Documents</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {docNavItems.map(section => (
                    <button
                        key={section.id}
                        onClick={() => setActiveDocSection(section.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            activeDocSection === section.id
                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1F2128]'
                        }`}
                    >
                        <section.icon size={14} />
                        <span className="flex-1 text-left truncate">{section.label}</span>
                        {docGenerationProgress[section.id] === 'completed' || generatedDocs[section.id] ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Generated" />
                        ) : docGenerationProgress[section.id] === 'generating' || currentGeneratingDoc === section.id ? (
                            <Loader2 size={10} className="animate-spin text-blue-500" title="Generating..." />
                        ) : docGenerationProgress[section.id] === 'error' ? (
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" title="Error" />
                        ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" title="Pending" />
                        )}
                    </button>
                ))}
            </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 p-6 bg-gray-100/50 dark:bg-[#0B0C0E]/50 overflow-y-auto min-w-0">
             {/* Step Summary from Vision */}
             <div className="max-w-4xl mx-auto mb-4">
               <StepSummary stepName="Vision" onEdit={() => handleStepChange('review', 'backward')}>
                 <div className="flex items-center justify-between">
                   <div className="flex-1 min-w-0">
                     <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                       {refinedVision?.substring(0, 100) || 'Product vision generated'}...
                     </p>
                   </div>
                   <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                     <span className="text-[10px] px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full font-bold">
                       {suggestions.filter(s => s.selected).length} suggestions included
                     </span>
                   </div>
                 </div>
               </StepSummary>
             </div>

             {docGenerationProgress[activeDocSection] === 'error' ? (
                <div className="max-w-4xl mx-auto">
                    <div className="p-8 border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-xl text-center">
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                            <X size={24} className="text-red-500" />
                        </div>
                        <h3 className="font-bold text-lg text-red-600 dark:text-red-400 mb-2">Generation Failed</h3>
                        <p className="text-sm text-red-500 dark:text-red-400/80 mb-6">
                            Rate limit exceeded or service busy for this section.
                        </p>
                        <button
                            onClick={() => handleRetryDocument(activeDocSection)}
                            disabled={currentGeneratingDoc === activeDocSection}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            {currentGeneratingDoc === activeDocSection ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Retrying...
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={16} />
                                    Retry Generation
                                </>
                            )}
                        </button>
                    </div>
                </div>
             ) : generatedDocs[activeDocSection] ? (
                <div className="relative group/doc">
                    <div className="absolute top-3 right-3 z-10 opacity-0 group-hover/doc:opacity-100 transition-opacity">
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1">
                            <Edit3 size={9} /> Editable
                        </span>
                    </div>
                    <div
                        ref={docContentRef}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={handleDocBlur}
                        className="max-w-4xl mx-auto bg-white dark:bg-[#15171E] min-h-[700px] shadow-sm border border-gray-200 dark:border-[#1F2128] rounded-xl p-10 text-[#172B4D] dark:text-gray-200 prose prose-sm dark:prose-invert max-w-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        dangerouslySetInnerHTML={{ __html: generatedDocs[activeDocSection] }}
                    />
                </div>
             ) : currentGeneratingDoc === activeDocSection ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                    <span className="text-sm text-gray-500">Generating {docNavItems.find(d => d.id === activeDocSection)?.label}...</span>
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Loader2 size={24} className="animate-spin text-gray-400" />
                    <span className="text-sm text-gray-400">Waiting in queue...</span>
                </div>
             )}
        </div>

        {/* Right Sidebar - AI Chat Assistant (Claude Code style) */}
        <div className={`${isChatPanelOpen ? 'w-80' : 'w-12'} bg-white dark:bg-[#0A0B0D] border-l border-gray-200 dark:border-[#1F2128] flex flex-col flex-shrink-0 overflow-hidden transition-all duration-300`}>
            {/* Chat Header */}
            <div className="p-3 border-b border-gray-100 dark:border-[#1F2128] flex items-center justify-between">
                {isChatPanelOpen ? (
                    <>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                <Bot size={14} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-[#172B4D] dark:text-white">Doc Assistant</h3>
                                <p className="text-[10px] text-gray-400">Ask questions or request edits</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsChatPanelOpen(false)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F2128] rounded-lg transition-colors"
                        >
                            <PanelRightClose size={16} />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => setIsChatPanelOpen(true)}
                        className="w-full flex flex-col items-center gap-1 py-2 text-gray-400 hover:text-blue-500 transition-colors"
                    >
                        <PanelRightOpen size={18} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Chat</span>
                    </button>
                )}
            </div>

            {isChatPanelOpen && (
                <>
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                        {docChatMessages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center mb-4">
                                    <MessageSquare size={24} className="text-blue-500" />
                                </div>
                                <h4 className="text-sm font-semibold text-[#172B4D] dark:text-white mb-2">Document Assistant</h4>
                                <p className="text-xs text-gray-400 mb-4">Ask questions about your documentation or request changes</p>
                                <div className="space-y-2 w-full">
                                    <button
                                        onClick={() => setDocChatInput("What are the key features described in this document?")}
                                        className="w-full text-left px-3 py-2 text-xs bg-gray-50 dark:bg-[#1F2128] hover:bg-gray-100 dark:hover:bg-[#2D2F36] rounded-lg text-gray-600 dark:text-gray-400 transition-colors flex items-center gap-2"
                                    >
                                        <HelpCircle size={12} className="text-blue-500 flex-shrink-0" />
                                        <span>What are the key features?</span>
                                    </button>
                                    <button
                                        onClick={() => setDocChatInput("Add a section about security considerations")}
                                        className="w-full text-left px-3 py-2 text-xs bg-gray-50 dark:bg-[#1F2128] hover:bg-gray-100 dark:hover:bg-[#2D2F36] rounded-lg text-gray-600 dark:text-gray-400 transition-colors flex items-center gap-2"
                                    >
                                        <PenLine size={12} className="text-purple-500 flex-shrink-0" />
                                        <span>Add a security section</span>
                                    </button>
                                    <button
                                        onClick={() => setDocChatInput("Make the language more technical and detailed")}
                                        className="w-full text-left px-3 py-2 text-xs bg-gray-50 dark:bg-[#1F2128] hover:bg-gray-100 dark:hover:bg-[#2D2F36] rounded-lg text-gray-600 dark:text-gray-400 transition-colors flex items-center gap-2"
                                    >
                                        <PenLine size={12} className="text-purple-500 flex-shrink-0" />
                                        <span>Make it more technical</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {docChatMessages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                                            {msg.role === 'assistant' && (
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                                        <Bot size={10} className="text-white" />
                                                    </div>
                                                    <span className="text-[10px] font-medium text-gray-400">Assistant</span>
                                                    {msg.type === 'edit' && msg.editApplied && (
                                                        <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded font-medium">
                                                            <CheckCircle2 size={9} /> Applied
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <div
                                                className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                                                    msg.role === 'user'
                                                        ? 'bg-blue-600 text-white rounded-br-md'
                                                        : 'bg-gray-100 dark:bg-[#1F2128] text-[#172B4D] dark:text-gray-200 rounded-bl-md'
                                                }`}
                                            >
                                                {msg.content}
                                            </div>
                                            <div className={`text-[9px] text-gray-400 mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isDocChatLoading && (
                                    <div className="flex items-center gap-2 px-3 py-2">
                                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                            <Bot size={10} className="text-white" />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}
                                <div ref={docChatEndRef} />
                            </>
                        )}
                    </div>

                    {/* Chat Input */}
                    <div className="p-3 border-t border-gray-100 dark:border-[#1F2128]">
                        <div className="flex items-end gap-2 bg-gray-50 dark:bg-[#0B0C0E] rounded-xl p-2 border border-gray-200 dark:border-[#1F2128] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                            <textarea
                                value={docChatInput}
                                onChange={(e) => setDocChatInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleDocChatSubmit();
                                    }
                                }}
                                placeholder="Ask a question or request changes..."
                                rows={1}
                                className="flex-1 bg-transparent text-xs text-[#172B4D] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none resize-none max-h-24"
                                style={{ minHeight: '24px' }}
                            />
                            <button
                                onClick={handleDocChatSubmit}
                                disabled={isDocChatLoading || !docChatInput.trim()}
                                className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            >
                                {isDocChatLoading ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Send size={14} />
                                )}
                            </button>
                        </div>
                        <p className="text-[9px] text-gray-400 mt-2 text-center">
                            <span className="text-blue-500">Questions</span> search all docs &bull; <span className="text-purple-500">Edit requests</span> modify current doc
                        </p>
                    </div>
                </>
            )}
        </div>
    </div>
  );
};

export default DocumentsStep;
