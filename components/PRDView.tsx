
import React, { useState, useEffect, useRef } from 'react';
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
    Save
} from 'lucide-react';
import { DOC_NAV_ITEMS, USERS } from '../constants';
import { Project, User as UserType, DocVersion } from '../types';
import { useProjectData } from '../context/ProjectDataContext';
import { aiClient } from '../lib/ai';
import { documentsService } from '../services/documents.service';

interface PRDViewProps {
    project?: Project;
}

// Local interface for comments
interface DocComment {
    id: string;
    sectionId: string;
    text: string;
    user: UserType;
    timestamp: Date;
    resolved: boolean;
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
    const { updateProject } = useProjectData();

    // --- State ---
    const [activeSection, setActiveSection] = useState(DOC_NAV_ITEMS[0].id);
    const [localDocs, setLocalDocs] = useState<Record<string, string>>({});
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date>(new Date());

    // Feature State
    const [sections, setSections] = useState<Section[]>(DOC_NAV_ITEMS);
    
    // Structure State for Drag & Drop
    const [docStructure, setDocStructure] = useState<DocGroup[]>([
        ...INITIAL_GROUPS,
        { title: 'Custom', items: [] }
    ]);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

    // History is derived from the project prop to ensure persistence
    const history: DocVersion[] = project?.docHistory || [];
    
    const [comments, setComments] = useState<DocComment[]>([]);
    
    // UI Toggles
    const [showHistory, setShowHistory] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [newCommentText, setNewCommentText] = useState('');
    
    // Save Modal State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [saveComment, setSaveComment] = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const contentRef = useRef<HTMLDivElement>(null);
    const currentUser = USERS[0]; // Gagan

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

    // Get content to display
    const currentDocContent = localDocs[activeSection] || `
        <div class="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center min-h-[400px] select-none pointer-events-none">
            <h2 class="text-xl font-bold mb-2 text-[#172B4D] dark:text-white">Empty Section</h2>
            <p>Type directly here or use AI to generate content.</p>
        </div>
    `;

    const activeItem = sections.find(i => i.id === activeSection);
    const sectionComments = comments.filter(c => c.sectionId === activeSection && !c.resolved);
    const sectionHistory = history.filter(h => h.sectionId === activeSection);

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
                                                
                                                <item.icon size={13} className={`${isActive ? 'text-blue-500' : 'text-gray-400 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400'} flex-shrink-0`} />
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
                                        {sectionComments.length > 0 && (
                                            <span className="bg-blue-600 text-white text-[9px] px-1.5 rounded-full">{sectionComments.length}</span>
                                        )}
                                    </button>
                                    <div className="h-4 w-px bg-gray-200 dark:bg-[#2D2F36] mx-1"></div>
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors">
                                        <Share2 size={14} />
                                        <span>Share</span>
                                    </button>
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
                                    className={`prose prose-lg prose-slate dark:prose-invert max-w-none focus:outline-none min-h-[400px] selection:bg-blue-100 dark:selection:bg-blue-900/30 ${isGenerating ? 'opacity-50' : 'opacity-100'} transition-opacity`}
                                    dangerouslySetInnerHTML={{ __html: currentDocContent }} 
                                />
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

export default PRDView;
