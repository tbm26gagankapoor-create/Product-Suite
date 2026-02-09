
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useProjectData } from '../../context/ProjectDataContext';
import { aiClient, SAIF_API_KEY } from '../../lib/ai';
import { Task, Sprint, Project, User } from '../../types';
import { CreateTaskData } from '../CreateTaskModal';
import { MessageList } from './MessageList';
import { CanvasPanel } from './CanvasPanel';

interface CopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
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

export const CopilotModal: React.FC<CopilotModalProps> = ({ isOpen, onClose, initialQuery }) => {
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

    // Early check for API key
    if (!SAIF_API_KEY) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: "AI service is not configured. Please set the `VITE_SAIF_API_KEY` environment variable in your `.env.local` file to enable the copilot."
      }]);
      setIsProcessing(false);
      return;
    }

    // Build rich product context for strategic planning
    const projectsWithContext = projects.map(p => {
      const projectTasks = tasks.filter(t => t.projectId === p.id);
      const projectEpics = projectTasks.filter(t => t.type === 'epic');
      // Count only work items (exclude epics which are containers)
      const projectWorkItems = projectTasks.filter(t => t.type !== 'epic');
      const projectSprints = sprints.filter(s => s.projectId === p.id);

      return `
## ${p.name} (${p.key})
- **Status**: ${p.status}
- **Lifecycle Stage**: ${p.lifecycleStage || 'Not set'}
- **Vision**: ${p.vision || 'No vision defined'}
- **PRD Summary**: ${p.prd ? p.prd.substring(0, 300) + '...' : 'No PRD defined'}
- **Target Release**: ${p.targetReleaseDate || 'Not set'}
- **Total Work Items**: ${projectWorkItems.length} (epics are containers, not counted as work items)
- **Active Epics**: ${projectEpics.length > 0 ? projectEpics.map(e => `[${e.id}] ${e.title}`).join(', ') : 'None'}
- **Sprints**: ${projectSprints.length} (${projectSprints.filter(s => s.status === 'active').length} active)
      `.trim();
    }).join('\n\n');

    // Group work items by epic for roadmap context
    const epicsWithTasks = tasks.filter(t => t.type === 'epic').map(epic => {
      // Only count actual work items (Feature, Task, Bug, Story) - not nested epics
      const epicWorkItems = tasks.filter(t => t.parentEpicId === epic.id && t.type !== 'epic');
      const completedItems = epicWorkItems.filter(t => t.columnId === 'done');
      const inProgressItems = epicWorkItems.filter(t => t.columnId === 'inprogress');
      const todoItems = epicWorkItems.filter(t => t.columnId === 'todo' || t.columnId === 'backlog');

      return `
### Epic: [${epic.id}] ${epic.title} (Container)
- Product Theme: ${epic.productTheme || 'None'}
- Impact Score: ${epic.impactScore || 'N/A'}
- Customer Value: ${epic.customerValue || 'N/A'}
- Progress: ${completedItems.length}/${epicWorkItems.length} work items completed (${inProgressItems.length} in progress, ${todoItems.length} todo)
- Child Work Items: ${epicWorkItems.slice(0, 5).map(t => `[${t.id}] ${t.title} (${t.type})`).join(', ')}${epicWorkItems.length > 5 ? ` ...and ${epicWorkItems.length - 5} more` : ''}
      `.trim();
    }).join('\n\n');

    // Task dependencies for sequencing
    const tasksWithDependencies = tasks
      .filter(t => (t.blockedBy && t.blockedBy.length > 0) || (t.blocks && t.blocks.length > 0))
      .map(t => {
        const blockedByTitles = t.blockedBy?.map(id => tasks.find(bt => bt.id === id)?.title || id).join(', ') || '';
        const blocksTitles = t.blocks?.map(id => tasks.find(bt => bt.id === id)?.title || id).join(', ') || '';
        return `- [${t.id}] ${t.title}${blockedByTitles ? ` (blocked by: ${blockedByTitles})` : ''}${blocksTitles ? ` (blocks: ${blocksTitles})` : ''}`;
      }).join('\n');

    // Product themes distribution
    const tasksByTheme = tasks.reduce((acc, t) => {
      if (t.productTheme) {
        acc[t.productTheme] = (acc[t.productTheme] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const themesList = Object.entries(tasksByTheme)
      .map(([theme, count]) => `- ${theme}: ${count} tasks`)
      .join('\n') || 'No themes defined';

    // Active sprints with context
    const activeSprintsList = sprints
      .filter(s => s.status === 'active')
      .map(s => {
        const sprintTasks = tasks.filter(t => t.sprintId === s.id);
        const project = projects.find(p => p.id === s.projectId);
        return `- **${s.name}** (${project?.name || 'Unknown Project'})\n  Goal: ${s.goal || 'None'}\n  Tasks: ${sprintTasks.length} (${sprintTasks.filter(t => t.columnId === 'done').length} done)`;
      })
      .join('\n') || 'No active sprints';

    // Backlog tasks ready for sprint (not in a sprint, not blocked, has story points)
    // IMPORTANT: Exclude epics - they are containers, not work items
    const readyForSprint = tasks.filter(t =>
      t.type !== 'epic' &&
      !t.sprintId &&
      t.columnId !== 'blocked' &&
      t.columnId !== 'done' &&
      (!t.blockedBy || t.blockedBy.length === 0) &&
      t.points && t.points > 0
    );

    const backlogSnapshot = readyForSprint.slice(0, 20).map(t => {
      const projName = projects.find(p => p.id === t.projectId)?.name || 'Unknown';
      const epicName = t.parentEpicId ? tasks.find(e => e.id === t.parentEpicId)?.title : null;
      return `- [${t.id}] ${t.title}\n  Project: ${projName} | Type: ${t.type} | Priority: ${t.priority} | Points: ${t.points}${epicName ? ` | Epic: ${epicName}` : ''}${t.productTheme ? ` | Theme: ${t.productTheme}` : ''}`;
    }).join('\n');

    const blockedTasks = tasks.filter(t => t.columnId === 'blocked');

    const contextStr = `
PRODUCT ROADMAP & WORKSPACE CONTEXT:

## Products & Strategic Goals
${projectsWithContext}

## Active Epics & Roadmap
${epicsWithTasks || 'No active epics'}

## Product Themes
${themesList}

## Task Dependencies
${tasksWithDependencies || 'No task dependencies defined'}

## Current Sprints
${activeSprintsList}

## Backlog Tasks Ready for Sprint Planning (${readyForSprint.length} work items)
${backlogSnapshot}

## Workspace Stats
- Current User: ${currentUser?.name || 'Unknown'}
- Total Projects: ${projects.length}
- Total Work Items: ${tasks.filter(t => t.type !== 'epic').length} (excludes epics - they are containers)
- Total Epics: ${tasks.filter(t => t.type === 'epic').length} (containers only, not added to sprints)
- Blocked Work Items: ${blockedTasks.filter(t => t.type !== 'epic').length}
- Work Items Ready for Sprint: ${readyForSprint.length}
    `;

    const historyLines = messages.slice(-6).map(m =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n');

    const toolsDef = `
AVAILABLE TOOLS (respond with JSON when using):

1. create_task: Create a new task
   { "tool": "create_task", "args": { "title": "string", "type": "task|bug|story", "priority": "LOW|MEDIUM|HIGH", "points": number, "description": "string" } }

2. show_blockers: Show all blocked tasks
   { "tool": "show_blockers" }

3. summarize_status: Summarize project/sprint status
   { "tool": "summarize_status", "args": { "summary": "markdown summary text", "stats": { "total": n, "done": n, "inProgress": n, "blocked": n } } }

4. create_epic: Create an epic with tasks
   { "tool": "create_epic", "args": { "title": "string", "description": "string", "tasks": [{ "title": "string", "type": "task", "points": n }] } }

5. plan_sprint: Create a strategic sprint plan based on product roadmap
   { "tool": "plan_sprint", "args": { "name": "string", "goal": "string", "duration": "2 weeks", "tasks": ["task ids or titles"], "projectId": "string" } }

SPRINT PLANNING STRATEGY:
When planning a sprint, you MUST consider the product roadmap and strategic goals, NOT just task priority:

**CRITICAL RULES:**
- NEVER include epics in sprint plans - Epics are containers, NOT work items
- ONLY include: Feature, Task, Bug, Story types in sprints
- When counting work items or points, EXCLUDE epics from your calculations

**Planning Guidelines:**
1. **Product Vision Alignment**: Select work items (Feature, Task, Bug, Story) that align with the product's vision, PRD, and lifecycle stage
2. **Epic-Based Grouping**: Group related work items FROM THE SAME EPIC to show progress on that epic. The epic itself is NOT added to the sprint, but its child work items are.
3. **Product Themes**: Balance work across product themes relevant to current goals
4. **Task Dependencies**: Respect work item sequencing - include blocking items before blocked items
5. **Ready Backlog**: Use the "Backlog Tasks Ready for Sprint Planning" section (already estimated, unblocked, and epics are excluded)
6. **Customer Value**: Consider impact scores and customer value, not just priority labels
7. **Sprint Goal**: Create a coherent sprint goal that represents a meaningful product increment

EXAMPLE - GOOD Sprint Plan:
Sprint Goal: "Complete user authentication foundation for MVP launch"
Tasks: [DIG-47, DIG-46, DIG-41] - All authentication-related Features/Tasks/Stories from the "User Authentication" epic
(Note: The epic itself is NOT in the sprint, only its child work items)

EXAMPLE - BAD Sprint Plan:
Sprint Goal: "Work on high priority items"
Tasks: Random high-priority items from different epics/themes with no coherent story, or includes epic items

INSTRUCTIONS:
- For questions, answer directly using PRODUCT ROADMAP & WORKSPACE CONTEXT
- For sprint planning, analyze epics, themes, and product goals FIRST before selecting tasks
- For actions (create, show, summarize), return the appropriate tool JSON
- Be strategic and consider the bigger product picture
- Output ONLY valid JSON when using tools, nothing else before or after
    `;

    try {
      const fullPrompt = `${contextStr}\n${toolsDef}\n\nCONVERSATION:\n${historyLines}\n\nUser: ${query}\n\nRespond appropriately:`;

      const response = await aiClient.models.generateContent({
        model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
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

    } catch (err: any) {
      console.error('Copilot error:', err);

      // Determine user-friendly error message based on error type
      let errorMessage = "Sorry, I encountered an error. Please try again.";

      if (!SAIF_API_KEY) {
        errorMessage = "AI service is not configured. Please set the VITE_SAIF_API_KEY environment variable.";
      } else if (err.message?.includes('401') || err.message?.includes('403') || err.message?.includes('Unauthorized')) {
        errorMessage = "AI service authentication failed. Please check your API key configuration.";
      } else if (err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('rate') || err.message?.includes('Too Many Requests')) {
        errorMessage = "AI service is temporarily busy due to rate limiting. Please wait a moment and try again.";
      } else if (err.message?.includes('Network') || err.message?.includes('Failed to fetch') || err.message?.includes('CORS')) {
        errorMessage = "Unable to connect to AI service. Please check your internet connection and try again.";
      } else if (err.message?.includes('500') || err.message?.includes('502') || err.message?.includes('503')) {
        errorMessage = "AI service is temporarily unavailable. Please try again in a few moments.";
      } else if (err.message?.includes('timeout') || err.message?.includes('Timeout')) {
        errorMessage = "Request timed out. The AI service may be experiencing high load. Please try again.";
      }

      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: errorMessage }]);
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
      setMessages(prev => [...prev, { id: `sys-${Date.now()}`, role: 'assistant', content: "\u2705 Task created successfully! It's now in your backlog." }]);
      setCanvasContent({ type: 'none', data: null });
  };

  const handleQuickAction = (query: string) => {
    setInputValue(query);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#0B0C0E] w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex">

        {/* LEFT COLUMN: CHAT */}
        <div className="w-[420px] flex flex-col border-r border-gray-200 dark:border-[#1F2128] bg-gray-50 dark:bg-[#09090B]">
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
            </div>

            {/* Messages */}
            <MessageList
              messages={messages}
              isProcessing={isProcessing}
              onQuickAction={handleQuickAction}
              messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
            />

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
        <CanvasPanel
          canvasContent={canvasContent}
          onClose={onClose}
          onClearCanvas={() => setCanvasContent({ type: 'none', data: null })}
          onTaskCreated={handleTaskCreated}
          onProcessQuery={processQuery}
          tasks={tasks}
        />

      </div>
    </div>
  );
};

export default CopilotModal;
