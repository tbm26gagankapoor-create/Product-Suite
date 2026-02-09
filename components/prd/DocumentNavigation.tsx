
import React from 'react';
import {
    FileText,
    Plus,
    Check,
    GripVertical
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// Helper to get icon component by name
const getIconComponentByName = (iconName: string): any => {
    return (LucideIcons as any)[iconName] || FileText;
};

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

interface DocumentNavigationProps {
    sections: Section[];
    activeSection: string;
    setActiveSection: (id: string) => void;
    localDocs: Record<string, string>;
    docStructure: DocGroup[];
    draggedItemId: string | null;
    isAddingSection: boolean;
    setIsAddingSection: (value: boolean) => void;
    newSectionName: string;
    setNewSectionName: (value: string) => void;
    handleAddSection: () => void;
    handleDragStart: (e: React.DragEvent, id: string) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDropOnItem: (e: React.DragEvent, targetId: string) => void;
    handleDropOnGroup: (e: React.DragEvent, groupTitle: string) => void;
}

const DocumentNavigation: React.FC<DocumentNavigationProps> = ({
    sections,
    activeSection,
    setActiveSection,
    localDocs,
    docStructure,
    draggedItemId,
    isAddingSection,
    setIsAddingSection,
    newSectionName,
    setNewSectionName,
    handleAddSection,
    handleDragStart,
    handleDragOver,
    handleDropOnItem,
    handleDropOnGroup,
}) => {
    return (
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
    );
};

export default DocumentNavigation;
