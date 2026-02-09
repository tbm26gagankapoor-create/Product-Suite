
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    FileText,
    X
} from 'lucide-react';
import { Project, User as UserType, DocVersion, DocumentComment } from '../../types';
import { useProjectData } from '../../context/ProjectDataContext';
import { useConfig } from '../../context/ConfigContext';
import { aiClient } from '../../lib/ai';
import { documentsService } from '../../services/documents.service';
import { githubApi, documentCommentsApi } from '../../services/api';
import GitHubIntegrationSettings from '../GitHubIntegrationSettings';
import type { GitHubIntegration } from '../../types';

import DocumentNavigation from './DocumentNavigation';
import DocumentEditor from './DocumentEditor';
import AiGenerationPanel from './AiGenerationPanel';
import VersionHistory from './VersionHistory';
import DocumentComments from './DocumentComments';

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
    const sectionHistory = history.filter(h => h.sectionId === activeSection);

    // Get all users from context for @mentions
    const { users: allUsers } = useProjectData();

    return (
        <div className="flex h-full bg-white dark:bg-[#0B0C0E] text-[#172B4D] dark:text-gray-100 overflow-hidden relative transition-colors duration-200">

            {/* LEFT SIDEBAR NAVIGATOR */}
            <DocumentNavigation
                sections={sections}
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                localDocs={localDocs}
                docStructure={docStructure}
                draggedItemId={draggedItemId}
                isAddingSection={isAddingSection}
                setIsAddingSection={setIsAddingSection}
                newSectionName={newSectionName}
                setNewSectionName={setNewSectionName}
                handleAddSection={handleAddSection}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDropOnItem={handleDropOnItem}
                handleDropOnGroup={handleDropOnGroup}
            />

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 relative bg-white dark:bg-[#0B0C0E]">

                {/* Content Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex">
                    <DocumentEditor
                        activeSection={activeSection}
                        activeItem={activeItem}
                        lastSaved={lastSaved}
                        hasUnsavedChanges={hasUnsavedChanges}
                        isGenerating={isGenerating}
                        currentDocContent={currentDocContent}
                        contentRef={contentRef as React.RefObject<HTMLDivElement>}
                        showHistory={showHistory}
                        showComments={showComments}
                        unresolvedComments={unresolvedComments}
                        inlineComments={inlineComments}
                        selectionPopover={selectionPopover}
                        allUsers={allUsers}
                        githubIntegration={githubIntegration}
                        isSyncing={isSyncing}
                        localDocs={localDocs}
                        setIsSaveModalOpen={setIsSaveModalOpen}
                        setShowHistory={setShowHistory}
                        setShowComments={setShowComments}
                        setShowGitHubSettings={setShowGitHubSettings}
                        handleContentBlur={handleContentBlur}
                        handleContentMouseUp={handleContentMouseUp}
                        handleAddInlineComment={handleAddInlineComment}
                        setSelectionPopover={setSelectionPopover}
                        handleGitHubSync={handleGitHubSync}
                    />

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
                                    <VersionHistory
                                        sectionHistory={sectionHistory}
                                        handleRestore={handleRestore}
                                    />
                                )}

                                {showComments && (
                                    <DocumentComments
                                        isLoadingComments={isLoadingComments}
                                        unresolvedComments={unresolvedComments}
                                        resolvedComments={resolvedComments}
                                        activeInlineComment={activeInlineComment}
                                        setActiveInlineComment={setActiveInlineComment}
                                        showResolved={showResolved}
                                        setShowResolved={setShowResolved}
                                        replyingToId={replyingToId}
                                        setReplyingToId={setReplyingToId}
                                        replyText={replyText}
                                        setReplyText={setReplyText}
                                        replyMentions={replyMentions}
                                        setReplyMentions={setReplyMentions}
                                        newCommentText={newCommentText}
                                        setNewCommentText={setNewCommentText}
                                        newCommentMentions={newCommentMentions}
                                        setNewCommentMentions={setNewCommentMentions}
                                        allUsers={allUsers}
                                        currentUserId={currentUser.id}
                                        contentRef={contentRef as React.RefObject<HTMLDivElement>}
                                        setShowComments={setShowComments}
                                        setShowHistory={setShowHistory}
                                        handlePostComment={handlePostComment}
                                        handleResolveComment={handleResolveComment}
                                        handleUnresolveComment={handleUnresolveComment}
                                        handleDeleteComment={handleDeleteComment}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* AI Input Bar (Bottom) */}
                <AiGenerationPanel
                    prompt={prompt}
                    setPrompt={setPrompt}
                    isGenerating={isGenerating}
                    handleAiSubmit={handleAiSubmit}
                    handleKeyDown={handleKeyDown}
                />

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
