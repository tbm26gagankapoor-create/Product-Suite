
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Loader2, 
  Globe, 
  Lock, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Search,
  ShieldCheck
} from 'lucide-react';
import { useProjectData } from '../context/ProjectDataContext';
import { Project, Task, Sprint } from '../types';
import { USERS } from '../constants';
import { JiraClient, JiraProject, JiraIssue } from '../jiraClient';

interface JiraImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const JiraImportModal: React.FC<JiraImportModalProps> = ({ isOpen, onClose }) => {
  const { addProject, addTask, addSprint } = useProjectData();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [domain, setDomain] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [useProxy, setUseProxy] = useState(true);
  
  // Data State
  const [jiraClient, setJiraClient] = useState<JiraClient | null>(null);
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<JiraProject | null>(null);
  
  const [importProgress, setImportProgress] = useState(0);
  const [importedStats, setImportedStats] = useState({ epics: 0, tasks: 0, sprints: 0 });

  // Reset on open
  useEffect(() => {
      if (isOpen) {
          setStep(1);
          setError(null);
          setSelectedProject(null);
          setImportProgress(0);
      }
  }, [isOpen]);

  const handleConnect = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);

      try {
          // Use a public CORS proxy if enabled.
          // Note: Sending credentials through a public proxy has security implications but is necessary for 
          // browser-only demos without a dedicated backend.
          const proxyUrl = useProxy ? 'https://corsproxy.io/?' : '';
          const client = new JiraClient(domain, email, token, proxyUrl);
          
          // Test Connection
          await client.getCurrentUser();
          
          // Fetch Projects immediately
          const jiraProjects = await client.getProjects();
          
          setJiraClient(client);
          setProjects(jiraProjects);
          setStep(2);
      } catch (err: any) {
          console.error(err);
          setError(err.message || 'Failed to connect to Jira. Check CORS or credentials.');
      } finally {
          setIsLoading(false);
      }
  };

  const handleImport = async () => {
      if (!selectedProject || !jiraClient) return;
      setStep(3);
      setIsLoading(true);
      setImportProgress(10);

      try {
          // 1. Fetch Issues
          const issues = await jiraClient.getIssuesForProject(selectedProject.key);
          setImportProgress(40);

          // 2. Create Project in App
          const tempProjectId = `p-${Date.now()}`;
          const newProject: Project = {
              id: tempProjectId,
              name: selectedProject.name,
              key: selectedProject.key,
              description: `Imported from Jira ${selectedProject.key}`,
              status: 'In Progress',
              progress: 0,
              members: [USERS[0].id], // Default to current user
              dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString(),
              tags: ['Jira Import'],
              color: 'from-blue-600 to-cyan-500'
          };
          const savedProject = await addProject(newProject);
          const projectId = savedProject?.id || tempProjectId;
          setImportProgress(50);

          // 3. Create Default Sprint
          const sprintId = `s-${Date.now()}`;
          const newSprint: Sprint = {
              id: sprintId,
              projectId: projectId,
              name: `${selectedProject.key} First Sprint`,
              startDate: new Date().toISOString(),
              endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              goal: 'Imported Tasks',
              status: 'active'
          };
          addSprint(newSprint);
          setImportProgress(60);

          // 4. Map & Create Tasks
          let epicsCount = 0;
          let tasksCount = 0;

          // Helper to map status
          const mapStatus = (status: string) => {
              const s = status.toLowerCase();
              if (s.includes('done') || s.includes('closed')) return 'done';
              if (s.includes('progress')) return 'inprogress';
              return 'todo';
          };

          // Helper to map priority
          const mapPriority = (priority: string = 'Medium') => {
              const p = priority.toLowerCase();
              if (p.includes('high') || p.includes('critical')) return 'HIGH';
              if (p.includes('low')) return 'LOW';
              return 'MEDIUM';
          };

          issues.forEach((issue) => {
              const typeLower = issue.fields.issuetype.name.toLowerCase();
              const isEpic = typeLower.includes('epic');
              
              if (isEpic) epicsCount++;
              else tasksCount++;

              // Try to handle ADF description if possible, otherwise string fallback
              let description = 'Imported content';
              if (typeof issue.fields.description === 'string') {
                  description = issue.fields.description;
              } else if (issue.fields.description && issue.fields.description.content) {
                  // Very basic text extraction from ADF (Atlassian Document Format)
                  try {
                      description = issue.fields.description.content
                          .map((node: any) => node.content?.map((n: any) => n.text).join('') || '')
                          .join('\n');
                  } catch (e) {
                      description = 'Content format not supported';
                  }
              }

              const newTask: Task = {
                  id: issue.key,
                  projectId: projectId,
                  title: issue.fields.summary,
                  description: description,
                  columnId: mapStatus(issue.fields.status.name),
                  type: isEpic ? 'epic' : typeLower.includes('bug') ? 'bug' : 'task',
                  priority: mapPriority(issue.fields.priority?.name),
                  points: 3, // Default
                  assignee: USERS[0], // Default to current user for demo
                  reporter: USERS[0],
                  sprintId: mapStatus(issue.fields.status.name) !== 'done' ? sprintId : undefined,
                  tags: [{ label: 'Jira', color: 'blue' }],
                  commentsCount: 0,
                  startDate: issue.fields.created,
              };
              addTask(newTask);
          });

          setImportedStats({ epics: epicsCount, tasks: tasksCount, sprints: 1 });
          setImportProgress(100);
          setTimeout(() => setStep(4), 500);

      } catch (err: any) {
          setError(err.message || 'Failed during import process.');
          setStep(1); // Go back to start on error
      } finally {
          setIsLoading(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1E2028] w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2C2E3A] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 dark:border-[#2C2E3A] bg-gray-50 dark:bg-[#1E2028] flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0052CC] rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84h-9.63zM6.77 6.8a4.36 4.36 0 0 0 4.34 4.34h1.8v1.72a4.36 4.36 0 0 0 4.34 4.34V7.63a.841.841 0 0 0-.83-.83h-9.65zM2 11.6c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35v-9.56a.84.84 0 0 0-.84-.84H2z"/></svg>
                </div>
                <div>
                    <h2 className="text-xl font-bold text-[#172B4D] dark:text-white">Import from Jira</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Migrate your projects, epics, and tasks seamlessly.</p>
                </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Content */}
        <div className="p-8 flex-1 overflow-y-auto">
            
            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                    <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={18} />
                    <div className="text-sm text-red-600 dark:text-red-300">
                        <p className="font-bold">Connection Failed</p>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {/* Step 1: Connect */}
            {step === 1 && (
                <form onSubmit={handleConnect} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Jira Domain</label>
                            <div className="relative">
                                <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    value={domain}
                                    onChange={(e) => setDomain(e.target.value)}
                                    placeholder="your-company.atlassian.net"
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all dark:text-white"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Email</label>
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all dark:text-white"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">API Token</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="password" 
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="••••••••••••••••"
                                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all dark:text-white"
                                    required
                                />
                            </div>
                            <p className="text-[10px] text-gray-400">
                                Generate a token in <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Atlassian Account Settings</a>.
                            </p>
                        </div>

                        {/* Proxy Option */}
                        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                            <input 
                                type="checkbox" 
                                id="useProxy"
                                checked={useProxy}
                                onChange={(e) => setUseProxy(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <label htmlFor="useProxy" className="text-xs text-blue-800 dark:text-blue-200 flex items-center gap-1.5 cursor-pointer select-none">
                                <ShieldCheck size={14} />
                                Use CORS Proxy (Required for browser-only connection)
                            </label>
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="bg-[#0052CC] hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Connect to Jira'}
                        </button>
                    </div>
                </form>
            )}

            {/* Step 2: Select Project */}
            {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search projects..." className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg text-sm focus:outline-none dark:text-white" />
                    </div>

                    <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {projects.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No projects found.</div>
                        ) : projects.map(project => (
                            <div 
                                key={project.id}
                                onClick={() => setSelectedProject(project)}
                                className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                                    selectedProject?.id === project.id 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' 
                                    : 'border-gray-200 dark:border-[#2D2F36] hover:border-blue-300 dark:hover:border-gray-600 bg-white dark:bg-[#15171E]'
                                }`}
                            >
                                <img src={project.avatarUrls['48x48']} className="w-10 h-10 rounded-lg object-cover" alt={project.name} />
                                <div className="flex-1">
                                    <h4 className="font-bold text-[#172B4D] dark:text-white">{project.name}</h4>
                                    <span className="text-xs text-gray-500">{project.key}</span>
                                </div>
                                {selectedProject?.id === project.id && <CheckCircle2 size={20} className="text-blue-600 dark:text-blue-400" />}
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between pt-4 border-t border-gray-100 dark:border-[#2D2F36]">
                        <button onClick={() => setStep(1)} className="text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-white">Back</button>
                        <button 
                            onClick={handleImport}
                            disabled={!selectedProject}
                            className="bg-[#0052CC] hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            Start Import <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Loading / Importing */}
            {step === 3 && (
                <div className="flex flex-col items-center justify-center py-12 animate-in fade-in duration-300 text-center">
                    <div className="relative mb-8">
                        <div className="w-20 h-20 border-4 border-gray-200 dark:border-[#2D2F36] rounded-full"></div>
                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-[#0052CC] border-t-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center font-bold text-[#0052CC]">{importProgress}%</div>
                    </div>
                    <h3 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">Importing Project...</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
                        Fetching issues, comments, attachments, and mapping users from Jira.
                    </p>
                    
                    <div className="mt-8 space-y-2 w-full max-w-sm text-left">
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                            {importProgress > 20 ? <CheckCircle2 size={16} className="text-green-500" /> : <Loader2 size={16} className="animate-spin text-blue-500" />}
                            <span>Authenticating...</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                            {importProgress > 40 ? <CheckCircle2 size={16} className="text-green-500" /> : <span className={`w-4 h-4 rounded-full border-2 ${importProgress > 20 ? 'border-blue-500 border-t-transparent animate-spin' : 'border-gray-300'}`}></span>}
                            <span className={importProgress <= 20 ? 'opacity-50' : ''}>Fetching Issues...</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                            {importProgress > 90 ? <CheckCircle2 size={16} className="text-green-500" /> : <span className={`w-4 h-4 rounded-full border-2 ${importProgress > 40 ? 'border-blue-500 border-t-transparent animate-spin' : 'border-gray-300'}`}></span>}
                            <span className={importProgress <= 40 ? 'opacity-50' : ''}>Creating Tasks & Sprints...</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
                <div className="flex flex-col items-center justify-center py-8 animate-in zoom-in-95 duration-300 text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6">
                        <Check size={32} strokeWidth={3} />
                    </div>
                    <h3 className="text-2xl font-bold text-[#172B4D] dark:text-white mb-2">Import Successful!</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mb-8">
                        Your Jira project has been successfully migrated.
                    </p>

                    <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-8">
                        <div className="p-4 bg-gray-50 dark:bg-[#15171E] rounded-xl border border-gray-100 dark:border-[#2D2F36]">
                            <div className="text-2xl font-bold text-[#172B4D] dark:text-white">{importedStats.epics}</div>
                            <div className="text-xs text-gray-500 uppercase font-bold">Epics</div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-[#15171E] rounded-xl border border-gray-100 dark:border-[#2D2F36]">
                            <div className="text-2xl font-bold text-[#172B4D] dark:text-white">{importedStats.tasks}</div>
                            <div className="text-xs text-gray-500 uppercase font-bold">Tasks</div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-[#15171E] rounded-xl border border-gray-100 dark:border-[#2D2F36]">
                            <div className="text-2xl font-bold text-[#172B4D] dark:text-white">{importedStats.sprints}</div>
                            <div className="text-xs text-gray-500 uppercase font-bold">Sprints</div>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="bg-[#172B4D] dark:bg-white text-white dark:text-black px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-all"
                    >
                        Go to Project
                    </button>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default JiraImportModal;
