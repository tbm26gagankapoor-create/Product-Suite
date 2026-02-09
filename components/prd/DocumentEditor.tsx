
import React from 'react';
import {
    Sparkles,
    Clock,
    Share2,
    Save,
    MessageSquare,
    MoreHorizontal,
    Loader2,
    Github,
    AlertCircle,
    X
} from 'lucide-react';
import { User as UserType, DocumentComment } from '../../types';
import type { GitHubIntegration } from '../../types';
import SelectionCommentPopover from '../SelectionCommentPopover';

interface Section {
    id: string;
    label: string;
    icon: any;
    isCustom?: boolean;
}

interface SelectionPopoverState {
    visible: boolean;
    text: string;
    position: { x: number; y: number };
}

interface DocumentEditorProps {
    activeSection: string;
    activeItem: Section | undefined;
    lastSaved: Date;
    hasUnsavedChanges: boolean;
    isGenerating: boolean;
    currentDocContent: string;
    contentRef: React.RefObject<HTMLDivElement>;
    showHistory: boolean;
    showComments: boolean;
    unresolvedComments: DocumentComment[];
    inlineComments: DocumentComment[];
    selectionPopover: SelectionPopoverState;
    allUsers: UserType[];
    githubIntegration: GitHubIntegration | null;
    isSyncing: boolean;
    localDocs: Record<string, string>;
    setIsSaveModalOpen: (value: boolean) => void;
    setShowHistory: (value: boolean) => void;
    setShowComments: (value: boolean) => void;
    setShowGitHubSettings: (value: boolean) => void;
    handleContentBlur: () => void;
    handleContentMouseUp: (e: React.MouseEvent) => void;
    handleAddInlineComment: (text: string, selectedText: string, selectionId: string, mentions?: string[]) => void;
    setSelectionPopover: (value: SelectionPopoverState) => void;
    handleGitHubSync: () => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({
    activeSection,
    activeItem,
    lastSaved,
    hasUnsavedChanges,
    isGenerating,
    currentDocContent,
    contentRef,
    showHistory,
    showComments,
    unresolvedComments,
    inlineComments,
    selectionPopover,
    allUsers,
    githubIntegration,
    isSyncing,
    localDocs,
    setIsSaveModalOpen,
    setShowHistory,
    setShowComments,
    setShowGitHubSettings,
    handleContentBlur,
    handleContentMouseUp,
    handleAddInlineComment,
    setSelectionPopover,
    handleGitHubSync,
}) => {
    return (
        <div className={`flex-1 transition-all duration-300 ${showHistory || showComments ? 'mr-0' : ''}`}>
            <div className="max-w-4xl mx-auto p-8 sm:p-12 pb-48">
                {/* Header Actions Bar */}
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200 dark:border-[#1F2128]">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#172B4D] dark:text-gray-200">
                            {activeItem?.label}
                        </span>
                        <span className="text-gray-300 dark:text-gray-700">/</span>
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-[#1F2128] px-1.5 py-0.5 rounded border border-gray-200 dark:border-[#2D2F36]">Live Doc</span>
                        <span className="text-[10px] text-gray-400 ml-2">
                            Saved {lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSaveModalOpen(true)}
                            disabled={!hasUnsavedChanges}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors shadow-sm ${
                                hasUnsavedChanges
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-100 text-gray-400 dark:bg-[#1F2128] dark:text-gray-600 cursor-not-allowed'
                            }`}
                        >
                            <Save size={14} />
                            <span>Save Version</span>
                        </button>

                        <div className="h-4 w-px bg-gray-200 dark:bg-[#2D2F36] mx-1"></div>

                        <button
                            onClick={() => { setShowHistory(!showHistory); setShowComments(false); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${showHistory ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1F2128]'}`}
                        >
                            <Clock size={14} />
                            <span>History</span>
                        </button>
                        <button
                            onClick={() => { setShowComments(!showComments); setShowHistory(false); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${showComments ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1F2128]'}`}
                        >
                            <MessageSquare size={14} />
                            <span>Comments</span>
                            {unresolvedComments.length > 0 && (
                                <span className="flex items-center gap-0.5">
                                    <span className="bg-blue-600 text-white text-[9px] px-1.5 rounded-full">{unresolvedComments.length}</span>
                                    {inlineComments.length > 0 && (
                                        <span className="bg-yellow-500 text-white text-[9px] px-1.5 rounded-full" title="Inline comments">{inlineComments.length}</span>
                                    )}
                                </span>
                            )}
                        </button>
                        <div className="h-4 w-px bg-gray-200 dark:bg-[#2D2F36] mx-1"></div>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors">
                            <Share2 size={14} />
                            <span>Share</span>
                        </button>

                        {/* GitHub Sync Button */}
                        <div className="h-4 w-px bg-gray-200 dark:bg-[#2D2F36] mx-1"></div>
                        {githubIntegration ? (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleGitHubSync}
                                    disabled={isSyncing || !localDocs[activeSection]}
                                    title={
                                        !githubIntegration.repoOwner || !githubIntegration.repoName
                                            ? 'Click to configure GitHub repository'
                                            : githubIntegration.lastSyncAt
                                                ? `Last synced: ${new Date(githubIntegration.lastSyncAt).toLocaleString()}`
                                                : 'Sync to GitHub'
                                    }
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                        isSyncing
                                            ? 'bg-gray-100 dark:bg-[#1F2128] text-gray-400 cursor-wait'
                                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1F2128]'
                                    }`}
                                >
                                    {isSyncing ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Github size={14} />
                                    )}
                                    <span>Sync</span>
                                    {/* Show warning if repo not configured */}
                                    {(!githubIntegration.repoOwner || !githubIntegration.repoName) && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    )}
                                    {githubIntegration.repoOwner && githubIntegration.repoName && githubIntegration.lastSyncStatus === 'success' && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    )}
                                    {githubIntegration.repoOwner && githubIntegration.repoName && githubIntegration.lastSyncStatus === 'failed' && (
                                        <AlertCircle size={12} className="text-red-500" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowGitHubSettings(true)}
                                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors"
                                    title="GitHub Settings"
                                >
                                    <MoreHorizontal size={14} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowGitHubSettings(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors"
                            >
                                <Github size={14} />
                                <span>GitHub</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Live Editable Content */}
                <div className="relative min-h-[500px]">
                    {isGenerating && (
                        <div className="absolute top-0 right-0 flex items-center gap-2 text-blue-500 dark:text-blue-400 text-xs font-bold uppercase tracking-wider animate-pulse bg-blue-50 dark:bg-[#1F2128] px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-500/20 shadow-sm z-10 pointer-events-none">
                            <Sparkles size={12} /> Updating...
                        </div>
                    )}
                    <div
                        ref={contentRef}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={handleContentBlur}
                        onMouseUp={handleContentMouseUp}
                        className={`prose prose-lg prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[400px] selection:bg-blue-100 dark:selection:bg-blue-900/30 ${isGenerating ? 'opacity-50' : 'opacity-100'} transition-opacity`}
                        dangerouslySetInnerHTML={{ __html: currentDocContent }}
                    />

                    {/* Selection Comment Popover */}
                    {selectionPopover.visible && (
                        <SelectionCommentPopover
                            selectedText={selectionPopover.text}
                            position={selectionPopover.position}
                            onAddComment={handleAddInlineComment}
                            onClose={() => setSelectionPopover({ visible: false, text: '', position: { x: 0, y: 0 } })}
                            users={allUsers}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentEditor;
