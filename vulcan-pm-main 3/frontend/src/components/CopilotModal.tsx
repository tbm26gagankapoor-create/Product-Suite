
import React, { useState, useEffect, useRef } from 'react';
import {
  X, Send, Sparkles, Wand2, Loader2, Maximize2, Zap, ArrowRight,
  CheckCircle2, AlertCircle, Layout, MessageSquare, Briefcase, ListTodo,
  Calendar, Users, Target, TrendingUp, FileText, Plus, ChevronRight,
  BarChart3, Clock, Flag, Bug, Lightbulb, RefreshCw
} from 'lucide-react';
import { useProjectData } from '../context/ProjectDataContext';
import { aiClient } from '../lib/ai';
import { copilotContext, copilotToolsDef, buildCopilotPrompt } from '../lib/prompts';
import { Task, Sprint, Project } from '../types';
import CreateTaskModal, { CreateTaskData } from './CreateTaskModal';

interface CopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  mode?: 'modal' | 'floating';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'tool_call';
  toolData?: any;
}

interface CanvasContent {
  type: 'task_form' | 'sprint_draft' | 'list_view' | 'summary' | 'epic_view' | 'none';
  data: any;
  title?: string;
}

// --- Markdown Rendering Helpers ---
const MarkdownRenderer: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
    const lines = content.split('\n');
    const nodes: React.ReactNode[] = [];
    let tableBuffer: string[] = [];

    const processInline = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className={`font-bold ${isUser ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={i} className={`${isUser ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400'} px-1 py-0.5 rounded font-mono text-xs`}>{part.slice(1, -1)}</code>;
            }
            return part;
        });
    };

    const flushTable = (keyPrefix: string) => {
        if (tableBuffer.length === 0) return;

        const normalize = (row: string) => row.split('|').map(c => c.trim()).filter((c, i, arr) => {
            return c.length > 0 || (i > 0 && i < arr.length - 1);
        }).filter(c => c !== '');

        const headers = normalize(tableBuffer[0]);
        const bodyRows = tableBuffer.slice(2).map(normalize);

        nodes.push(
            <div key={keyPrefix} className={`my-3 overflow-hidden rounded-lg border ${isUser ? 'border-white/30' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className={`${isUser ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-800'}`}>
                            <tr>
                                {headers.map((h, i) => (
                                    <th key={i} className={`px-3 py-2 font-bold uppercase tracking-wider whitespace-nowrap ${isUser ? 'text-white border-white/20' : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'} border-b`}>
                                        {processInline(h)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isUser ? 'divide-white/10' : 'divide-gray-100 dark:divide-gray-800'}`}>
                            {bodyRows.map((row, rIdx) => (
                                <tr key={rIdx} className={`${isUser ? 'hover:bg-white/5' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                                    {row.map((cell, cIdx) => (
                                        <td key={cIdx} className={`px-3 py-2 whitespace-nowrap ${isUser ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {processInline(cell)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
        tableBuffer = [];
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('|')) {
            tableBuffer.push(line);
            continue;
        } else {
            flushTable(`tbl-${i}`);
        }

        if (line.startsWith('### ')) {
             nodes.push(<h3 key={i} className={`font-bold text-sm mt-3 mb-1 ${isUser ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{processInline(line.slice(4))}</h3>);
             continue;
        }
        if (line.startsWith('## ')) {
             nodes.push(<h2 key={i} className={`font-bold text-base mt-4 mb-2 ${isUser ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{processInline(line.slice(3))}</h2>);
             continue;
        }

        if (line.startsWith('- ') || line.startsWith('* ')) {
            nodes.push(
                <div key={i} className="flex items-start gap-2 mb-1 ml-1">
                    <div className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${isUser ? 'bg-white' : 'bg-gray-400'}`}></div>
                    <span className={isUser ? 'text-white' : 'text-gray-700 dark:text-gray-300'}>{processInline(line.slice(2))}</span>
                </div>
            );
            continue;
        }

        if (/^\d+\.\s/.test(line)) {
             nodes.push(
                <div key={i} className="flex items-start gap-2 mb-1 ml-1">
                    <span className={`font-bold text-xs mt-0.5 ${isUser ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{line.split(' ')[0]}</span>
                    <span className={isUser ? 'text-white' : 'text-gray-700 dark:text-gray-300'}>{processInline(line.replace(/^\d+\.\s/, ''))}</span>
                </div>
            );
            continue;
        }

        if (!line) {
            nodes.push(<div key={i} className="h-2" />);
            continue;
        }

        nodes.push(<p key={i} className={`leading-relaxed mb-1 ${isUser ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{processInline(line)}</p>);
    }

    flushTable(`tbl-end`);

    return <div className="text-sm">{nodes}</div>;
};

// Quick action chips
const QuickActions = ({ onAction }: { onAction: (query: string) => void }) => (
  <div className="flex flex-wrap gap-2 mb-4">
    {[
      { icon: Plus, label: 'Create Task', query: 'Create a new task' },
      { icon: Bug, label: 'Report Bug', query: 'Draft a bug report for' },
      { icon: BarChart3, label: 'Summarize', query: 'Summarize project status' },
      { icon: AlertCircle, label: 'Blockers', query: 'Show all blockers' },
    ].map((action, i) => (
      <button
        key={i}
        onClick={() => onAction(action.query)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-[#1F2128] rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
      >
        <action.icon size={12} />
        {action.label}
      </button>
    ))}
  </div>
);

export const CopilotModal: React.FC<CopilotModalProps> = ({ isOpen, onClose, initialQuery, mode = 'modal' }) => {
  const {
    currentUser, tasks, projects, sprints, users,
    addTask, updateTask, addSprint, generateNextId
  } = useProjectData();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [canvasContent, setCanvasContent] = useState<CanvasContent>({ type: 'none', data: null });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Clean JSON helper
  const cleanJson = (text: string) => {
    if (!text) return '{}';
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    cleaned = cleaned.replace(/```(?:json)?\n?([\s\S]*?)\n?```/gi, '$1');
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let start = -1;
    if (firstBrace !== -1 && firstBracket !== -1) start = Math.min(firstBrace, firstBracket);
    else if (firstBrace !== -1) start = firstBrace;
    else if (firstBracket !== -1) start = firstBracket;
    if (start !== -1) {
      cleaned = cleaned.substring(start);
      const lastBrace = cleaned.lastIndexOf('}');
      const lastBracket = cleaned.lastIndexOf(']');
      const end = Math.max(lastBrace, lastBracket);
      if (end !== -1) cleaned = cleaned.substring(0, end + 1);
    }
    return cleaned.trim();
  };

  useEffect(() => {
    if (isOpen) {
      if (initialQuery) {
        setMessages([{ id: 'init-user', role: 'user', content: initialQuery }]);
        processQuery(initialQuery);
      } else {
        setMessages([{
          id: 'init-ai',
          role: 'assistant',
          content: `Hi ${currentUser?.name.split(' ')[0] || 'there'}! I'm your AI assistant. I can help you:\n\n- **Create tasks** and bugs\n- **Summarize** project status\n- **Find blockers** and issues\n- **Plan sprints** and epics\n\nWhat would you like to do?`
        }]);
      }
    } else {
      setMessages([]);
      setCanvasContent({ type: 'none', data: null });
      setInputValue('');
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const processQuery = async (query: string) => {
    setIsProcessing(true);

    const projectsList = projects.map(p =>
      `- ${p.name} (Key: ${p.key}, Status: ${p.status})`
    ).join('\n');

    const activeSprintsList = sprints
      .filter(s => s.status === 'active')
      .map(s => `- Sprint: ${s.name} (Goal: ${s.goal || 'None'})`)
      .join('\n') || 'No active sprints';

    const taskSnapshot = tasks.slice(0, 30).map(t => {
      const projName = projects.find(p => p.id === t.projectId)?.name || 'Unknown';
      return `- [${t.id}] ${t.title} (Status: ${t.columnId}, Priority: ${t.priority}, Project: ${projName})`;
    }).join('\n');

    const blockedTasks = tasks.filter(t => t.columnId === 'blocked');
    const highPriorityTasks = tasks.filter(t => t.priority === 'HIGH' || t.priority === 'CRITICAL');

    const contextStr = copilotContext({
      currentUserName: currentUser?.name || 'Unknown',
      projectCount: projects.length,
      projectsList,
      activeSprintsList,
      taskCount: tasks.length,
      blockedCount: blockedTasks.length,
      highPriorityCount: highPriorityTasks.length,
      taskSnapshot,
    });

    const historyLines = messages.slice(-6).map(m =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n');

    const toolsDef = copilotToolsDef();

    try {
      const td = buildCopilotPrompt(contextStr, toolsDef, historyLines, query);

      const response = await aiClient.models.generateContent({
        promptTemplate: td.templateName,
        promptVariables: td.variables,
      });

      let responseText = response.text || "I didn't quite get that.";

      // Clean thinking tags
      responseText = responseText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const cleanedJson = cleanJson(jsonMatch[0]);
          const action = JSON.parse(cleanedJson);

          if (action.tool === 'create_task') {
             const draftData: CreateTaskData = {
                 title: action.args?.title || 'New Task',
                 type: action.args?.type || 'task',
                 priority: action.args?.priority || 'MEDIUM',
                 points: action.args?.points || 0,
                 description: action.args?.description || '',
             };

             setMessages(prev => [...prev, {
               id: `ai-${Date.now()}`,
               role: 'assistant',
               content: `I've drafted a **${draftData.type}**: "${draftData.title}"\n\nYou can review and customize it in the canvas on the right. Click **Create** when ready.`
             }]);
             setCanvasContent({ type: 'task_form', data: draftData, title: 'Create Task' });

          } else if (action.tool === 'show_blockers') {
             const blockers = tasks.filter(t => t.columnId === 'blocked');
             setMessages(prev => [...prev, {
               id: `ai-${Date.now()}`,
               role: 'assistant',
               content: blockers.length > 0
                 ? `Found **${blockers.length} blocked tasks**. I've displayed them in the canvas for review.`
                 : `Great news! There are **no blocked tasks** at the moment.`
             }]);
             if (blockers.length > 0) {
               setCanvasContent({ type: 'list_view', data: blockers, title: 'Blocked Tasks' });
             }

          } else if (action.tool === 'summarize_status') {
             const summary = action.args?.summary || 'Project status summary';
             const stats = action.args?.stats || {
               total: tasks.length,
               done: tasks.filter(t => t.columnId === 'done').length,
               inProgress: tasks.filter(t => t.columnId === 'in-progress').length,
               blocked: tasks.filter(t => t.columnId === 'blocked').length
             };

             setMessages(prev => [...prev, {
               id: `ai-${Date.now()}`,
               role: 'assistant',
               content: `I've prepared a **project summary** for you. Check the canvas for detailed insights.`
             }]);
             setCanvasContent({
               type: 'summary',
               data: { summary, stats, tasks: tasks.slice(0, 20) },
               title: 'Project Summary'
             });

          } else if (action.tool === 'create_epic') {
             setMessages(prev => [...prev, {
               id: `ai-${Date.now()}`,
               role: 'assistant',
               content: `I've drafted an epic: **${action.args?.title}** with ${action.args?.tasks?.length || 0} tasks. Review it in the canvas.`
             }]);
             setCanvasContent({
               type: 'epic_view',
               data: action.args,
               title: 'Create Epic'
             });

          } else if (action.tool === 'plan_sprint') {
             setMessages(prev => [...prev, {
               id: `ai-${Date.now()}`,
               role: 'assistant',
               content: `I've created a sprint plan: **${action.args?.name}**. Review the details in the canvas.`
             }]);
             setCanvasContent({
               type: 'sprint_draft',
               data: action.args,
               title: 'Sprint Plan'
             });

          } else {
             setMessages(prev => [...prev, { id: `ai-${Date.now()}`, role: 'assistant', content: responseText }]);
          }
        } catch (e) {
          console.error('JSON parse error:', e);
          setMessages(prev => [...prev, { id: `ai-${Date.now()}`, role: 'assistant', content: responseText }]);
        }
      } else {
        setMessages(prev => [...prev, { id: `ai-${Date.now()}`, role: 'assistant', content: responseText }]);
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const text = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }]);
    processQuery(text);
  };

  const handleTaskCreated = () => {
      setMessages(prev => [...prev, { id: `sys-${Date.now()}`, role: 'assistant', content: "✅ Task created successfully! It's now in your backlog." }]);
      setCanvasContent({ type: 'none', data: null });
  };

  const handleQuickAction = (query: string) => {
    setInputValue(query);
  };

  if (!isOpen) return null;

  const isFloating = mode === 'floating';

  const chatContent = (
    <>
        {/* LEFT COLUMN: CHAT */}
        <div className={`${isFloating ? 'w-[340px]' : 'w-[420px]'} flex flex-col border-r border-gray-200 dark:border-[#1F2128] bg-gray-50 dark:bg-[#09090B]`}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-200 dark:border-[#1F2128] flex justify-between items-center bg-white dark:bg-[#0B0C0E]">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <Sparkles size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-[#172B4D] dark:text-white text-sm">Vulcan Copilot</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] text-gray-400">AI Ready</span>
                      </div>
                    </div>
                </div>
                {isFloating && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 1 && messages[0].role === 'assistant' && (
                  <QuickActions onAction={handleQuickAction} />
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                            msg.role === 'user'
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-md'
                            : 'bg-white dark:bg-[#15171E] border border-gray-100 dark:border-[#1F2128] text-[#172B4D] dark:text-gray-200 rounded-bl-md'
                        }`}>
                            <MarkdownRenderer content={msg.content} isUser={msg.role === 'user'} />
                        </div>
                    </div>
                ))}
                {isProcessing && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-[#15171E] border border-gray-100 dark:border-[#1F2128] rounded-2xl px-4 py-3 rounded-bl-md shadow-sm flex items-center gap-3">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span className="text-xs text-gray-400">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-[#0B0C0E] border-t border-gray-200 dark:border-[#1F2128]">
                <div className="relative flex items-center bg-gray-100 dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#1F2128] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Ask me anything..."
                        className="flex-1 bg-transparent pl-4 pr-2 py-3.5 text-sm focus:outline-none text-[#172B4D] dark:text-white placeholder:text-gray-400"
                        autoFocus
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isProcessing}
                        className="m-1.5 p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-40 disabled:shadow-none transition-all"
                    >
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: CANVAS */}
        <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0B0C0E] dark:to-[#0F1015] flex flex-col relative overflow-hidden">
            {/* Canvas Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1F2128] bg-white/50 dark:bg-[#0B0C0E]/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <Layout size={16} />
                    </div>
                    <span className="font-semibold text-[#172B4D] dark:text-white text-sm">
                      {canvasContent.title || 'Canvas'}
                    </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-hidden h-full flex flex-col">

                {/* Empty State */}
                {canvasContent.type === 'none' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                        <div className="text-center max-w-sm animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-xl shadow-purple-500/20">
                                <Wand2 size={36} className="text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-[#172B4D] dark:text-white mb-3">Canvas Ready</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                                Ask the assistant to create tasks, summarize projects, or show blockers. Results will appear here.
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                <button
                                  onClick={() => processQuery("Create a task for implementing user authentication")}
                                  className="px-4 py-2 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all flex items-center gap-2"
                                >
                                  <Plus size={12} /> New Task
                                </button>
                                <button
                                  onClick={() => processQuery("Summarize the current project status")}
                                  className="px-4 py-2 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-purple-500 hover:text-purple-600 transition-all flex items-center gap-2"
                                >
                                  <BarChart3 size={12} /> Summary
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Task Draft Form */}
                {canvasContent.type === 'task_form' && canvasContent.data && (
                    <div className="flex-1 h-full animate-in slide-in-from-right-4 duration-300">
                        <CreateTaskModal
                            isOpen={true}
                            onClose={() => setCanvasContent({ type: 'none', data: null })}
                            initialData={canvasContent.data}
                            mode="embedded"
                            onSuccess={handleTaskCreated}
                        />
                    </div>
                )}

                {/* List View (Blockers) */}
                {canvasContent.type === 'list_view' && canvasContent.data && (
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4 duration-300">
                        <div className="max-w-2xl mx-auto">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                                    <AlertCircle size={20} />
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-[#172B4D] dark:text-white">Blocked Tasks</h3>
                                  <p className="text-xs text-gray-500">{canvasContent.data.length} items need attention</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {canvasContent.data.map((item: Task) => (
                                    <div key={item.id} className="p-4 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl flex items-center gap-4 hover:shadow-md transition-all group cursor-pointer">
                                        <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg">
                                            <AlertCircle size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-[#172B4D] dark:text-white text-sm truncate group-hover:text-blue-600 transition-colors">{item.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-mono bg-gray-100 dark:bg-[#1F2128] px-1.5 py-0.5 rounded text-gray-500">{item.id}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                                  item.priority === 'CRITICAL' ? 'bg-red-100 text-red-600' :
                                                  item.priority === 'HIGH' ? 'bg-orange-100 text-orange-600' :
                                                  'bg-gray-100 text-gray-600'
                                                }`}>{item.priority}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Summary View */}
                {canvasContent.type === 'summary' && canvasContent.data && (
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4 duration-300">
                        <div className="max-w-2xl mx-auto">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-4 gap-3 mb-6">
                                {[
                                  { label: 'Total', value: canvasContent.data.stats?.total || tasks.length, color: 'blue', icon: ListTodo },
                                  { label: 'Done', value: canvasContent.data.stats?.done || tasks.filter(t => t.columnId === 'done').length, color: 'green', icon: CheckCircle2 },
                                  { label: 'In Progress', value: canvasContent.data.stats?.inProgress || tasks.filter(t => t.columnId === 'in-progress').length, color: 'amber', icon: Clock },
                                  { label: 'Blocked', value: canvasContent.data.stats?.blocked || tasks.filter(t => t.columnId === 'blocked').length, color: 'red', icon: AlertCircle },
                                ].map((stat, i) => (
                                  <div key={i} className={`p-4 rounded-xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 border border-${stat.color}-100 dark:border-${stat.color}-900/30`}>
                                    <stat.icon size={16} className={`text-${stat.color}-500 mb-2`} />
                                    <div className={`text-2xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400`}>{stat.value}</div>
                                    <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{stat.label}</div>
                                  </div>
                                ))}
                            </div>

                            {/* Summary Text */}
                            <div className="p-5 bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#1F2128] mb-6">
                                <h4 className="font-semibold text-[#172B4D] dark:text-white mb-3 flex items-center gap-2">
                                  <FileText size={14} /> Summary
                                </h4>
                                <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                  <MarkdownRenderer content={canvasContent.data.summary || 'No summary available.'} isUser={false} />
                                </div>
                            </div>

                            {/* Recent Tasks */}
                            <div>
                                <h4 className="font-semibold text-[#172B4D] dark:text-white mb-3 text-sm">Recent Activity</h4>
                                <div className="space-y-2">
                                  {(canvasContent.data.tasks || []).slice(0, 5).map((task: Task) => (
                                    <div key={task.id} className="flex items-center gap-3 p-3 bg-white dark:bg-[#15171E] rounded-lg border border-gray-100 dark:border-[#1F2128]">
                                      <div className={`w-2 h-2 rounded-full ${
                                        task.columnId === 'done' ? 'bg-green-500' :
                                        task.columnId === 'in-progress' ? 'bg-amber-500' :
                                        task.columnId === 'blocked' ? 'bg-red-500' :
                                        'bg-gray-300'
                                      }`}></div>
                                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{task.title}</span>
                                      <span className="text-[10px] text-gray-400">{task.id}</span>
                                    </div>
                                  ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Epic View */}
                {canvasContent.type === 'epic_view' && canvasContent.data && (
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4 duration-300">
                        <div className="max-w-2xl mx-auto">
                            <div className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-100 dark:border-purple-900/30 mb-6">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                                        <Briefcase size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#172B4D] dark:text-white text-lg">{canvasContent.data.title}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{canvasContent.data.description}</p>
                                    </div>
                                </div>
                            </div>

                            <h4 className="font-semibold text-[#172B4D] dark:text-white mb-3 text-sm">Tasks ({canvasContent.data.tasks?.length || 0})</h4>
                            <div className="space-y-2">
                                {(canvasContent.data.tasks || []).map((task: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-[#15171E] rounded-lg border border-gray-200 dark:border-[#1F2128]">
                                        <div className="w-6 h-6 rounded bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center text-xs font-bold text-gray-500">{i + 1}</div>
                                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{task.title}</span>
                                        <span className="text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">{task.points || 1} pts</span>
                                    </div>
                                ))}
                            </div>

                            <button className="w-full mt-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-purple-500/30 transition-all">
                                Create Epic
                            </button>
                        </div>
                    </div>
                )}

                {/* Sprint Draft View */}
                {canvasContent.type === 'sprint_draft' && canvasContent.data && (
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4 duration-300">
                        <div className="max-w-2xl mx-auto">
                            <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-100 dark:border-green-900/30 mb-6">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                                        <Target size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#172B4D] dark:text-white text-lg">{canvasContent.data.name}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{canvasContent.data.goal}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded">{canvasContent.data.duration || '2 weeks'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <h4 className="font-semibold text-[#172B4D] dark:text-white mb-3 text-sm">Planned Tasks</h4>
                            <div className="space-y-2">
                                {(canvasContent.data.tasks || []).map((task: string, i: number) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-[#15171E] rounded-lg border border-gray-200 dark:border-[#1F2128]">
                                        <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{task}</span>
                                    </div>
                                ))}
                            </div>

                            <button className="w-full mt-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-green-500/30 transition-all">
                                Start Sprint
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>

    </>
  );

  if (isFloating) {
    return (
      <div className="w-full h-full flex overflow-hidden bg-white dark:bg-[#0B0C0E]">
        {chatContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#0B0C0E] w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex">
        {chatContent}
      </div>
    </div>
  );
};

export default CopilotModal;
