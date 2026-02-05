
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    ChevronDown,
    Sparkles,
    Search,
    ChevronRight,
    ArrowRight,
    Loader2,
    Clock,
    Share2,
    MoreHorizontal,
    Maximize2,
    PenTool,
    Check,
    FileText,
    Plus,
    MessageSquare,
    Send,
    User,
    RotateCcw,
    X,
    Trash2,
    GripVertical,
    Save,
    Github,
    AlertCircle
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Project, User as UserType, DocVersion, DocumentComment } from '../types';
import { useProjectData } from '../context/ProjectDataContext';
import { useConfig } from '../context/ConfigContext';
import MentionInput from './MentionInput';
import MentionText from './MentionText';
import SelectionCommentPopover from './SelectionCommentPopover';

// Helper to get icon component by name
const getIconComponentByName = (iconName: string): any => {
    return (LucideIcons as any)[iconName] || FileText;
};
import { aiClient } from '../lib/ai';
import { documentsService } from '../services/documents.service';
import { githubApi, documentCommentsApi } from '../services/api';
import GitHubIntegrationSettings from './GitHubIntegrationSettings';
import type { GitHubIntegration } from '../types';

interface PRDViewProps {
    project?: Project;
}

interface Section {
    id: string;
    label: string;
    icon: any;
    isCustom?: boolean;
}

interface DocGroup {
    title: string;
    items: string[];
}

const INITIAL_GROUPS: DocGroup[] = [
    { title: 'Strategy', items: ['prd', 'roadmap', 'modules'] },
    { title: 'Architecture', items: ['business', 'data', 'app', 'tech'] },
    { title: 'Design', items: ['design-guidelines', 'design'] },
    { title: 'Implementation', items: ['adrs', 'specs'] },
    { title: 'User Experience', items: ['user-flows', 'biz-flow', 'sys-flow', 'integrations'] }
];

// Helper for relative time
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

const PRDView: React.FC<PRDViewProps> = ({ project }) => {
    // --- Context ---
    const { updateProject, currentUser } = useProjectData();
    const { docNavItems } = useConfig();

    // --- State ---
    const [activeSection, setActiveSection] = useState(docNavItems[0]?.id || 'prd');
    const [localDocs, setLocalDocs] = useState<Record<string, string>>({});
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date>(new Date());

    // Feature State - Transform docNavItems to match Section interface
    const [sections, setSections] = useState<Section[]>([]);
    
    // Structure State for Drag & Drop
    const [docStructure, setDocStructure] = useState<DocGroup[]>([
        ...INITIAL_GROUPS,
        { title: 'Custom', items: [] }
    ]);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

    // History is derived from the project prop to ensure persistence
    const history: DocVersion[] = project?.docHistory || [];

    // Comments state - now persisted via API
    const [comments, setComments] = useState<DocumentComment[]>([]);
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [showResolved, setShowResolved] = useState(false);
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');

    // Inline text selection state (Google Docs style)
    const [selectionPopover, setSelectionPopover] = useState<{
        visible: boolean;
        text: string;
        position: { x: number; y: number };
    }>({ visible: false, text: '', position: { x: 0, y: 0 } });
    const [activeInlineComment, setActiveInlineComment] = useState<DocumentComment | null>(null);

    // UI Toggles
    const [showHistory, setShowHistory] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [newCommentText, setNewCommentText] = useState('');
    const [newCommentMentions, setNewCommentMentions] = useState<string[]>([]);
    const [replyMentions, setReplyMentions] = useState<string[]>([]);
    
    // Save Modal State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [saveComment, setSaveComment] = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // GitHub Integration State
    const [showGitHubSettings, setShowGitHubSettings] = useState(false);
    const [githubIntegration, setGithubIntegration] = useState<GitHubIntegration | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const contentRef = useRef<HTMLDivElement>(null);

    // Initialize sections from config when docNavItems is available
    useEffect(() => {
        if (docNavItems.length > 0 && sections.length === 0) {
            setSections(docNavItems.map(item => ({
                id: item.name,
                label: item.label,
                icon: item.icon,
                isCustom: false
            })));
        }
    }, [docNavItems, sections.length]);

    const cleanHtml = (text: string) => {
        if (!text) return '';
        return text.replace(/```(?:html)?\n?([\s\S]*?)\n?```/gi, '$1').trim();
    };

    // Load docs from DB when project ID changes
    useEffect(() => {
        const loadDocs = async () => {
            if (project?.id) {
                // Initialize with optimistic data first to avoid flickering if available
                if (project.docs && Object.keys(project.docs).length > 0) {
                    setLocalDocs(prev => ({ ...prev, ...project.docs }));
                } else if (project.prd) {
                    setLocalDocs(prev => ({ ...prev, prd: project.prd || '' }));
                }

                try {
                    const docs = await documentsService.getAll(project.id);
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
    }, [project?.id, project?.docs, project?.prd]);

    // Reset unsaved changes state when switching sections
    useEffect(() => {
        setHasUnsavedChanges(false);
    }, [activeSection]);

    // Load comments from API when project or section changes
    useEffect(() => {
        const loadComments = async () => {
            if (!project?.id || !activeSection) return;
            setIsLoadingComments(true);
            try {
                const fetchedComments = await documentCommentsApi.getBySection(project.id, activeSection);
                setComments(fetchedComments);
            } catch (error) {
                console.error('Failed to load comments:', error);
            } finally {
                setIsLoadingComments(false);
            }
        };
        loadComments();
    }, [project?.id, activeSection]);

    // Load GitHub integration status
    const loadGitHubIntegration = useCallback(async () => {
        if (!project?.id) return;
        try {
            const integration = await githubApi.getIntegration(project.id);
            setGithubIntegration(integration);
        } catch (error) {
            console.error('Failed to load GitHub integration:', error);
        }
    }, [project?.id]);

    useEffect(() => {
        loadGitHubIntegration();
    }, [loadGitHubIntegration]);

    // Handle GitHub manual sync
    const handleGitHubSync = async () => {
        if (!project?.id || !githubIntegration || isSyncing) return;

        // Check if repo is configured - if not, open settings modal
        const needsSetup = !githubIntegration.repoOwner || !githubIntegration.repoName;
        if (needsSetup) {
            setShowGitHubSettings(true);
            return;
        }

        const content = localDocs[activeSection] || '';
        if (!content) return;

        setIsSyncing(true);
        try {
            const result = await githubApi.manualSync(project.id, activeSection, content);
            if (result.success) {
                // Reload integration to get updated lastSyncAt
                await loadGitHubIntegration();
                alert('Successfully synced to GitHub!');
            } else {
                console.error('GitHub sync failed:', result.error);
                alert(`GitHub sync failed: ${result.error || 'Unknown error'}\n\nTip: If you see "Resource not accessible", try selecting a different repository in GitHub Settings.`);
            }
        } catch (error) {
            console.error('GitHub sync error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`GitHub sync error: ${errorMessage}`);
        } finally {
            setIsSyncing(false);
        }
    };

    // Handle Content Updates (Live Edit without Auto-save to history)
    const handleContentBlur = () => {
        if (contentRef.current) {
            const newContent = contentRef.current.innerHTML;
            if (newContent !== localDocs[activeSection]) {
                // Update local draft state
                setLocalDocs(prev => ({ ...prev, [activeSection]: newContent }));
                // Flag as unsaved
                setHasUnsavedChanges(true);
            }
        }
    };

    const saveVersion = async (content: string, summary: string = 'Manual edit') => {
        if (!project) return;

        // Persist to DB via service
        try {
            await documentsService.saveSection(project.id, activeSection, content, summary);
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
        
        // Append new version to the BEGINNING of the history array (newest first)
        const newHistory = [newVersion, ...history];
        
        // Update the project's current docs AND history via context
        updateProject({
            ...project,
            docHistory: newHistory,
            docs: {
                ...(project.docs || {}),
                [activeSection]: content
            }
        });

        setLastSaved(new Date());
        setHasUnsavedChanges(false);
    };

    const handleManualSave = () => {
        const content = localDocs[activeSection] || '';
        // If contentRef is current, use that to be safe, otherwise fallback to localDocs
        const currentContent = contentRef.current ? contentRef.current.innerHTML : content;
        
        saveVersion(currentContent, saveComment || 'Saved version');
        setSaveComment('');
        setIsSaveModalOpen(false);
    };

    const handleAiSubmit = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);

        try {
            const currentContent = localDocs[activeSection] || '';
            const sectionName = sections.find(i => i.id === activeSection)?.label || 'Document';

            const systemPrompt = `
                You are an expert Product Manager and Technical Architect.
                Your task is to update or generate the "${sectionName}" section of a PRD based on the user's request.
                
                CURRENT CONTENT (HTML):
                ${currentContent}
                
                USER INSTRUCTION:
                ${prompt}
                
                REQUIREMENTS:
                1. Return the FULL updated HTML for this section.
                2. Use Tailwind CSS classes for styling.
                3. **Style Guide**:
                   - Use spacious layouts (p-6, mb-8).
                   - Use cards for grouping related info (bg-white dark:bg-[#1E2028] border border-gray-200 dark:border-[#2D2F36] rounded-xl shadow-sm).
                   - Use headers with clear hierarchy (text-xl font-bold mb-4 text-[#172B4D] dark:text-white).
                   - Use tables for structured data (w-full text-left border-collapse, headers bg-gray-50 dark:bg-[#1F2128]).
                   - Use accent colors for emphasis (text-blue-600, bg-blue-50, border-l-4 border-blue-500).
                4. Maintain a dark-mode friendly professional look.
                5. Do NOT wrap output in markdown. Return raw HTML only.
            `;

            const response = await aiClient.models.generateContent({
                model: 'openai/gpt-oss-120b',
                contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
            });

            const newHtml = cleanHtml(response.text || '');
            
            if (newHtml) {
                setLocalDocs(prev => ({
                    ...prev,
                    [activeSection]: newHtml
                }));
                // AI changes are auto-saved as a version
                await saveVersion(newHtml, `AI Generated: ${prompt.substring(0, 20)}...`);
                setPrompt('');
                
                // Update the editable div directly to reflect changes immediately without full re-render glitch
                if (contentRef.current) {
                    contentRef.current.innerHTML = newHtml;
                }
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

    // --- Drag and Drop Handlers ---

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.stopPropagation();
        setDraggedItemId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropOnItem = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!draggedItemId || draggedItemId === targetId) return;

        const newStruct = JSON.parse(JSON.stringify(docStructure)) as DocGroup[];
        
        // Find Source
        let sourceGroupIdx = -1;
        let sourceItemIdx = -1;
        
        for(let g=0; g<newStruct.length; g++) {
            const idx = newStruct[g].items.indexOf(draggedItemId);
            if(idx !== -1) {
                sourceGroupIdx = g;
                sourceItemIdx = idx;
                break;
            }
        }
        
        if (sourceGroupIdx === -1) return;
        
        // Remove from Source
        newStruct[sourceGroupIdx].items.splice(sourceItemIdx, 1);
        
        // Find Target
        let targetGroupIdx = -1;
        let targetItemIdx = -1;
        
        for(let g=0; g<newStruct.length; g++) {
            const idx = newStruct[g].items.indexOf(targetId);
            if(idx !== -1) {
                targetGroupIdx = g;
                targetItemIdx = idx;
                break;
            }
        }
        
        if (targetGroupIdx !== -1) {
            // Insert at Target
            newStruct[targetGroupIdx].items.splice(targetItemIdx, 0, draggedItemId);
            setDocStructure(newStruct);
        }
        
        setDraggedItemId(null);
    };

    const handleDropOnGroup = (e: React.DragEvent, groupTitle: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!draggedItemId) return;

        const newStruct = JSON.parse(JSON.stringify(docStructure)) as DocGroup[];
        
        // Find Source
        let sourceGroupIdx = -1;
        let sourceItemIdx = -1;
        
        for(let g=0; g<newStruct.length; g++) {
            const idx = newStruct[g].items.indexOf(draggedItemId);
            if(idx !== -1) {
                sourceGroupIdx = g;
                sourceItemIdx = idx;
                break;
            }
        }
        
        if (sourceGroupIdx === -1) return;
        
        // Remove from Source
        newStruct[sourceGroupIdx].items.splice(sourceItemIdx, 1);
        
        // Add to end of Target Group
        const targetGroup = newStruct.find(g => g.title === groupTitle);
        if (targetGroup) {
            targetGroup.items.push(draggedItemId);
            setDocStructure(newStruct);
        }
        
        setDraggedItemId(null);
    };

    // --- Feature Handlers ---

    const handleAddSection = () => {
        if (!newSectionName.trim()) return;
        const newId = `custom-${Date.now()}`;
        const newSection: Section = {
            id: newId,
            label: newSectionName,
            icon: FileText,
            isCustom: true
        };
        
        // Add to sections metadata
        setSections(prev => [...prev, newSection]);
        // Add placeholder content
        setLocalDocs(prev => ({ ...prev, [newId]: `<h2>${newSectionName}</h2><p>Start writing here...</p>` }));
        
        // Add to Structure (Custom Group)
        setDocStructure(prev => {
            const newStruct = [...prev];
            const customGroup = newStruct.find(g => g.title === 'Custom');
            if (customGroup) {
                customGroup.items.push(newId);
            } else {
                newStruct.push({ title: 'Custom', items: [newId] });
            }
            return newStruct;
        });

        setActiveSection(newId);
        setNewSectionName('');
        setIsAddingSection(false);
    };

    const handlePostComment = async (parentCommentId?: string) => {
        const textToPost = parentCommentId ? replyText : newCommentText;
        const mentionsToPost = parentCommentId ? replyMentions : newCommentMentions;
        if (!textToPost.trim() || !project?.id) return;

        try {
            const newComment = await documentCommentsApi.create(project.id, {
                section_id: activeSection,
                text: textToPost,
                mentions: mentionsToPost,
                parent_comment_id: parentCommentId,
            });

            if (parentCommentId) {
                // Add reply to parent comment
                setComments(prev => prev.map(c => {
                    if (c.id === parentCommentId) {
                        return { ...c, replies: [...(c.replies || []), newComment] };
                    }
                    return c;
                }));
                setReplyingToId(null);
                setReplyText('');
                setReplyMentions([]);
            } else {
                // Add new root comment
                setComments(prev => [newComment, ...prev]);
                setNewCommentText('');
                setNewCommentMentions([]);
            }
        } catch (error) {
            console.error('Failed to post comment:', error);
        }
    };

    const handleResolveComment = async (commentId: string) => {
        try {
            const updated = await documentCommentsApi.resolve(commentId);
            setComments(prev => prev.map(c => c.id === commentId ? updated : c));
        } catch (error) {
            console.error('Failed to resolve comment:', error);
        }
    };

    const handleUnresolveComment = async (commentId: string) => {
        try {
            const updated = await documentCommentsApi.unresolve(commentId);
            setComments(prev => prev.map(c => c.id === commentId ? updated : c));
        } catch (error) {
            console.error('Failed to unresolve comment:', error);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        try {
            await documentCommentsApi.delete(commentId);
            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (error) {
            console.error('Failed to delete comment:', error);
        }
    };

    const handleRestore = async (version: DocVersion) => {
        // Restore content to active editor and local state
        setLocalDocs(prev => ({ ...prev, [activeSection]: version.content }));
        if (contentRef.current) {
            contentRef.current.innerHTML = version.content;
        }

        // Save this restored state as a new version to maintain history and update DB
        const dateStr = new Date(version.timestamp).toLocaleString();
        await saveVersion(version.content, `Restored from ${dateStr}`);

        // Close history panel to show the restored doc
        setShowHistory(false);
    };

    // --- Inline Text Selection Handlers ---
    const handleTextSelection = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !contentRef.current) {
            setSelectionPopover({ visible: false, text: '', position: { x: 0, y: 0 } });
            return;
        }

        const selectedText = selection.toString().trim();
        if (!selectedText || selectedText.length < 2) {
            setSelectionPopover({ visible: false, text: '', position: { x: 0, y: 0 } });
            return;
        }

        // Check if selection is within the content area
        const range = selection.getRangeAt(0);
        if (!contentRef.current.contains(range.commonAncestorContainer)) {
            setSelectionPopover({ visible: false, text: '', position: { x: 0, y: 0 } });
            return;
        }

        // Get the position of the selection
        const rect = range.getBoundingClientRect();
        const position = {
            x: rect.left + rect.width / 2,
            y: rect.top,
        };

        setSelectionPopover({
            visible: true,
            text: selectedText,
            position,
        });
    }, []);

    // Handle mouseup on content area to detect selection
    const handleContentMouseUp = useCallback((e: React.MouseEvent) => {
        // Delay to allow selection to be properly set
        setTimeout(() => {
            handleTextSelection();
        }, 10);
    }, [handleTextSelection]);

    // Add inline comment with text selection
    const handleAddInlineComment = async (text: string, selectedText: string, selectionId: string, mentions?: string[]) => {
        if (!project?.id) return;

        try {
            const newComment = await documentCommentsApi.create(project.id, {
                section_id: activeSection,
                text,
                mentions,
                selected_text: selectedText,
                selection_id: selectionId,
            });

            // Add to comments list
            setComments(prev => [newComment, ...prev]);

            // Wrap the selected text with a highlight span
            wrapSelectionWithHighlight(selectionId);

            // Clear the selection
            window.getSelection()?.removeAllRanges();
            setSelectionPopover({ visible: false, text: '', position: { x: 0, y: 0 } });

            // Open comments panel
            setShowComments(true);
            setShowHistory(false);
        } catch (error) {
            console.error('Failed to add inline comment:', error);
        }
    };

    // Wrap selected text with highlight span
    const wrapSelectionWithHighlight = (selectionId: string) => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const range = selection.getRangeAt(0);

        // Create highlight span
        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'inline-comment-highlight bg-yellow-200/50 dark:bg-yellow-500/20 border-b-2 border-yellow-400 dark:border-yellow-500/50 cursor-pointer hover:bg-yellow-200/70 dark:hover:bg-yellow-500/30 transition-colors';
        highlightSpan.setAttribute('data-selection-id', selectionId);
        highlightSpan.onclick = (e) => {
            e.stopPropagation();
            const comment = comments.find(c => c.selectionId === selectionId);
            if (comment) {
                setActiveInlineComment(comment);
                setShowComments(true);
                setShowHistory(false);
            }
        };

        // Wrap the selection
        try {
            range.surroundContents(highlightSpan);
            // Update local docs to persist the highlight
            if (contentRef.current) {
                const newContent = contentRef.current.innerHTML;
                setLocalDocs(prev => ({ ...prev, [activeSection]: newContent }));
                setHasUnsavedChanges(true);
            }
        } catch (error) {
            // Can fail if selection spans multiple elements
            console.error('Could not wrap selection:', error);
        }
    };

    // Apply highlights for existing inline comments when content loads
    const applyExistingHighlights = useCallback(() => {
        if (!contentRef.current) return;

        const inlineComments = comments.filter(c => c.selectedText && c.selectionId && !c.parentCommentId && !c.isResolved);

        inlineComments.forEach(comment => {
            // Check if highlight already exists
            const existingHighlight = contentRef.current?.querySelector(`[data-selection-id="${comment.selectionId}"]`);
            if (existingHighlight) {
                // Re-attach click handler
                existingHighlight.addEventListener('click', (e) => {
                    e.stopPropagation();
                    setActiveInlineComment(comment);
                    setShowComments(true);
                    setShowHistory(false);
                });
            }
        });
    }, [comments]);

    // Apply highlights when comments change
    useEffect(() => {
        applyExistingHighlights();
    }, [applyExistingHighlights]);

    // Handle clicking on inline highlight
    const handleHighlightClick = useCallback((e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const selectionId = target.getAttribute('data-selection-id');
        if (selectionId) {
            const comment = comments.find(c => c.selectionId === selectionId);
            if (comment) {
                setActiveInlineComment(comment);
                setShowComments(true);
                setShowHistory(false);
            }
        }
    }, [comments]);

    // Set up click listener for highlights
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.addEventListener('click', handleHighlightClick);
            return () => {
                contentRef.current?.removeEventListener('click', handleHighlightClick);
            };
        }
    }, [handleHighlightClick]);

    // Get content to display
    const currentDocContent = localDocs[activeSection] || `
        <div class="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center min-h-[400px] select-none pointer-events-none">
            <h2 class="text-xl font-bold mb-2 text-[#172B4D] dark:text-white">Empty Section</h2>
            <p>Type directly here or use AI to generate content.</p>
        </div>
    `;

    const activeItem = sections.find(i => i.id === activeSection);
    const unresolvedComments = comments.filter(c => !c.isResolved && !c.parentCommentId);
    const resolvedComments = comments.filter(c => c.isResolved && !c.parentCommentId);
    const inlineComments = unresolvedComments.filter(c => c.selectedText && c.selectionId);
    const sectionComments = unresolvedComments.filter(c => !c.selectedText);
    const sectionHistory = history.filter(h => h.sectionId === activeSection);

    // Get all users from context for @mentions
    const { users: allUsers } = useProjectData();

    return (
        <div className="flex h-full bg-white dark:bg-[#0B0C0E] text-[#172B4D] dark:text-gray-100 overflow-hidden relative transition-colors duration-200">
            
            {/* LEFT SIDEBAR NAVIGATOR */}
            <div className="w-60 bg-gray-50 dark:bg-[#0B0C0E] border-r border-gray-200 dark:border-[#1F2128] flex flex-col flex-shrink-0 z-10 pt-4">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-[#1F2128] mb-2 flex justify-between items-center">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <FileText size={12} />
                        Table of Contents
                    </h3>
                    <button 
                        onClick={() => setIsAddingSection(!isAddingSection)} 
                        className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Add Section"
                    >
                        <Plus size={14} />
                    </button>
                </div>

                {isAddingSection && (
                    <div className="px-3 mb-2 animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center gap-1 bg-white dark:bg-[#1F2128] border border-blue-500 rounded-md p-1">
                            <input 
                                type="text" 
                                value={newSectionName}
                                onChange={(e) => setNewSectionName(e.target.value)}
                                placeholder="Section Name"
                                className="w-full text-xs bg-transparent border-none focus:ring-0 text-[#172B4D] dark:text-white p-1"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                            />
                            <button onClick={handleAddSection} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1 rounded"><Check size={12} /></button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4">
                    {/* Render Groups from State */}
                    {docStructure.map((group, groupIdx) => {
                        // Only render groups if they have items or if it's the Custom group (so we can drop into it)
                        if (group.items.length === 0 && group.title !== 'Custom') return null;

                        return (
                            <div 
                                key={group.title} 
                                className="mb-4 last:mb-0"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDropOnGroup(e, group.title)}
                            >
                                <div className="px-2 mb-1.5 flex items-center justify-between group/header">
                                    <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider opacity-80">{group.title}</span>
                                </div>
                                <div className="space-y-0.5 min-h-[10px]">
                                    {group.items.map(itemId => {
                                        const item = sections.find(i => i.id === itemId);
                                        if (!item) return null;
                                        const isActive = activeSection === item.id;
                                        const hasContent = !!localDocs[item.id];
                                        
                                        return (
                                            <div
                                                key={item.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, item.id)}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDropOnItem(e, item.id)}
                                                onClick={() => setActiveSection(item.id)}
                                                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer group ${
                                                    isActive
                                                    ? 'bg-white dark:bg-[#1F2128] text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-[#2D2F36]'
                                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#1F2128]/50 hover:text-[#172B4D] dark:hover:text-gray-200'
                                                } ${draggedItemId === item.id ? 'opacity-50 dashed border border-blue-400' : ''}`}
                                            >
                                                {/* Grip Handle - Visible on hover or active */}
                                                <div className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 -ml-1 transition-opacity">
                                                    <GripVertical size={12} />
                                                </div>
                                                
                                                {(() => {
                                                    const IconComponent = typeof item.icon === 'string' ? getIconComponentByName(item.icon) : item.icon;
                                                    return <IconComponent size={13} className={`${isActive ? 'text-blue-500' : 'text-gray-400 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400'} flex-shrink-0`} />;
                                                })()}
                                                <span className="truncate flex-1 select-none">{item.label}</span>
                                                {hasContent && !isActive && (
                                                    <div className="ml-auto w-1 h-1 rounded-full bg-green-500 flex-shrink-0"></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {/* Placeholder for empty groups to allow drop */}
                                    {group.items.length === 0 && (
                                        <div className="text-[10px] text-gray-300 dark:text-gray-600 italic px-2 py-1">
                                            Drop items here
                                        </div>
                                    )}
                                </div>
                                {/* Divider between groups */}
                                {groupIdx < docStructure.length - 1 && (
                                    <div className="mt-3 mx-2 border-b border-gray-200 dark:border-[#1F2128]/50"></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 relative bg-white dark:bg-[#0B0C0E]">
                
                {/* Content Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex">
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
                                                    <span className="text-[10px] text-gray-400">{new Date(version.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
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
                                        {isLoadingComments ? (
                                            <div className="text-center py-8">
                                                <Loader2 size={20} className="animate-spin text-blue-500 mx-auto" />
                                                <p className="text-gray-400 text-xs mt-2">Loading comments...</p>
                                            </div>
                                        ) : unresolvedComments.length > 0 ? (
                                            unresolvedComments.map(comment => (
                                                <div
                                                    key={comment.id}
                                                    className={`p-3 bg-white dark:bg-[#1E2028] border rounded-xl shadow-sm cursor-pointer transition-all ${
                                                        activeInlineComment?.id === comment.id
                                                            ? 'border-yellow-400 dark:border-yellow-500/50 ring-2 ring-yellow-200 dark:ring-yellow-500/20'
                                                            : 'border-gray-200 dark:border-[#2D2F36] hover:border-gray-300 dark:hover:border-[#3D3F46]'
                                                    }`}
                                                    onClick={() => {
                                                        if (comment.selectionId) {
                                                            // Scroll to and highlight the inline comment in the document
                                                            const highlight = contentRef.current?.querySelector(`[data-selection-id="${comment.selectionId}"]`);
                                                            if (highlight) {
                                                                highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                highlight.classList.add('ring-2', 'ring-yellow-400');
                                                                setTimeout(() => {
                                                                    highlight.classList.remove('ring-2', 'ring-yellow-400');
                                                                }, 2000);
                                                            }
                                                            setActiveInlineComment(comment);
                                                        }
                                                    }}
                                                >
                                                    {/* Selected text preview for inline comments */}
                                                    {comment.selectedText && (
                                                        <div className="mb-2 px-2 py-1 bg-yellow-50 dark:bg-yellow-500/10 border-l-2 border-yellow-400 dark:border-yellow-500/50 rounded-r">
                                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 italic">
                                                                "{comment.selectedText.length > 60 ? comment.selectedText.substring(0, 60) + '...' : comment.selectedText}"
                                                            </p>
                                                        </div>
                                                    )}
                                                    <div className="flex items-start gap-3">
                                                        <img src={comment.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName || 'User')}&background=random`} className="w-6 h-6 rounded-full mt-1" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-[#172B4D] dark:text-gray-200">{comment.userName || 'Unknown'}</span>
                                                                    <span className="text-[10px] text-gray-400">{timeAgo(new Date(comment.createdAt))}</span>
                                                                    {comment.isEdited && <span className="text-[9px] text-gray-400">(edited)</span>}
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleResolveComment(comment.id); }}
                                                                        className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                                                        title="Resolve comment"
                                                                    >
                                                                        <Check size={12} />
                                                                    </button>
                                                                    {comment.userId === currentUser.id && (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }}
                                                                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                                                            title="Delete comment"
                                                                        >
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                                                                <MentionText text={comment.text} users={allUsers} />
                                                            </div>

                                                            {/* Reply button */}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setReplyingToId(replyingToId === comment.id ? null : comment.id); }}
                                                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline mt-2"
                                                            >
                                                                Reply
                                                            </button>

                                                            {/* Replies */}
                                                            {comment.replies && comment.replies.length > 0 && (
                                                                <div className="mt-3 pl-4 border-l-2 border-gray-200 dark:border-[#2D2F36] space-y-3">
                                                                    {comment.replies.map(reply => (
                                                                        <div key={reply.id} className="flex items-start gap-2">
                                                                            <img src={reply.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.userName || 'User')}&background=random`} className="w-5 h-5 rounded-full mt-0.5" />
                                                                            <div className="flex-1">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-[10px] font-bold text-[#172B4D] dark:text-gray-200">{reply.userName || 'Unknown'}</span>
                                                                                    <span className="text-[9px] text-gray-400">{timeAgo(new Date(reply.createdAt))}</span>
                                                                                </div>
                                                                                <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
                                                                                    <MentionText text={reply.text} users={allUsers} />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Reply input */}
                                                            {replyingToId === comment.id && (
                                                                <div className="mt-3 pl-4 border-l-2 border-blue-300 dark:border-blue-500/30">
                                                                    <MentionInput
                                                                        value={replyText}
                                                                        onChange={setReplyText}
                                                                        onMentionsChange={setReplyMentions}
                                                                        onSubmit={() => handlePostComment(comment.id)}
                                                                        placeholder="Write a reply... Use @ to mention"
                                                                        users={allUsers}
                                                                        rows={2}
                                                                        className="text-[11px]"
                                                                    />
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <button
                                                                            onClick={() => handlePostComment(comment.id)}
                                                                            disabled={!replyText.trim()}
                                                                            className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors"
                                                                        >
                                                                            Reply
                                                                        </button>
                                                                        <button
                                                                            onClick={() => { setReplyingToId(null); setReplyText(''); }}
                                                                            className="px-2 py-1 text-gray-500 text-[10px] hover:text-gray-700 dark:hover:text-gray-300"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-gray-400 text-xs">No comments yet.</div>
                                        )}

                                        {/* Resolved comments section */}
                                        {resolvedComments.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#2D2F36]">
                                                <button
                                                    onClick={() => setShowResolved(!showResolved)}
                                                    className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-2"
                                                >
                                                    <ChevronRight size={14} className={`transition-transform ${showResolved ? 'rotate-90' : ''}`} />
                                                    <span>{resolvedComments.length} resolved</span>
                                                </button>
                                                {showResolved && (
                                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                                        {resolvedComments.map(comment => (
                                                            <div key={comment.id} className="p-3 bg-gray-50 dark:bg-[#1E2028]/50 border border-gray-200 dark:border-[#2D2F36] rounded-xl opacity-60">
                                                                <div className="flex items-start gap-3">
                                                                    <img src={comment.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName || 'User')}&background=random`} className="w-5 h-5 rounded-full mt-1" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <span className="text-[10px] font-bold text-gray-500">{comment.userName || 'Unknown'}</span>
                                                                            <button
                                                                                onClick={() => handleUnresolveComment(comment.id)}
                                                                                className="text-[9px] text-blue-600 dark:text-blue-400 hover:underline"
                                                                            >
                                                                                Reopen
                                                                            </button>
                                                                        </div>
                                                                        <div className="text-[10px] text-gray-400 mt-1 line-through">
                                                                            <MentionText text={comment.text} users={allUsers} />
                                                                        </div>
                                                                        {comment.resolvedByName && (
                                                                            <p className="text-[9px] text-green-600 dark:text-green-400 mt-1">
                                                                                Resolved by {comment.resolvedByName}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* New comment input */}
                                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#2D2F36]">
                                            <MentionInput
                                                value={newCommentText}
                                                onChange={setNewCommentText}
                                                onMentionsChange={setNewCommentMentions}
                                                onSubmit={() => handlePostComment()}
                                                placeholder="Add a comment... Use @ to mention"
                                                users={allUsers}
                                                rows={3}
                                            />
                                            <button
                                                onClick={() => handlePostComment()}
                                                disabled={!newCommentText.trim()}
                                                className="w-full mt-2 py-1.5 bg-blue-600 text-white rounded-md text-xs font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors"
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

            {/* GitHub Integration Settings Modal */}
            {showGitHubSettings && project && (
                <GitHubIntegrationSettings
                    projectId={project.id}
                    projectName={project.name}
                    isModal={true}
                    onClose={() => {
                        setShowGitHubSettings(false);
                        loadGitHubIntegration();
                    }}
                />
            )}

        </div>
    );
};

export default PRDView;
