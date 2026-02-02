
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  ChevronDown, 
  CheckSquare, 
  Bug, 
  Rocket, 
  Hexagon, 
  Bookmark, 
  ArrowUp, 
  ArrowDown, 
  Minus, 
  Layers, 
  Check, 
  Search, 
  Sparkles, 
  Loader2, 
  Wand2, 
  Image as ImageIcon, 
  Plus, 
  Calendar, 
  Clock, 
  Trash2, 
  ListTodo,
  Zap,
  LayoutGrid
} from 'lucide-react';
import { useProjectData } from '../context/ProjectDataContext';
import { COLUMNS } from '../constants';
import { Task } from '../types';
import { aiClient } from '../lib/ai';

// --- Reusable Custom Select Component ---
interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  avatar?: string;
  color?: string;
}

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  renderOption?: (option: SelectOption) => React.ReactNode;
  className?: string;
  variant?: 'default' | 'chip' | 'ghost';
}

const CustomSelect: React.FC<CustomSelectProps> = ({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder = 'Select...', 
  renderOption,
  className,
  variant = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const updatePosition = () => {
      if (isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + 6,
          left: rect.left,
          width: rect.width
        });
      }
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  let buttonStyles = "";
  if (variant === 'chip') {
      buttonStyles = "w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] hover:border-gray-300 dark:hover:border-[#4B4D59] rounded-md px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 gap-2 shadow-sm transition-all";
  } else if (variant === 'ghost') {
      buttonStyles = "bg-gray-50 dark:bg-[#15171E] hover:bg-gray-100 dark:hover:bg-[#1A1D26] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 gap-3 w-full transition-colors";
  } else {
      buttonStyles = "w-full bg-gray-50 dark:bg-[#1F2128] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-gray-200 focus:border-blue-500 hover:bg-gray-100 dark:hover:bg-[#2D2F36]/80";
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
          <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 block uppercase tracking-wider">
              {label}
          </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between focus:outline-none ${buttonStyles}`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption ? (
            renderOption ? renderOption(selectedOption) : (
              <>
                {selectedOption.icon && <span className={selectedOption.color}>{selectedOption.icon}</span>}
                {selectedOption.avatar && <img src={selectedOption.avatar} className="w-4 h-4 rounded-full" />}
                <span className="truncate">{selectedOption.label}</span>
              </>
            )
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          style={{ 
            top: coords.top, 
            left: coords.left, 
            width: Math.max(coords.width, 220),
            zIndex: 9999 
          }}
          className="fixed bg-white dark:bg-[#1E2028] border border-gray-200 dark:border-[#2D2F36] rounded-xl shadow-2xl max-h-64 overflow-hidden flex flex-col ring-1 ring-black/5"
        >
          {options.length > 5 && (
            <div className="p-2 border-b border-gray-100 dark:border-[#2D2F36]">
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-gray-50 dark:bg-[#15171E] border-none rounded-lg py-1.5 pl-9 pr-3 text-xs focus:ring-0 text-[#172B4D] dark:text-white placeholder-gray-500"
                  autoFocus
                />
              </div>
            </div>
          )}
          <div className="overflow-y-auto custom-scrollbar p-1.5">
            {filteredOptions.length > 0 ? filteredOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors mb-0.5 last:mb-0 ${selectedOption?.value === option.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-[#172B4D] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2D2F36]'}`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {option.icon && <span className={option.color}>{option.icon}</span>}
                  {option.avatar && <img src={option.avatar} className="w-5 h-5 rounded-full" />}
                  <span>{option.label}</span>
                </div>
                {selectedOption?.value === option.value && <Check size={14} />}
              </button>
            )) : (
              <div className="px-3 py-4 text-center text-xs text-gray-400">No options found</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// --- Main Modal Component ---

export interface CreateTaskData {
    title?: string;
    description?: string;
    priority?: string;
    points?: number;
    type?: string;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStatus?: string;
  initialType?: 'task' | 'epic';
  initialProjectId?: string;
  mode?: 'modal' | 'embedded'; // Embedded mode removes overlay and positions relatively
  initialData?: CreateTaskData; // For AI pre-filling
  onSuccess?: () => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ 
  isOpen, 
  onClose, 
  initialStatus = 'todo',
  initialType = 'task',
  initialProjectId,
  mode = 'modal',
  initialData,
  onSuccess
}) => {
  const { addTask, generateNextId, sprints, tasks, projects, organizationUsers: users, currentUser } = useProjectData();
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [type, setType] = useState<string>(initialType);
  const [priority, setPriority] = useState('MEDIUM');
  const [points, setPoints] = useState<number>(0);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [sprintId, setSprintId] = useState<string>('');
  const [parentEpicId, setParentEpicId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>(initialProjectId || (projects[0]?.id || ''));
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  // Subtasks State (For Epics)
  const [tempSubtasks, setTempSubtasks] = useState<{ title: string; id: string }[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  const [createAnother, setCreateAnother] = useState(false);

  // AI State
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Initialize defaults
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
          // If provided with AI data, use it
          setTitle(initialData.title || '');
          setDescription(initialData.description || '');
          setPriority(initialData.priority || 'MEDIUM');
          setPoints(initialData.points || 0);
          setType(initialData.type || initialType);
      } else {
          // Otherwise reset to standard defaults
          resetForm();
      }
    }
  }, [isOpen, initialData]);

  const resetForm = () => {
      setTitle('');
      setDescription('');
      setStatus(initialStatus);
      setType(initialType);
      setPriority('MEDIUM');
      setPoints(0);
      setAssigneeId(currentUser?.id || ''); 
      setSprintId('');
      setParentEpicId('');
      setProjectId(initialProjectId || projects[0]?.id || '');
      setStartDate('');
      setDueDate('');
      setTempSubtasks([]);
      setNewSubtaskInput('');
      setShowAiPanel(false);
      setAiPrompt('');
  };

  const handleAddSubtask = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && newSubtaskInput.trim()) {
          e.preventDefault();
          setTempSubtasks(prev => [...prev, { title: newSubtaskInput, id: `temp-${Date.now()}` }]);
          setNewSubtaskInput('');
      }
  };

  const removeSubtask = (id: string) => {
      setTempSubtasks(prev => prev.filter(t => t.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Use users list from context
    const assignee = users.find(u => u.id === assigneeId) || (currentUser || users[0]);
    const reporter = currentUser || users[0];

    const newTaskId = generateNextId(projectId, type);

    const newTask: Task = {
      id: newTaskId,
      projectId,
      title,
      description,
      columnId: status,
      type: type as any,
      priority: priority as any,
      points,
      assignee,
      reporter,
      sprintId: sprintId || undefined,
      parentEpicId: parentEpicId || undefined,
      tags: [],
      commentsCount: 0,
      startDate: startDate || new Date().toISOString(),
      dueDate: dueDate || undefined 
    };

    addTask(newTask);

    // If it's an Epic and has subtasks, create them
    if (type === 'epic' && tempSubtasks.length > 0) {
        // Parse ID to simulate sequential IDs for child tasks
        const parts = newTaskId.split('-');
        const baseNum = parseInt(parts[parts.length-1]);

        tempSubtasks.forEach((sub, idx) => {
            const childId = `${parts[0]}-TSK-${(baseNum + idx + 1).toString().padStart(4, '0')}`;
            
            const childTask: Task = {
                id: childId,
                projectId,
                title: sub.title,
                columnId: 'todo',
                type: 'task',
                priority: 'MEDIUM',
                points: 0,
                assignee,
                reporter,
                parentEpicId: newTaskId,
                tags: [],
                commentsCount: 0
            };
            addTask(childTask);
        });
    }
    
    if (onSuccess) onSuccess();

    if (createAnother) {
        // Reset fields but keep context
        setTitle('');
        setDescription('');
        setPoints(0);
        setTempSubtasks([]);
    } else {
        onClose();
    }
  };

  const cleanJson = (text: string) => {
      if (!text) return '{}';
      let cleaned = text.replace(/```(?:json)?\n?([\s\S]*?)\n?```/gi, '$1').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
          cleaned = cleaned.substring(start, end + 1);
      }
      return cleaned;
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    try {
      const prompt = `
        You are an expert Project Manager.
        Generate a detailed task based on this request: "${aiPrompt}"
        Task Type: ${type}
        
        Provide an **EXTREMELY DETAILED** HTML description including:
        1. **User Story**
        2. **Acceptance Criteria** (Checklist)
        3. **Technical Notes** (API, DB, Logic)
        4. **UI/UX Flow** (Text/HTML representation)
        
        Return STRICTLY Valid JSON with these keys:
        - "title" (string): Clear, actionable title.
        - "description" (string): The rich HTML description.
        - "priority" (string): "HIGH", "MEDIUM", or "LOW".
        - "points" (number): 1, 2, 3, 5, 8, or 13.
        ${type === 'epic' ? '- "subtasks" (array of strings): List of 3-5 child task titles.' : ''}
      `;

      const response = await aiClient.models.generateContent({
        model: 'openai/gpt-oss-120b',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json"
        }
      });

      if (response.text) {
        const jsonStr = cleanJson(response.text);
        const data = JSON.parse(jsonStr);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setPriority(data.priority || 'MEDIUM');
        setPoints(data.points || 0);
        if (data.subtasks && Array.isArray(data.subtasks) && type === 'epic') {
            setTempSubtasks(data.subtasks.map((t: string, i: number) => ({ title: t, id: `ai-${i}` })));
        }
      }
      setShowAiPanel(false);
    } catch (error) {
      console.error("AI Generation failed:", error);
    } finally {
      setIsAiGenerating(false);
    }
  };

  if (!isOpen) return null;

  // Options Data
  const typeOptions: SelectOption[] = [
    { value: 'task', label: 'Task', icon: <CheckSquare size={14} />, color: 'text-blue-500' },
    { value: 'bug', label: 'Bug', icon: <Bug size={14} />, color: 'text-red-500' },
    { value: 'story', label: 'Story', icon: <Bookmark size={14} />, color: 'text-green-500' },
    { value: 'feature', label: 'Feature', icon: <Rocket size={14} />, color: 'text-pink-500' },
    { value: 'epic', label: 'Epic', icon: <Hexagon size={14} />, color: 'text-purple-600' },
  ];

  const priorityOptions: SelectOption[] = [
    { value: 'HIGH', label: 'High', icon: <ArrowUp size={14} />, color: 'text-red-500' },
    { value: 'MEDIUM', label: 'Medium', icon: <Minus size={14} />, color: 'text-amber-500' },
    { value: 'LOW', label: 'Low', icon: <ArrowDown size={14} />, color: 'text-blue-500' },
  ];

  const statusOptions = COLUMNS.map(col => ({ value: col.id, label: col.title, icon: <div className={`w-2 h-2 rounded-full ${col.id === 'done' ? 'bg-green-500' : 'bg-gray-400'}`} /> }));
  
  const assigneeOptions = users.map(u => ({ 
    value: u.id, 
    label: u.name, 
    avatar: u.avatarUrl 
  }));

  const projectOptions = projects.map(p => ({ value: p.id, label: p.name, color: 'text-blue-500', icon: <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${p.color}`} /> }));

  const epicOptions = [
    { value: '', label: 'No Parent Epic' },
    ...tasks.filter(t => t.projectId === projectId && t.type === 'epic').map(t => ({ value: t.id, label: t.title, icon: <Hexagon size={14} /> }))
  ];

  const sprintOptions = [
    { value: '', label: 'Backlog' },
    ...sprints.filter(s => s.projectId === projectId).map(s => ({ value: s.id, label: s.name }))
  ];

  const activeProject = projects.find(p => p.id === projectId);

  // Wrapper Styles based on Mode
  const wrapperClass = mode === 'modal' 
    ? "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    : "w-full h-full flex flex-col animate-in fade-in duration-300";
  
  const containerClass = mode === 'modal'
    ? "bg-white dark:bg-[#1E2028] w-full max-w-3xl rounded-xl shadow-2xl border border-gray-200 dark:border-[#2C2E3A] overflow-hidden flex flex-col max-h-[90vh]"
    : "flex-1 bg-white dark:bg-[#1E2028] rounded-xl border border-gray-200 dark:border-[#2C2E3A] overflow-hidden flex flex-col h-full";

  return (
    <div className={wrapperClass}>
      <div className={containerClass}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#2C2E3A] bg-white dark:bg-[#1E2028] flex-shrink-0">
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-lg bg-gradient-to-br ${activeProject?.color || 'from-blue-500 to-blue-600'} text-white`}>
               <Rocket size={16} fill="currentColor" className="opacity-90" />
             </div>
             <div>
                 <h2 className="font-bold text-[#172B4D] dark:text-white text-sm">Create {type === 'epic' ? 'Epic' : 'Issue'}</h2>
                 <p className="text-xs text-gray-500 dark:text-gray-400">{activeProject?.key || 'PRJ'}-{generateNextId(projectId, type).split('-')[2]}</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
                onClick={() => setShowAiPanel(!showAiPanel)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${showAiPanel ? 'bg-purple-600 text-white border-purple-600' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800'}`}
             >
                <Sparkles size={14} fill={showAiPanel ? "currentColor" : "none"} />
                AI Generate
             </button>
             {mode === 'modal' && (
               <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 hover:bg-gray-100 dark:hover:bg-[#2C2E3A] rounded-full transition-colors">
                 <X size={20} />
               </button>
             )}
          </div>
        </div>

        {/* AI Panel */}
        {showAiPanel && (
            <div className="px-6 py-4 bg-purple-50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/20 animate-in slide-in-from-top-2 flex-shrink-0">
                <div className="flex gap-3">
                    <div className="mt-1 text-purple-600 dark:text-purple-400"><Wand2 size={16} /></div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider mb-2">Describe the task</label>
                        <textarea 
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            className="w-full bg-white dark:bg-[#15171E] border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-sm text-[#172B4D] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none h-16 mb-2"
                            placeholder="e.g. Create a task to refactor the login component..."
                            autoFocus
                        />
                        <div className="flex justify-end">
                            <button 
                                onClick={handleAiGenerate}
                                disabled={!aiPrompt.trim() || isAiGenerating}
                                className="px-4 py-1.5 bg-purple-600 text-white rounded-md text-xs font-bold shadow-sm hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isAiGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                Generate Draft
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <form id="create-task-form" onSubmit={handleSubmit} className="space-y-8">
                
                {/* 1. Header Input Group (Title & Desc) */}
                <div className="space-y-4">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-pink-500"><Rocket size={16} /></span>
                            <span className="text-sm font-semibold text-gray-400 dark:text-gray-400">What needs to be done?</span>
                        </div>
                        <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Update navigation menu for mobile"
                            className="w-full bg-transparent border-none p-0 text-xl font-medium text-[#172B4D] dark:text-white focus:ring-0 placeholder-gray-400 dark:placeholder-gray-600"
                            autoFocus={!showAiPanel}
                        />
                    </div>
                    
                    <textarea 
                        rows={5}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add a description..."
                        className="w-full bg-gray-50 dark:bg-[#15171E] border border-gray-100 dark:border-[#2D2F36] rounded-lg p-4 text-sm text-[#172B4D] dark:text-gray-300 focus:border-blue-500 focus:ring-0 placeholder-gray-500 dark:placeholder-gray-600 resize-none transition-colors min-h-[120px]"
                    />
                    
                    <button type="button" className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 hover:text-[#172B4D] dark:hover:text-white transition-colors">
                        <ImageIcon size={14} /> Attach
                    </button>
                </div>

                <div className="h-px bg-gray-200 dark:bg-[#2C2E3A] w-full"></div>

                {/* 2. Properties Row (Pills) - Added Label */}
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Properties</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <CustomSelect 
                            value={projectId} 
                            onChange={setProjectId} 
                            options={projectOptions} 
                            variant="chip"
                        />
                        <CustomSelect 
                            value={type} 
                            onChange={setType} 
                            options={typeOptions} 
                            variant="chip"
                        />
                        <CustomSelect 
                            value={priority} 
                            onChange={setPriority} 
                            options={priorityOptions} 
                            variant="chip"
                        />
                        <CustomSelect 
                            value={status} 
                            onChange={setStatus} 
                            options={statusOptions} 
                            variant="chip"
                        />
                    </div>
                </div>

                <div className="h-px bg-gray-200 dark:bg-[#2C2E3A] w-full"></div>

                {/* 3. Details Grid - Added Label for Section Clarity */}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                        {/* Left Column */}
                        <div className="space-y-6">
                            <CustomSelect 
                                label="ASSIGNEE" 
                                value={assigneeId} 
                                onChange={setAssigneeId} 
                                options={assigneeOptions} 
                                variant="ghost"
                                placeholder="Automatic"
                                renderOption={(opt) => (
                                    <div className="flex items-center gap-2">
                                        <img src={opt.avatar} className="w-5 h-5 rounded-full" />
                                        <span className="font-medium">{opt.label}</span>
                                    </div>
                                )}
                            />
                            
                            <CustomSelect 
                                label="SPRINT" 
                                value={sprintId} 
                                onChange={setSprintId} 
                                options={sprintOptions} 
                                variant="ghost"
                                placeholder="Backlog"
                                renderOption={(opt) => (
                                    <div className="flex items-center gap-2">
                                        <Zap size={14} className="text-yellow-500" />
                                        <span>{opt.label}</span>
                                    </div>
                                )}
                            />

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <Layers size={14} /> Points
                                </label>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {[0, 1, 2, 3, 5, 8, 13].map((pt) => (
                                        <button
                                            key={pt}
                                            type="button"
                                            onClick={() => setPoints(pt)}
                                            className={`w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                                                points === pt 
                                                ? 'bg-blue-600 text-white shadow-md scale-105' 
                                                : 'bg-gray-50 dark:bg-[#15171E] text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1A1D26] border border-gray-200 dark:border-[#2D2F36]'
                                            }`}
                                        >
                                            {pt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <Clock size={14} /> Start Date
                                </label>
                                <input 
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-[#15171E] hover:bg-gray-100 dark:hover:bg-[#1A1D26] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-2.5 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={14} /> Due Date
                                </label>
                                <input 
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-[#15171E] hover:bg-gray-100 dark:hover:bg-[#1A1D26] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-2.5 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                            </div>

                            {type !== 'epic' && (
                                <CustomSelect 
                                    label="PARENT EPIC" 
                                    value={parentEpicId} 
                                    onChange={setParentEpicId} 
                                    options={epicOptions} 
                                    variant="ghost"
                                    placeholder="No Epic Link"
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. Subtasks (For Epics) */}
                {type === 'epic' && (
                    <>
                        <div className="h-px bg-gray-200 dark:bg-[#2C2E3A] w-full"></div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-2 uppercase tracking-wider">
                                    <ListTodo size={14} /> Child Issues
                                </label>
                                <span className="text-xs font-medium text-gray-400">{tempSubtasks.length} items</span>
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg overflow-hidden">
                                {tempSubtasks.length > 0 && (
                                    <div className="divide-y divide-gray-200 dark:divide-[#2D2F36]">
                                        {tempSubtasks.map((sub, idx) => (
                                            <div key={sub.id} className="flex items-center justify-between px-4 py-3 text-sm group hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-gray-400 text-xs font-mono">{idx + 1}.</span>
                                                    <span className="text-[#172B4D] dark:text-white font-medium">{sub.title}</span>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeSubtask(sub.id)} 
                                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#1E2028] border-t border-gray-200 dark:border-[#2D2F36]">
                                    <Plus size={16} className="text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={newSubtaskInput}
                                        onChange={(e) => setNewSubtaskInput(e.target.value)}
                                        onKeyDown={handleAddSubtask}
                                        placeholder="Add a child task (Press Enter)"
                                        className="flex-1 bg-transparent border-none text-sm text-[#172B4D] dark:text-white focus:ring-0 placeholder-gray-500"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            if (newSubtaskInput.trim()) {
                                                setTempSubtasks(prev => [...prev, { title: newSubtaskInput, id: `temp-${Date.now()}` }]);
                                                setNewSubtaskInput('');
                                            }
                                        }}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

            </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-[#2C2E3A] bg-white dark:bg-[#1E2028] flex items-center justify-between flex-shrink-0">
            <div 
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setCreateAnother(!createAnother)}
            >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${createAnother ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-400 text-transparent group-hover:border-gray-300'}`}>
                    <Check size={10} strokeWidth={4} />
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-300 select-none">Create another</span>
            </div>
            
            <div className="flex gap-3">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                    {mode === 'embedded' ? 'Discard' : 'Cancel'}
                </button>
                <button 
                    form="create-task-form"
                    type="submit"
                    disabled={!title.trim()}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <Plus size={16} strokeWidth={3} />
                    Create {type === 'epic' ? 'Epic' : 'Task'}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default CreateTaskModal;
