
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Rocket,
  Bug,
  CheckSquare,
  Bookmark,
  Calendar,
  Hexagon,
  CheckCircle2,
  Clock,
  Wrench,
  DollarSign
} from 'lucide-react';
import { Task } from '../types';
import { useProjectData } from '../context/ProjectDataContext';

interface TaskCardProps {
  task: Task;
  isSelected?: boolean;
  onToggleSelection?: (id: string, multi: boolean) => void;
  onClick?: (task: Task) => void;
  onUpdate?: (task: Task) => void;
}

const getWorkTypeIcon = (type?: string) => {
    switch(type) {
        case 'epic': return <Hexagon size={14} className="text-purple-400 dark:text-purple-400" fill="currentColor" fillOpacity={0.15} />;
        case 'feature': return <Rocket size={14} className="text-pink-400 dark:text-pink-400" />;
        case 'bug': return <Bug size={14} className="text-red-400 dark:text-red-400" />;
        case 'story': return <Bookmark size={14} className="text-emerald-400 dark:text-emerald-400" />;
        case 'task': default: return <CheckSquare size={14} className="text-blue-400 dark:text-blue-400" />;
    }
};

const TaskCard: React.FC<TaskCardProps> = React.memo(({ task, isSelected, onToggleSelection, onClick, onUpdate }) => {
  const { tasks: allTasks } = useProjectData();
  const {
    id,
    title,
    description,
    assignee,
    reporter,
    type,
    priority,
    points,
    tags,
    imageUrl,
    dueDate,
    parentEpicId,
    technicalDebt,
    customerValue,
    labels
  } = task;

  const parentEpic = parentEpicId ? allTasks.find(t => t.id === parentEpicId) : null;

  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [hoverPosition, setHoverPosition] = useState<{top: number, left: number} | null>(null);

  const displayWorkType = type || 'task';
  const cleanDescription = description ? description.replace(/<[^>]*>/g, '') : 'No description provided.';

  useEffect(() => {
      const updatePosition = () => {
          if (isHovered && cardRef.current && !isEditing) {
              const rect = cardRef.current.getBoundingClientRect();
              const HOVER_WIDTH = 320;
              const GAP = 12;
              
              let top = rect.top;
              let left = rect.right + GAP;
              
              // Check right edge
              if (left + HOVER_WIDTH > window.innerWidth) {
                  left = rect.left - HOVER_WIDTH - GAP;
              }
              
              // Check bottom edge
              if (top + 200 > window.innerHeight) {
                  top = window.innerHeight - 200 - GAP;
              }
              
              // Check top edge
              if (top < 10) {
                  top = 10;
              }

              setHoverPosition({ top, left });
          }
      };

      if (isHovered && !isEditing) {
          updatePosition();
          window.addEventListener('scroll', updatePosition, true);
          window.addEventListener('resize', updatePosition);
      }

      return () => {
          window.removeEventListener('scroll', updatePosition, true);
          window.removeEventListener('resize', updatePosition);
      };
  }, [isHovered, isEditing]);

  useEffect(() => {
      if (isEditing && inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
      }
  }, [isEditing]);

  const handleCardClick = (e: React.MouseEvent) => {
      if (isEditing) return;
      
      // Meta key (Cmd) or Ctrl key for multi-selection
      if ((e.metaKey || e.ctrlKey) && onToggleSelection) {
          e.stopPropagation();
          onToggleSelection(task.id, true);
      } else if (onClick) {
          onClick(task);
      }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsEditing(true);
      setIsHovered(false); // Disable hover card while editing
  };

  const saveEdit = () => {
      if (editTitle.trim() !== title && onUpdate) {
          onUpdate({ ...task, title: editTitle });
      }
      setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          saveEdit();
      }
      if (e.key === 'Escape') {
          setEditTitle(title);
          setIsEditing(false);
      }
  };

  const HoverCard = () => {
      if (!hoverPosition || isEditing) return null;
      
      return createPortal(
          <div 
            className="fixed z-[9999] w-[320px] bg-[#1E2028] border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 pointer-events-none ring-1 ring-white/10"
            style={{ top: hoverPosition.top, left: hoverPosition.left }}
          >
              <div className="p-4 bg-[#252836]">
                  <h4 className="text-sm font-bold text-white mb-2 leading-snug">{title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-4">
                      {cleanDescription}
                  </p>
              </div>
              
              <div className="p-3 bg-[#1A1C23] border-t border-[#2D2F36] flex items-center justify-between">
                  {reporter ? (
                      <div className="flex items-center gap-3">
                          <img src={reporter.avatarUrl} className="w-8 h-8 rounded-full border border-gray-600" alt={reporter.name} />
                          <div className="flex flex-col">
                              <span className="text-xs font-bold text-white">{reporter.name}</span>
                              <p className="text-[10px] text-gray-500 line-clamp-1 max-w-[150px]">{title}</p>
                          </div>
                      </div>
                  ) : (
                      <span className="text-xs text-gray-500">No reporter</span>
                  )}
                  <span className="px-2 py-1 bg-[#2D2F36] rounded text-[10px] font-bold text-gray-400 border border-gray-700 uppercase tracking-wider">
                      Reporter
                  </span>
              </div>
          </div>,
          document.body
      );
  };

  // Determine if task is blocked
  const isBlocked = task.blockedBy && task.blockedBy.length > 0;
  const blockerTasks = isBlocked ? allTasks.filter(t => task.blockedBy?.includes(t.id)) : [];

  return (
    <>
        <div
            ref={cardRef}
            role="article"
            aria-label={`Task ${id}: ${title}`}
            aria-selected={isSelected}
            tabIndex={0}
            className={`relative bg-white dark:bg-[#15171E] rounded-xl transition-all cursor-pointer group flex flex-col overflow-hidden ${
                isSelected 
                ? 'ring-2 ring-blue-500/50 shadow-md transform scale-[1.02] z-10' 
                : 'border border-gray-100 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-lg dark:hover:shadow-blue-900/10'
            }`}
            onMouseEnter={() => !isEditing && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleCardClick}
            onDoubleClick={handleDoubleClick}
        >
        
        {/* Selection Checkmark Overlay */}
        {isSelected && (
            <div className="absolute top-2 right-2 z-20 text-blue-600 dark:text-blue-500 bg-white dark:bg-[#15171E] rounded-full shadow-sm">
                <CheckCircle2 size={18} fill="currentColor" className="text-white dark:text-[#15171E]" />
            </div>
        )}

        {/* Image Cover */}
        {imageUrl && (
            <div className="h-32 w-full bg-gray-50 dark:bg-[#121214] border-b border-gray-100 dark:border-white/5 overflow-hidden">
                <img src={imageUrl} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
        )}

        <div className="p-4 flex flex-col gap-3">
            
            {/* Header: ID, Priority */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider group-hover:text-blue-500 transition-colors">
                    {id}
                </span>

                {priority && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300">
                        <span>{priority}</span>
                    </div>
                )}
            </div>

            {/* Blocked Indicator */}
            {isBlocked && (
                <div className="flex items-center gap-1.5" title={`Blocked by: ${blockerTasks.map(t => t.id).join(', ')}`}>
                    <span className="text-[9px] font-medium bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-[4px] flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Blocked
                    </span>
                </div>
            )}

            {/* Jira-style Epic Label */}
            {parentEpic && (
                <div>
                    <span className="inline-block max-w-full truncate text-[9px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#2D2F36] px-2 py-0.5 rounded-[4px] leading-tight">
                        {parentEpic.title}
                    </span>
                </div>
            )}

            {/* Title - Inline Edit */}
            {isEditing ? (
                <textarea
                    ref={inputRef}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={handleKeyDown}
                    className="w-full text-[13px] font-semibold text-[#172B4D] dark:text-gray-100 bg-gray-50 dark:bg-[#0B0C0E] border border-blue-500 rounded p-2 focus:outline-none resize-none leading-snug min-h-[60px]"
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <h3 className="text-[#172B4D] dark:text-gray-100 font-semibold text-[13px] leading-relaxed line-clamp-3">
                    {title}
                </h3>
            )}

            {/* Tags */}
            {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[9px] font-bold bg-gray-50 dark:bg-[#1F2128] text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5">
                            {tag.label}
                        </span>
                    ))}
                </div>
            )}

            {/* Labels & Indicators Row */}
            {((labels && labels.length > 0) || technicalDebt || customerValue) && (
                <div className="flex flex-wrap items-center gap-1.5">
                    {/* Technical Debt Indicator */}
                    {technicalDebt && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300" title="Technical Debt">
                            <Wrench size={10} />
                            <span>Debt</span>
                        </span>
                    )}

                    {/* Customer Value Indicator */}
                    {customerValue && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300" title={`Customer Value: ${customerValue}`}>
                            <DollarSign size={10} />
                            <span>{customerValue[0]}</span>
                        </span>
                    )}

                    {/* Labels */}
                    {labels && labels.slice(0, 2).map((label, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-300">
                            {label}
                        </span>
                    ))}
                    {labels && labels.length > 2 && (
                        <span className="text-[9px] text-gray-400">+{labels.length - 2}</span>
                    )}
                </div>
            )}

            {/* Footer Metadata */}
            <div className="flex items-center justify-between mt-1 pt-3 border-t border-gray-50 dark:border-white/5">
                
                {/* Left: Work Type, Points, Due Date */}
                <div className="flex items-center gap-3 text-gray-400 dark:text-gray-500">
                    
                    {/* Type & Points */}
                    <div className="flex items-center gap-1.5" title={`${displayWorkType} - ${points || 0} pts`}>
                        {getWorkTypeIcon(displayWorkType)}
                        {points !== undefined && points > 0 && (
                            <span className="text-[10px] font-bold">{points}</span>
                        )}
                    </div>

                    {/* Due Date */}
                    {dueDate && (
                        <div className={`flex items-center gap-1 text-[10px] font-medium ${new Date(dueDate) < new Date() ? 'text-red-400 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`} title="Due Date">
                            <Clock size={12} strokeWidth={1.5} />
                            <span>{new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                    )}
                </div>

                {/* Right: Assignee with Name */}
                <div className="flex items-center gap-2 pl-2">
                    {assignee ? (
                        <div className="relative group/assignee">
                            <img 
                                src={assignee.avatarUrl} 
                                alt={assignee.name}
                                className="w-6 h-6 rounded-full object-cover border border-white dark:border-[#15171E] ring-1 ring-gray-100 dark:ring-white/10" 
                            />
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                            <span className="text-[8px] text-gray-400">?</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
        </div>
        {isHovered && <HoverCard />}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.columnId === nextProps.task.columnId &&
    prevProps.task.priority === nextProps.task.priority &&
    prevProps.task.dueDate === nextProps.task.dueDate &&
    prevProps.task.assignee?.id === nextProps.task.assignee?.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.task.technicalDebt === nextProps.task.technicalDebt &&
    prevProps.task.customerValue === nextProps.task.customerValue &&
    JSON.stringify(prevProps.task.tags) === JSON.stringify(nextProps.task.tags) &&
    JSON.stringify(prevProps.task.labels) === JSON.stringify(nextProps.task.labels) &&
    JSON.stringify(prevProps.task.blockedBy) === JSON.stringify(nextProps.task.blockedBy)
  );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard;
