import React, { useState, useEffect, useRef } from 'react';
import {
    Sparkles,
    ArrowRight,
    Loader2,
    Clock,
    PenTool,
    Check,
    FileText,
    MessageSquare,
    Send,
    RotateCcw,
    X,
    Save,
    GitBranch,
    Eye,
    Code2,
} from 'lucide-react';
import { DOC_NAV_ITEMS, USERS } from '../constants';
import { Project, User as UserType, DocVersion } from '../types';
import { useProjectData } from '../context/ProjectDataContext';
import { aiClient } from '../lib/ai';
import { editPRDSection } from '../lib/prompts';
import { useTheme } from '../context/ThemeContext';
import { documentsService } from '../services/documents.service';
import { gitService, ProjectGitSettings } from '../services/git.service';
import { LinkRepositoryModal, SyncDocsModal } from './git';
import MarkdownRenderer from './MarkdownRenderer';

interface DocumentsViewProps {
    activeProject?: Project;
    activeSection: string;
    onSectionChange: (section: string) => void;
}

interface Section {
    id: string;
    label: string;
    icon: any;
    isCustom?: boolean;
}

interface DocComment {
    id: string;
    sectionId: string;
    text: string;
    user: UserType;
    timestamp: Date;
    resolved: boolean;
}

const timeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
};

const DocumentsView: React.FC<DocumentsViewProps> = ({ activeProject, activeSection, onSectionChange }) => {
    const { projects, updateProject } = useProjectData();
    const { theme } = useTheme();
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // --- State ---
    const [localDocs, setLocalDocs] = useState<Record<string, string>>({});
    const [editMode, setEditMode] = useState<'preview' | 'edit'>('preview');
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date>(new Date());

    // Feature State
    const [sections] = useState<Section[]>(DOC_NAV_ITEMS);

    // History
    const history: DocVersion[] = activeProject?.docHistory || [];

    const [comments, setComments] = useState<DocComment[]>([]);

    // UI Toggles
    const [showHistory, setShowHistory] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [newCommentText, setNewCommentText] = useState('');

    // Save Modal
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [saveComment, setSaveComment] = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Git
    const [gitSettings, setGitSettings] = useState<ProjectGitSettings | null>(null);
    const [showLinkRepoModal, setShowLinkRepoModal] = useState(false);
    const [showSyncDocsModal, setShowSyncDocsModal] = useState(false);

    // Edit textarea ref
    const editRef = useRef<HTMLTextAreaElement>(null);

    const currentUser = USERS[0];

    const cleanMarkdown = (text: string) => {
        if (!text) return '';
        return text.replace(/```(?:markdown)?\n?([\s\S]*?)\n?```/gi, '$1').trim();
    };

    // Load docs from DB when project ID changes
    useEffect(() => {
        const loadDocs = async () => {
            if (activeProject?.id) {
                if (activeProject.docs && Object.keys(activeProject.docs).length > 0) {
                    setLocalDocs(prev => ({ ...prev, ...activeProject.docs }));
                } else if (activeProject.prd) {
                    setLocalDocs(prev => ({ ...prev, prd: activeProject.prd || '' }));
                }

                try {
                    const docs = await documentsService.getAll(activeProject.id);
                    const docsMap: Record<string, string> = {};
                    docs.forEach(d => docsMap[d.section_id] = d.content || '');

                    if (Object.keys(docsMap).length > 0) {
                        setLocalDocs(prev => ({ ...prev, ...docsMap }));
                    }
                } catch (e) {
                    console.error("Failed to load documents:", e);
                }
            }
        };
        loadDocs();
    }, [activeProject?.id, activeProject?.docs, activeProject?.prd]);

    // Load Git settings when project changes
    useEffect(() => {
        const loadGitSettings = async () => {
            if (activeProject?.id) {
                try {
                    const settings = await gitService.getProjectGitSettings(activeProject.id);
                    setGitSettings(settings);
                } catch (e) {
                    // Git not configured
                }
            }
        };
        loadGitSettings();
    }, [activeProject?.id]);

    // Reset unsaved changes state when switching sections
    useEffect(() => {
        setHasUnsavedChanges(false);
        setEditMode('preview');
    }, [activeSection]);

    // Save version
    const saveVersion = async (content: string, summary: string = 'Manual edit') => {
        if (!activeProject) return;

        try {
            await documentsService.saveSection(activeProject.id, activeSection, content, summary);
        } catch (e) {
            console.error("Failed to save document section:", e);
        }

        const newVersion: DocVersion = {
            id: `v-${Date.now()}`,
            sectionId: activeSection,
            content,
            user: currentUser,
            timestamp: new Date().toISOString(),
            summary
        };

        const newHistory = [newVersion, ...history];

        updateProject({
            ...activeProject,
            docHistory: newHistory,
            docs: {
                ...(activeProject.docs || {}),
                [activeSection]: content
            }
        });

        setLastSaved(new Date());
        setHasUnsavedChanges(false);
    };

    const handleManualSave = () => {
        const content = localDocs[activeSection] || '';
        saveVersion(content, saveComment || 'Saved version');
        setSaveComment('');
        setIsSaveModalOpen(false);
    };

    const handleAiSubmit = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);

        try {
            const currentContent = localDocs[activeSection] || '';
            const sectionName = sections.find(i => i.id === activeSection)?.label || 'Document';

            const td = editPRDSection(sectionName, currentContent, prompt);

            const response = await aiClient.models.generateContent({
                promptTemplate: td.templateName,
                promptVariables: td.variables,
            });

            const newContent = cleanMarkdown(response.text || '');

            if (newContent) {
                setLocalDocs(prev => ({
                    ...prev,
                    [activeSection]: newContent
                }));
                await saveVersion(newContent, `AI Generated: ${prompt.substring(0, 20)}...`);
                setPrompt('');
            }
        } catch (error) {
            console.error("AI Generation Error:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAiSubmit();
        }
    };

    const handleEditChange = (newContent: string) => {
        setLocalDocs(prev => ({ ...prev, [activeSection]: newContent }));
        setHasUnsavedChanges(true);
    };

    const handlePostComment = () => {
        if (!newCommentText.trim()) return;
        const newComment: DocComment = {
            id: `c-${Date.now()}`,
            sectionId: activeSection,
            text: newCommentText,
            user: currentUser,
            timestamp: new Date(),
            resolved: false
        };
        setComments(prev => [...prev, newComment]);
        setNewCommentText('');
    };

    const handleRestore = async (version: DocVersion) => {
        setLocalDocs(prev => ({ ...prev, [activeSection]: version.content }));
        const dateStr = new Date(version.timestamp).toLocaleString();
        await saveVersion(version.content, `Restored from ${dateStr}`);
        setShowHistory(false);
    };

    // --- Derived ---
    const currentDocContent = localDocs[activeSection] || '';
    const activeItem = sections.find(i => i.id === activeSection);
    const sectionComments = comments.filter(c => c.sectionId === activeSection && !c.resolved);
    const sectionHistory = history.filter(h => h.sectionId === activeSection);

    return (
        <div className="flex flex-1 min-h-0 bg-white dark:bg-[#0B0C0E] text-[#172B4D] dark:text-gray-100 overflow-hidden relative transition-colors duration-200">

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 relative bg-white dark:bg-[#0B0C0E]">

                {/* Content Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex">
                    <div className="flex-1 transition-all duration-300">
                        <div className="max-w-4xl mx-auto p-8 sm:p-12 pb-48">
                            {/* Header Actions Bar */}
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200 dark:border-[#1F2128]">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-[#172B4D] dark:text-gray-200">
                                        {activeItem?.label}
                                    </span>
                                    <span className="text-gray-300 dark:text-gray-700">/</span>
                                    <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-[#1F2128] px-1.5 py-0.5 rounded border border-gray-200 dark:border-[#2D2F36]">
                                        {editMode === 'edit' ? 'Editing' : 'Preview'}
                                    </span>
                                    <span className="text-[10px] text-gray-400 ml-2">
                                        Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Edit/Preview Toggle */}
                                    <div className="flex items-center bg-gray-100 dark:bg-[#1F2128] rounded-lg p-0.5 border border-gray-200 dark:border-[#2D2F36]">
                                        <button
                                            onClick={() => setEditMode('preview')}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                                editMode === 'preview'
                                                    ? 'bg-white dark:bg-[#0B0C0E] text-[#172B4D] dark:text-white shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                        >
                                            <Eye size={12} />
                                            Preview
                                        </button>
                                        <button
                                            onClick={() => setEditMode('edit')}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                                editMode === 'edit'
                                                    ? 'bg-white dark:bg-[#0B0C0E] text-[#172B4D] dark:text-white shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                        >
                                            <Code2 size={12} />
                                            Edit
                                        </button>
                                    </div>

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
                                        {sectionComments.length > 0 && (
                                            <span className="bg-blue-600 text-white text-[9px] px-1.5 rounded-full">{sectionComments.length}</span>
                                        )}
                                    </button>

                                    <div className="h-4 w-px bg-gray-200 dark:bg-[#2D2F36] mx-1"></div>

                                    {/* Git Actions (moved from left panel) */}
                                    <button
                                        onClick={() => gitSettings?.enabled ? setShowSyncDocsModal(true) : setShowLinkRepoModal(true)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                            gitSettings?.enabled
                                                ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1F2128]'
                                        }`}
                                    >
                                        <GitBranch size={14} />
                                        <span>{gitSettings?.enabled ? 'Push to Git' : 'Link Git'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="relative min-h-[500px]">
                                {isGenerating && (
                                    <div className="absolute top-0 right-0 flex items-center gap-2 text-blue-500 dark:text-blue-400 text-xs font-bold uppercase tracking-wider animate-pulse bg-blue-50 dark:bg-[#1F2128] px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-500/20 shadow-sm z-10 pointer-events-none">
                                        <Sparkles size={12} /> Updating...
                                    </div>
                                )}

                                {currentDocContent ? (
                                    editMode === 'edit' ? (
                                        <textarea
                                            ref={editRef}
                                            value={currentDocContent}
                                            onChange={(e) => handleEditChange(e.target.value)}
                                            className="w-full min-h-[500px] bg-gray-50 dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-xl p-6 text-sm font-mono text-[#172B4D] dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y"
                                            spellCheck={false}
                                        />
                                    ) : (
                                        <MarkdownRenderer
                                            content={currentDocContent}
                                            className={`prose prose-lg prose-slate dark:prose-invert max-w-none min-h-[400px] ${isGenerating ? 'opacity-50' : 'opacity-100'} transition-opacity`}
                                        />
                                    )
                                ) : (
                                    <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center min-h-[400px] select-none">
                                        <h2 className="text-xl font-bold mb-2 text-[#172B4D] dark:text-white">Empty Section</h2>
                                        <p>Use AI to generate content or switch to Edit mode to write markdown.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: History & Comments */}
                    {(showHistory || showComments) && (
                        <div className="w-80 border-l border-gray-200 dark:border-[#1F2128] bg-gray-50 dark:bg-[#15171E] flex flex-col animate-in slide-in-from-right-10 duration-200">
                            <div className="p-4 border-b border-gray-200 dark:border-[#1F2128] flex justify-between items-center bg-white dark:bg-[#15171E]">
                                <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                                    {showHistory ? 'Version History' : 'Comments'}
                                </h3>
                                <button onClick={() => { setShowHistory(false); setShowComments(false); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                                {showHistory && (
                                    sectionHistory.length > 0 ? (
                                        sectionHistory.map(version => (
                                            <div key={version.id} className="p-3 bg-white dark:bg-[#1E2028] border border-gray-200 dark:border-[#2D2F36] rounded-xl shadow-sm">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-[#172B4D] dark:text-gray-200">{new Date(version.timestamp).toLocaleDateString()}</span>
                                                    <span className="text-[10px] text-gray-400">{new Date(version.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{version.summary}</p>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <img src={version.user.avatarUrl} className="w-4 h-4 rounded-full" />
                                                        <span className="text-[10px] text-gray-500">{version.user.name}</span>
                                                    </div>
                                                    <button onClick={() => handleRestore(version)} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                                        <RotateCcw size={10} /> Restore
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-gray-400 text-xs">No history yet.</div>
                                    )
                                )}

                                {showComments && (
                                    <>
                                        {sectionComments.length > 0 ? (
                                            sectionComments.map(comment => (
                                                <div key={comment.id} className="p-3 bg-white dark:bg-[#1E2028] border border-gray-200 dark:border-[#2D2F36] rounded-xl shadow-sm">
                                                    <div className="flex items-start gap-3 mb-2">
                                                        <img src={comment.user.avatarUrl} className="w-6 h-6 rounded-full mt-1" />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-[#172B4D] dark:text-gray-200">{comment.user.name}</span>
                                                                <span className="text-[10px] text-gray-400">{timeAgo(new Date(comment.timestamp))}</span>
                                                            </div>
                                                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">{comment.text}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-gray-400 text-xs">No comments yet.</div>
                                        )}

                                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#2D2F36]">
                                            <textarea
                                                value={newCommentText}
                                                onChange={(e) => setNewCommentText(e.target.value)}
                                                placeholder="Add a comment..."
                                                className="w-full bg-white dark:bg-[#1E2028] border border-gray-200 dark:border-[#2D2F36] rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500 dark:text-white resize-none mb-2"
                                                rows={3}
                                            />
                                            <button
                                                onClick={handlePostComment}
                                                disabled={!newCommentText.trim()}
                                                className="w-full py-1.5 bg-blue-600 text-white rounded-md text-xs font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors"
                                            >
                                                Post Comment
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* AI Input Bar (Bottom) */}
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
            </div>

            {/* Link Repository Modal */}
            {showLinkRepoModal && activeProject && (
                <LinkRepositoryModal
                    projectId={activeProject.id}
                    projectName={activeProject.name}
                    currentSettings={gitSettings}
                    onClose={() => setShowLinkRepoModal(false)}
                    onLinked={(settings) => {
                        setGitSettings(settings);
                        setShowLinkRepoModal(false);
                    }}
                />
            )}

            {/* Sync Docs Modal */}
            {showSyncDocsModal && activeProject && gitSettings && (
                <SyncDocsModal
                    projectId={activeProject.id}
                    projectName={activeProject.name}
                    gitSettings={gitSettings}
                    documents={
                        sections
                            .filter(s => localDocs[s.id])
                            .map(s => ({
                                section_id: s.id,
                                section_name: s.label,
                                content: localDocs[s.id],
                            }))
                    }
                    onClose={() => setShowSyncDocsModal(false)}
                    onSynced={() => {
                        setShowSyncDocsModal(false);
                        setGitSettings(prev => prev ? { ...prev, last_sync_at: new Date().toISOString() } : prev);
                    }}
                />
            )}

            {/* Save Version Modal */}
            {isSaveModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#15171E] w-full max-w-sm rounded-xl shadow-2xl border border-gray-200 dark:border-[#2D2F36] p-6">
                        <h3 className="text-lg font-bold text-[#172B4D] dark:text-white mb-2">Save Version</h3>
                        <p className="text-sm text-gray-500 mb-4">Create a checkpoint for this document section.</p>

                        <div className="space-y-3 mb-6">
                            <label className="text-xs font-bold uppercase text-gray-500">Summary (Optional)</label>
                            <input
                                type="text"
                                value={saveComment}
                                onChange={(e) => setSaveComment(e.target.value)}
                                placeholder="e.g. Updated requirements table"
                                className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-white focus:outline-none focus:border-blue-500"
                                autoFocus
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsSaveModalOpen(false)} className="px-3 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-white">Cancel</button>
                            <button onClick={handleManualSave} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700">Save Version</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentsView;
