import React from 'react';
import {
  Loader2,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { WizardStep } from './types';

interface ProcessingOverlayProps {
  step: WizardStep;
  progress: number;
  loadingStatus: string;
  docNavItems: Array<{ id: string; label: string; icon: any }>;
  docGenerationProgress: Record<string, 'pending' | 'generating' | 'completed' | 'error'>;
  currentGeneratingDoc: string | null;
  generatedDocs: Record<string, string>;
}

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  step,
  progress,
  loadingStatus,
  docNavItems,
  docGenerationProgress,
  currentGeneratingDoc,
  generatedDocs,
}) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-[#12141A] animate-in fade-in duration-500 z-50">
        <div className="relative mb-8">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
                <Loader2 size={40} className="animate-spin text-white" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white dark:bg-[#12141A] rounded-xl flex items-center justify-center shadow-lg border border-gray-100 dark:border-[#2D2F36]">
                <Sparkles size={16} className="text-blue-600 animate-pulse" />
            </div>
        </div>
        <h3 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">
            {step === 'processing' ? 'Analyzing Product Vision' : 'Generating Documents'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {step === 'processing' ? 'Crafting strategic insights...' : 'Building comprehensive documentation...'}
        </p>

        {/* Current Status */}
        <div className="flex items-center gap-2 mb-6 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {loadingStatus || 'Initializing...'}
            </p>
        </div>

        {/* Progress Bar */}
        <div className="w-80 h-2.5 bg-gray-100 dark:bg-[#1F2128] rounded-full overflow-hidden mb-3">
            <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progress}%` }}
            />
        </div>
        <p className="text-xs text-gray-400">{Math.round(progress)}% complete</p>

        {/* Step Indicators for Processing */}
        {step === 'processing' && (
          <div className="flex gap-6 mt-6">
              <div className={`flex items-center gap-2 text-xs font-medium ${progress > 10 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${progress > 10 ? 'bg-green-100 dark:bg-green-900/30' : progress > 0 ? 'bg-blue-100 dark:bg-blue-900/30 animate-pulse' : 'bg-gray-100 dark:bg-[#1F2128]'}`}>
                      {progress > 10 ? <Check size={12} /> : <span className="text-[10px]">1</span>}
                  </div>
                  <span>Initialize</span>
              </div>
              <div className={`flex items-center gap-2 text-xs font-medium ${progress > 40 ? 'text-green-600 dark:text-green-400' : progress > 10 ? 'text-blue-500' : 'text-gray-400'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${progress > 40 ? 'bg-green-100 dark:bg-green-900/30' : progress > 10 ? 'bg-blue-100 dark:bg-blue-900/30 animate-pulse' : 'bg-gray-100 dark:bg-[#1F2128]'}`}>
                      {progress > 40 ? <Check size={12} /> : <span className="text-[10px]">2</span>}
                  </div>
                  <span>Analyze</span>
              </div>
              <div className={`flex items-center gap-2 text-xs font-medium ${progress > 70 ? 'text-green-600 dark:text-green-400' : progress > 40 ? 'text-blue-500' : 'text-gray-400'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${progress > 70 ? 'bg-green-100 dark:bg-green-900/30' : progress > 40 ? 'bg-blue-100 dark:bg-blue-900/30 animate-pulse' : 'bg-gray-100 dark:bg-[#1F2128]'}`}>
                      {progress > 70 ? <Check size={12} /> : <span className="text-[10px]">3</span>}
                  </div>
                  <span>Generate</span>
              </div>
              <div className={`flex items-center gap-2 text-xs font-medium ${progress > 95 ? 'text-green-600 dark:text-green-400' : progress > 70 ? 'text-blue-500' : 'text-gray-400'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${progress > 95 ? 'bg-green-100 dark:bg-green-900/30' : progress > 70 ? 'bg-blue-100 dark:bg-blue-900/30 animate-pulse' : 'bg-gray-100 dark:bg-[#1F2128]'}`}>
                      {progress > 95 ? <Check size={12} /> : <span className="text-[10px]">4</span>}
                  </div>
                  <span>Finalize</span>
              </div>
          </div>
        )}

        {/* Document Generation Progress */}
        {step === 'generating_docs' && (
          <div className="mt-6 w-96">
            <div className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-3 text-center">
              Document Generation Progress
            </div>
            <div className="grid grid-cols-3 gap-2">
              {docNavItems.map(doc => {
                const status = docGenerationProgress[doc.id];
                const isGenerating = status === 'generating' || currentGeneratingDoc === doc.id;
                const isCompleted = status === 'completed' || generatedDocs[doc.id];
                const isError = status === 'error';

                return (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                      isCompleted
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : isGenerating
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 animate-pulse'
                          : isError
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            : 'bg-gray-50 dark:bg-[#1F2128] text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={10} className="flex-shrink-0" />
                    ) : isGenerating ? (
                      <Loader2 size={10} className="flex-shrink-0 animate-spin" />
                    ) : isError ? (
                      <X size={10} className="flex-shrink-0" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                    )}
                    <span className="truncate">{doc.label.replace(' Architecture', '').replace(' Workflows', '')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
    </div>
  );
};

export default ProcessingOverlay;
