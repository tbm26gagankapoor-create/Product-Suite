
import React from 'react';
import {
  X,
  CheckSquare,
  Flag,
  Plus,
  ChevronDown,
  Clock,
  Tag,
  Minus,
  Inbox,
  IterationCw,
  Calendar,
  Check,
  Circle,
  SignalMedium,
  CheckCircle2,
} from 'lucide-react';
import { Task } from '../../types';
import * as LucideIcons from 'lucide-react';
import SidebarSection from './SidebarSection';

// Helper to get icon class from config
const getIconComponentByName = (iconName: string): any => {
  return (LucideIcons as any)[iconName] || LucideIcons.Circle;
};

interface PropertySidebarProps {
  currentTask: Task;
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canChangeStatus: boolean;
    canDelete: boolean;
    isReporter: boolean;
    isAssignee: boolean;
  };
  sprints: any[];
  users: any[];
  showSprintDropdown: boolean;
  setShowSprintDropdown: (show: boolean) => void;
  isAddingTag: boolean;
  setIsAddingTag: (value: boolean) => void;
  newTagInput: string;
  setNewTagInput: (value: string) => void;
  onUpdateCurrentTask: (updates: Partial<Task>) => void;
  onAddTag: () => void;
  onRemoveTag: (tagLabel: string) => void;
  dependenciesSection?: React.ReactNode;
}

const PropertySidebar: React.FC<PropertySidebarProps> = ({
  currentTask,
  permissions,
  sprints,
  showSprintDropdown,
  setShowSprintDropdown,
  isAddingTag,
  setIsAddingTag,
  newTagInput,
  setNewTagInput,
  onUpdateCurrentTask,
  onAddTag,
  onRemoveTag,
  dependenciesSection,
}) => {
  return (
    <>
      {/* Context Section */}
      <SidebarSection title="Context">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Reporter</span>
            <div className="flex items-center gap-2">
              {currentTask.reporter?.avatarUrl ? (
                <img src={currentTask.reporter.avatarUrl} className="w-5 h-5 rounded-full grayscale opacity-70" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600" />
              )}
              <span className="text-xs text-gray-500">{currentTask.reporter?.name?.split(' ')[0] || 'Unknown'}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-gray-500">Sprint</span>
            <div className="relative">
              <button
                onClick={() => permissions.canEdit && setShowSprintDropdown(!showSprintDropdown)}
                disabled={!permissions.canEdit}
                className={`w-full flex items-center gap-2 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-2 text-left transition-colors shadow-sm ${permissions.canEdit ? 'hover:border-blue-400 dark:hover:border-blue-500' : 'cursor-default opacity-75'}`}
              >
                {(() => {
                  const currentSprint = sprints.find((s: any) => s.id === currentTask.sprintId);
                  if (!currentSprint) {
                    return (
                      <>
                        <div className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <Inbox size={12} className="text-gray-400" />
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-1 truncate">Backlog</span>
                      </>
                    );
                  }
                  const statusConfig: Record<string, { color: string; bg: string }> = {
                    'active': { color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
                    'planned': { color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
                    'completed': { color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' },
                  };
                  const config = statusConfig[currentSprint.status] || statusConfig['planned'];
                  return (
                    <>
                      <div className={`w-6 h-6 rounded-md ${config.bg} flex items-center justify-center`}>
                        <IterationCw size={12} className={config.color} />
                      </div>
                      <span className="text-xs font-medium text-[#172B4D] dark:text-white flex-1 truncate">{currentSprint.name}</span>
                    </>
                  );
                })()}
                <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />
              </button>

              {showSprintDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSprintDropdown(false)} />
                  <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-[#1F2128] rounded-xl shadow-xl border border-gray-200 dark:border-[#2D2F36] py-2 z-20 overflow-hidden max-h-80 overflow-y-auto">

                    {/* Backlog Option */}
                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Backlog</div>
                    <button
                      onClick={() => {
                        onUpdateCurrentTask({ sprintId: undefined });
                        setShowSprintDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                        !currentTask.sprintId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Inbox size={16} className="text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-300">Backlog</div>
                        <div className="text-[10px] text-gray-400">Not assigned to any sprint</div>
                      </div>
                      {!currentTask.sprintId && <Check size={16} className="text-blue-500 flex-shrink-0" />}
                    </button>

                    {/* Active Sprints */}
                    {sprints.filter((s: any) => s.status === 'active').length > 0 && (
                      <>
                        <div className="my-2 border-t border-gray-100 dark:border-[#2D2F36]" />
                        <div className="px-3 py-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active Sprints
                        </div>
                        {sprints.filter((s: any) => s.status === 'active').map((sprint: any) => {
                          const isSelected = currentTask.sprintId === sprint.id;
                          return (
                            <button
                              key={sprint.id}
                              onClick={() => {
                                onUpdateCurrentTask({ sprintId: sprint.id });
                                setShowSprintDropdown(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                                isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                            >
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <IterationCw size={16} className="text-emerald-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-[#172B4D] dark:text-gray-200 truncate">{sprint.name}</div>
                                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <Calendar size={9} />
                                  {new Date(sprint.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(sprint.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                              </div>
                              {isSelected && <Check size={16} className="text-blue-500 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </>
                    )}

                    {/* Planned Sprints */}
                    {sprints.filter((s: any) => s.status === 'planned').length > 0 && (
                      <>
                        <div className="my-2 border-t border-gray-100 dark:border-[#2D2F36]" />
                        <div className="px-3 py-1.5 text-[10px] font-bold text-blue-500 uppercase tracking-wider">Planned Sprints</div>
                        {sprints.filter((s: any) => s.status === 'planned').map((sprint: any) => {
                          const isSelected = currentTask.sprintId === sprint.id;
                          return (
                            <button
                              key={sprint.id}
                              onClick={() => {
                                onUpdateCurrentTask({ sprintId: sprint.id });
                                setShowSprintDropdown(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                                isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                            >
                              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <IterationCw size={16} className="text-blue-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-[#172B4D] dark:text-gray-200 truncate">{sprint.name}</div>
                                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <Calendar size={9} />
                                  {new Date(sprint.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(sprint.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                              </div>
                              {isSelected && <Check size={16} className="text-blue-500 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </>
                    )}

                    {/* Completed Sprints */}
                    {sprints.filter((s: any) => s.status === 'completed').length > 0 && (
                      <>
                        <div className="my-2 border-t border-gray-100 dark:border-[#2D2F36]" />
                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed</div>
                        {sprints.filter((s: any) => s.status === 'completed').map((sprint: any) => {
                          const isSelected = currentTask.sprintId === sprint.id;
                          return (
                            <button
                              key={sprint.id}
                              onClick={() => {
                                onUpdateCurrentTask({ sprintId: sprint.id });
                                setShowSprintDropdown(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                                isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                            >
                              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <CheckCircle2 size={16} className="text-gray-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{sprint.name}</div>
                                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <Calendar size={9} />
                                  {new Date(sprint.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(sprint.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                              </div>
                              {isSelected && <Check size={16} className="text-blue-500 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </SidebarSection>

      <div className="h-px bg-gray-200 dark:bg-[#2D2F36]"></div>

      {/* Dates Section */}
      <SidebarSection title="Dates">
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12} /> Start Date</label>
            <input
              type="date"
              value={currentTask.startDate ? new Date(currentTask.startDate).toISOString().split('T')[0] : ''}
              onChange={(e) => permissions.canEdit && onUpdateCurrentTask({ startDate: e.target.value })}
              readOnly={!permissions.canEdit}
              className={`w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] dark:text-white outline-none focus:border-blue-500 ${!permissions.canEdit ? 'cursor-default opacity-75' : ''}`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 flex items-center gap-1"><Flag size={12} /> Due Date</label>
            <input
              type="date"
              value={currentTask.dueDate ? new Date(currentTask.dueDate).toISOString().split('T')[0] : ''}
              onChange={(e) => permissions.canEdit && onUpdateCurrentTask({ dueDate: e.target.value })}
              readOnly={!permissions.canEdit}
              className={`w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-1.5 text-xs text-[#172B4D] dark:text-white outline-none focus:border-blue-500 ${!permissions.canEdit ? 'cursor-default opacity-75' : ''}`}
            />
          </div>
        </div>
      </SidebarSection>

      <div className="h-px bg-gray-200 dark:bg-[#2D2F36]"></div>

      {/* Dependencies Section (injected) */}
      {dependenciesSection}

      <div className="h-px bg-gray-200 dark:bg-[#2D2F36]"></div>

      {/* Metadata Section */}
      <SidebarSection title="Metadata">
        <div className="flex flex-wrap gap-2">
          {currentTask.tags?.map((tag: any) => (
            <span
              key={tag.label}
              className="group inline-flex items-center gap-1 text-[10px] font-medium bg-gray-100 dark:bg-[#1F2128] border border-gray-200 dark:border-[#2D2F36] px-2 py-1 rounded text-gray-600 dark:text-gray-300"
            >
              <Tag size={10} />
              {tag.label}
              <button
                onClick={() => onRemoveTag(tag.label)}
                className="ml-0.5 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          {isAddingTag ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAddTag();
                  }
                  if (e.key === 'Escape') {
                    setIsAddingTag(false);
                    setNewTagInput('');
                  }
                }}
                placeholder="Tag name..."
                className="px-2 py-1 text-[10px] bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded focus:outline-none focus:border-blue-500 w-20"
                autoFocus
              />
              <button onClick={onAddTag} className="text-blue-600 dark:text-blue-400 hover:text-blue-700">
                <CheckSquare size={12} />
              </button>
              <button onClick={() => { setIsAddingTag(false); setNewTagInput(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingTag(true)}
              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 px-1"
            >
              <Plus size={10} /> Add Tag
            </button>
          )}
        </div>
      </SidebarSection>

      {/* Created timestamp */}
      <div className="mt-auto pt-6 text-[10px] text-gray-400 flex flex-col gap-1 border-t border-gray-100 dark:border-[#2D2F36]">
        <span>Created {new Date(currentTask.createdAt || Date.now()).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}</span>
      </div>
    </>
  );
};

export default PropertySidebar;
