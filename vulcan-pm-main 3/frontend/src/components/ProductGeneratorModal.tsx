import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Wand2,
  FileText,
  Layout,
  Layers,
  Plus,
  Trash2,
  Maximize2,
  UploadCloud,
  File as FileIcon,
  Calendar,
  Users,
  User,
  Edit3,
  RefreshCw,
  Zap,
  Lightbulb,
  Image as ImageIcon,
  DollarSign,
  TrendingUp,
  MousePointer2,
  ChevronRight,
  Target,
  Briefcase,
  Settings,
  GitBranch,
  Building2,
  BookOpen,
  Code2,
  Search,
  Folder,
  Lock,
  Globe,
  AlertTriangle
} from 'lucide-react';
import { DOC_NAV_ITEMS } from '../constants';
import { Task, User as UserType } from '../types';
import TaskDetailModal from './TaskDetailModal';
import { useProjectData } from '../context/ProjectDataContext';
import { useToast } from '../context/ToastContext';
import { aiClient } from '../lib/ai';
import {
  analyzeImportedDocument,
  analyzeProductConcept,
  generateMoreSuggestions,
  generatePRD,
  generateDocSection,
  generateProjectPlan,
  generateTasksForEpic,
  refineVision,
  editDocSection,
  editPlanStructure,
  formatResearchContext,
  ResearchReportData,
  PromptRequest,
} from '../lib/prompts';
import MarkdownRenderer from './MarkdownRenderer';
import { useTheme } from '../context/ThemeContext';
import { researchService, ResearchReport } from '../services/research.service';
import { gitService, GitConnection, Repository } from '../services/git.service';
import { productGeneratorService, JobStatus } from '../services/product-generator.service';
import { draftService, DraftSession } from '../services/draft.service';
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.0.379';
import mammoth from 'https://esm.sh/mammoth@1.6.0';

// Initialize PDF Worker
try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;
} catch (e) {
    console.warn("Failed to initialize PDF worker", e);
}

// Types
interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: 'feature' | 'monetization' | 'market' | 'ux';
  selected: boolean;
}

interface ProductGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate?: (productData: any) => Promise<void> | void; // Deprecated: kept for backwards compat, no longer used
}

interface DocSection {
  title: string;
  content: string;
}

interface GeneratedTask {
    id: string;
    title: string;
    description?: string;
    type: 'task' | 'bug' | 'story' | 'feature';
    points: number;
    assigneeId: string;
    dueDate: string;
}

interface GeneratedEpic {
    id: string;
    title: string;
    description: string;
    tasks: GeneratedTask[];
}

// Step Configuration
const STEPS = [
  { id: 'input', label: 'Define', icon: Target },
  { id: 'review', label: 'Vision', icon: Lightbulb },
  { id: 'prd_view', label: 'Documents', icon: FileText },
  { id: 'planning', label: 'Plan', icon: Layout },
];

const ProductGeneratorModal: React.FC<ProductGeneratorModalProps> = ({ isOpen, onClose }) => {
  const { users, currentUser, refreshData } = useProjectData();
  const { error: showError, warning, success, info } = useToast();
  const { theme } = useTheme();
  const [step, setStep] = useState<'input' | 'processing' | 'review' | 'generating_docs' | 'prd_view' | 'planning' | 'creating_project'>('input');

  // Input Mode
  const [inputMode, setInputMode] = useState<'scratch' | 'import'>('scratch');

  // Form State
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // Dynamic Owner/Team Defaults
  const [ownerId, setOwnerId] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);

  // File State
  const [uploadedFile, setUploadedFile] = useState<{ name: string; type: string; base64: string } | null>(null);
  const [fileText, setFileText] = useState<string>('');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // AI State
  const [refinedVision, setRefinedVision] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [messages, setMessages] = useState<{role: 'ai' | 'user', text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [creationProgress, setCreationProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');

  // PRD State
  const [activeDocSection, setActiveDocSection] = useState('prd');
  const [generatedDocs, setGeneratedDocs] = useState<Record<string, string>>({});
  const [parsedSections, setParsedSections] = useState<DocSection[]>([]);
  const [currentGeneratingDoc, setCurrentGeneratingDoc] = useState<string | null>(null);
  const [docGenerationProgress, setDocGenerationProgress] = useState<Record<string, 'pending' | 'generating' | 'completed' | 'error'>>({});

  // Planning State
  const [generatedEpics, setGeneratedEpics] = useState<GeneratedEpic[]>([]);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [activeEpicId, setActiveEpicId] = useState<string | null>(null);
  const [aiPromptEpicId, setAiPromptEpicId] = useState<string | null>(null);
  const [aiTaskPrompt, setAiTaskPrompt] = useState('');
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [isPlanGenerating, setIsPlanGenerating] = useState(false);

  // Git Repo State
  const [repoMode, setRepoMode] = useState<'shared' | 'dedicated' | 'code' | null>(null);
  const [gitConnections, setGitConnections] = useState<GitConnection[]>([]);
  const [selectedGitConnection, setSelectedGitConnection] = useState<GitConnection | null>(null);
  const [gitRepos, setGitRepos] = useState<Repository[]>([]);
  const [selectedGitRepo, setSelectedGitRepo] = useState<Repository | null>(null);
  const [gitDocsPath, setGitDocsPath] = useState('docs/');
  const [gitBranchStrategy, setGitBranchStrategy] = useState<'direct' | 'pr'>('direct');
  const [gitRepoSearch, setGitRepoSearch] = useState('');
  const [loadingGitConnections, setLoadingGitConnections] = useState(false);
  const [loadingGitRepos, setLoadingGitRepos] = useState(false);
  const [showCreateRepo, setShowCreateRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(true);
  const [creatingRepo, setCreatingRepo] = useState(false);

  // Git Capabilities State
  const [gitCapabilities, setGitCapabilities] = useState<{ list_repos: boolean; create_repo: boolean; push_files: boolean } | null>(null);
  const [gitCapabilitiesHint, setGitCapabilitiesHint] = useState<string | undefined>();

  // Draft Session State (incremental doc sync)
  const [draftSessionId, setDraftSessionId] = useState<string | null>(null);
  const [docSummaries, setDocSummaries] = useState<Record<string, string>>({});

  // Draft Resume State
  const [resumableDraft, setResumableDraft] = useState<DraftSession | null>(null);
  const [isResumingDraft, setIsResumingDraft] = useState(false);

  // Research State
  const [researchEnabled, setResearchEnabled] = useState(false);
  const [researchAvailable, setResearchAvailable] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [researchReport, setResearchReport] = useState<ResearchReport | null>(null);
  const [showResearchPanel, setShowResearchPanel] = useState(false);

  // Creation Job State
  const [creationJob, setCreationJob] = useState<JobStatus | null>(null);

  // Editor State
  const [isRegenerating, setIsRegenerating] = useState(false);
  const docContentRef = useRef<HTMLDivElement>(null);

  // Transition State for UX improvements
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);

  // Git validation: if user picked a storage mode, they must also pick a repo
  const gitRepoIncomplete = repoMode !== null && selectedGitRepo === null;

  // Resolve effective dark mode for mermaid
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Get current step index for stepper
  const getCurrentStepIndex = () => {
    const stepMap: Record<string, number> = {
      'input': 0, 'processing': 0,
      'review': 1, 'generating_docs': 1,
      'prd_view': 2,
      'planning': 3, 'creating_project': 3
    };
    return stepMap[step] ?? 0;
  };

  // Handle step changes with transitions
  const handleStepChange = (newStep: typeof step, direction: 'forward' | 'backward') => {
    setTransitionDirection(direction);
    setIsTransitioning(true);

    // Track completed steps for backward navigation
    if (direction === 'forward') {
      setCompletedSteps(prev => new Set([...prev, step]));
    }

    setTimeout(() => {
      setStep(newStep);
      setIsTransitioning(false);
    }, 200);
  };

  // Get previous step for backward navigation
  const getPreviousStep = (): typeof step => {
    const stepOrder: (typeof step)[] = ['input', 'review', 'prd_view', 'planning'];
    const currentIdx = stepOrder.indexOf(step);
    return currentIdx > 0 ? stepOrder[currentIdx - 1] : 'input';
  };

  // Initialize form defaults based on context
  useEffect(() => {
      if (isOpen && currentUser) {
          setOwnerId(currentUser.id);
          const team = [currentUser.id, ...users.filter(u => u.id !== currentUser.id).slice(0, 2).map(u => u.id)];
          setSelectedTeam(team);
      }
  }, [isOpen, currentUser, users]);

  // Check research availability when modal opens
  useEffect(() => {
      if (isOpen) {
          researchService.isAvailable()
              .then(available => setResearchAvailable(available))
              .catch(() => setResearchAvailable(false));
      }
  }, [isOpen]);

  // Load git connections when modal opens
  useEffect(() => {
      if (isOpen) {
          setLoadingGitConnections(true);
          gitService.getMyConnections()
              .then(data => {
                  const valid = data.filter(c => c.is_valid);
                  setGitConnections(valid);
                  if (valid.length > 0) setSelectedGitConnection(valid[0]);
              })
              .catch(() => setGitConnections([]))
              .finally(() => setLoadingGitConnections(false));
      }
  }, [isOpen]);

  // Load repos when selected git connection changes
  useEffect(() => {
      if (selectedGitConnection && repoMode) {
          setLoadingGitRepos(true);
          setGitRepos([]);
          setSelectedGitRepo(null);
          gitService.listMyRepositories(selectedGitConnection.provider_id)
              .then(data => setGitRepos(data))
              .catch(() => setGitRepos([]))
              .finally(() => setLoadingGitRepos(false));
      }
  }, [selectedGitConnection, repoMode]);

  // Fetch git capabilities when connection changes
  useEffect(() => {
      if (selectedGitConnection) {
          setGitCapabilities(null);
          setGitCapabilitiesHint(undefined);
          gitService.getCapabilities(selectedGitConnection.provider_id)
              .then(data => {
                  setGitCapabilities(data.capabilities);
                  setGitCapabilitiesHint(data.hint);
              })
              .catch(() => {
                  // Default to allowing everything if check fails
                  setGitCapabilities({ list_repos: true, create_repo: true, push_files: true });
              });
      } else {
          setGitCapabilities(null);
          setGitCapabilitiesHint(undefined);
      }
  }, [selectedGitConnection]);

  // Mermaid rendering is now handled by MarkdownRenderer

  // Update docs path when repo mode changes
  const handleRepoModeToggle = (mode: 'shared' | 'dedicated' | 'code') => {
      const newMode = repoMode === mode ? null : mode;
      setRepoMode(newMode);
      if (newMode === 'shared') {
          const slug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          setGitDocsPath(`${slug || 'project'}/docs/`);
      } else {
          setGitDocsPath('docs/');
      }
      if (!newMode) {
          setSelectedGitRepo(null);
      }
  };

  const handleCreateRepo = async () => {
      if (!newRepoName.trim()) return;
      if (!selectedGitConnection) {
          showError('No Git provider connected. Please connect one in Settings first.');
          return;
      }
      setCreatingRepo(true);
      try {
          const repo = await gitService.createRepository(
              selectedGitConnection.provider_id,
              newRepoName.trim(),
              `Documentation for ${productName || newRepoName.trim()}`,
              newRepoPrivate
          );
          setGitRepos(prev => [repo, ...prev]);
          setSelectedGitRepo(repo);
          setShowCreateRepo(false);
          setNewRepoName('');
          success('Repository created successfully');
      } catch (err: any) {
          showError(err.message || 'Failed to create repository');
      } finally {
          setCreatingRepo(false);
      }
  };

  // Helper for exponential backoff retry
  const generateWithRetry = async (params: any, retries = 5, delay = 2000): Promise<any> => {
    try {
      return await aiClient.models.generateContent(params);
    } catch (error: any) {
      const isRateLimit = error.status === 429 ||
                          (error.message && typeof error.message === 'string' && (
                              error.message.includes('429') ||
                              error.message.includes('RESOURCE_EXHAUSTED') ||
                              error.message.includes('quota') ||
                              error.message.includes('overloaded') ||
                              error.message.includes('Too Many Requests')
                          ));

      if (isRateLimit) {
        if (retries > 0) {
          console.warn(`Rate limit or server error hit (Attempt ${6 - retries}/5). Retrying in ${delay}ms...`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
          return generateWithRetry(params, retries - 1, delay * 2);
        } else {
           throw new Error("AI Service is busy or you have exceeded your quota. Please try again later.");
        }
      }
      throw error;
    }
  };

  const cleanJson = (text: string) => {
      if (!text) return '{}';
      let cleaned = text;

      // Remove Qwen3 thinking tags
      cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');

      // Remove markdown code blocks
      cleaned = cleaned.replace(/```(?:json)?\n?([\s\S]*?)\n?```/gi, '$1');

      // Find the first JSON structure
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

      // Log for debugging
      console.log('Cleaned JSON length:', cleaned.length, 'First 200 chars:', cleaned.substring(0, 200));

      return cleaned.trim();
  };

  const cleanMarkdown = (text: string) => {
      if (!text) return '';
      // Strip wrapping markdown code fences if AI wraps output in them
      return text.replace(/```(?:markdown)?\n?([\s\S]*?)\n?```/gi, '$1').trim();
  };

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
        setStep('input');
        setInputMode('scratch');
        setProductName('');
        setDescription('');
        setTags('');
        setUploadedFile(null);
        setFileText('');
        setIsExtracting(false);
        setProductImage(null);
        setMessages([]);
        setSuggestions([]);
        setGeneratedDocs({});
        setGeneratedEpics([]);
        setActiveDocSection('prd');
        setRefinedVision('');
        setParsedSections([]);
        setSelectedTaskForDetail(null);
        setAiPromptEpicId(null);
        setCreationProgress(0);
        setResearchReport(null);
        setResearchEnabled(false);
        setIsResearching(false);
        setShowResearchPanel(false);
        setResumableDraft(null);
        setIsResumingDraft(false);
        setIsPlanGenerating(false);

        // Check for resumable drafts
        draftService.listMyDrafts()
          .then(drafts => {
            const withSections = drafts.find(d => Object.keys(d.sections).length > 0);
            if (withSections) setResumableDraft(withSections);
          })
          .catch(() => {});
    }
  }, [isOpen]);

  // Loading Simulator
  useEffect(() => {
    let interval: any;
    if (step === 'processing' || step === 'generating_docs' || isRegenerating) {
      const duration = isRegenerating ? 6000 : (step === 'processing' ? 8000 : 15000);
      setTimeLeft(duration / 1000);
      setProgress(0);

      const startTime = Date.now();
      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / duration) * 100, 95);
        setProgress(newProgress);
        setTimeLeft(Math.max(0, Math.ceil((duration - elapsed) / 1000)));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [step, isRegenerating]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleTeamMember = (userId: string) => {
      setSelectedTeam(prev =>
          prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
  };

  const extractPdfText = async (file: File): Promise<string> => {
      const arrayBuffer = await file.arrayBuffer();
      try {
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(' ');
              fullText += pageText + '\n\n';
          }
          return fullText;
      } catch (e) {
          console.error("PDF extraction failed", e);
          throw new Error("Could not parse PDF. Please ensure it is a valid text-based PDF.");
      }
  };

  const extractDocxText = async (file: File): Promise<string> => {
      const arrayBuffer = await file.arrayBuffer();
      try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          return result.value;
      } catch (e) {
          console.error("DOCX extraction failed", e);
          throw new Error("Could not parse Word document.");
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsExtracting(true);
      setFileText('');
      setUploadedFile({
          name: file.name,
          type: file.type,
          base64: ''
      });

      try {
          let text = '';

          if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
              text = await extractPdfText(file);
          } else if (
              file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
              file.name.toLowerCase().endsWith('.docx')
          ) {
              text = await extractDocxText(file);
          } else {
              text = await new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = (e) => resolve(e.target?.result as string);
                  reader.onerror = reject;
                  reader.readAsText(file);
              });
          }

          if (text && text.trim().length > 0) {
              setFileText(text);
          } else {
              setFileText('');
              warning('Empty File', 'The uploaded file appears to be empty or unreadable.');
          }

      } catch (error: any) {
          console.error("File processing error:", error);
          showError('File Error', `Error reading file: ${error.message}. Please copy-paste the content instead.`);
          setFileText('');
      } finally {
          setIsExtracting(false);
      }
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
          setProductImage(reader.result as string);
      };
      reader.readAsDataURL(file);
  };

  const getSuggestionIcon = (type: string) => {
      switch(type) {
          case 'monetization': return <DollarSign size={14} className="text-emerald-500" />;
          case 'market': return <TrendingUp size={14} className="text-blue-500" />;
          case 'ux': return <MousePointer2 size={14} className="text-pink-500" />;
          default: return <Zap size={14} className="text-amber-500" />;
      }
  };

  const getSuggestionColor = (type: string) => {
      switch(type) {
          case 'monetization': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
          case 'market': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
          case 'ux': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400';
          default: return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      }
  };

  // Draft Resume/Dismiss handlers
  const handleResumeDraft = async () => {
    if (!resumableDraft) return;
    setIsResumingDraft(true);
    try {
      const draft = await draftService.getDraft(resumableDraft.id);
      setDraftSessionId(draft.id);
      setProductName(draft.product_name);
      if (draft.description) setDescription(draft.description);
      if (draft.vision) setRefinedVision(draft.vision);
      if (draft.tags) setTags(draft.tags);
      if (draft.input_mode) setInputMode(draft.input_mode as 'scratch' | 'import');
      if (draft.repo_mode !== undefined) setRepoMode(draft.repo_mode as any);
      if (draft.suggestions) setSuggestions(draft.suggestions);
      if (draft.epics) setGeneratedEpics(draft.epics);
      if (draft.research_report) setResearchReport(draft.research_report);

      // Restore doc sections
      const docs: Record<string, string> = {};
      for (const [key, sec] of Object.entries(draft.sections)) {
        docs[key] = sec.content;
      }
      if (Object.keys(docs).length > 0) setGeneratedDocs(docs);

      // Set progress for restored sections + identify missing ones
      const progressMap: Record<string, 'pending' | 'generating' | 'completed' | 'error'> = {};
      const summaries: Record<string, string> = {};
      for (const item of DOC_NAV_ITEMS) {
        if (docs[item.id]) {
          progressMap[item.id] = 'completed';
          summaries[item.id] = extractSectionSummary(docs[item.id]);
        } else {
          progressMap[item.id] = 'pending';
        }
      }
      setDocGenerationProgress(progressMap);
      setDocSummaries(summaries);

      // Navigate to the appropriate step
      const targetStep = draft.step || (Object.keys(docs).length > 0 ? 'prd_view' : 'review');
      setStep(targetStep as any);
      setResumableDraft(null);

      // Resume generation of missing sections in background
      const missingSections = DOC_NAV_ITEMS.filter(s => !docs[s.id]);
      if (missingSections.length > 0 && (targetStep === 'prd_view' || targetStep === 'planning')) {
        resumeMissingSections(draft.id, draft.product_name, draft.vision || '', draft.description || '', draft.tags || '', missingSections,
          draft.research_report ? formatResearchContext(draft.research_report as ResearchReportData) : undefined);
      }
    } catch (err) {
      console.error('[Draft] Failed to resume draft:', err);
    } finally {
      setIsResumingDraft(false);
    }
  };

  const resumeMissingSections = async (
    currentDraftId: string,
    name: string,
    vision: string,
    desc: string,
    tagStr: string,
    missingSections: typeof DOC_NAV_ITEMS,
    researchCtx?: string
  ) => {
    const context = `
      Product: ${name}
      Description: ${desc}
      Refined Vision: ${vision}
      Tags: ${tagStr}
    `;

    for (let i = 0; i < missingSections.length; i++) {
      const sec = missingSections[i];
      setCurrentGeneratingDoc(sec.id);
      setDocGenerationProgress(prev => ({ ...prev, [sec.id]: 'generating' }));
      setLoadingStatus(`Generating ${sec.label} (${i + 1}/${missingSections.length})...`);

      try {
        const docTd = generateDocSection(sec.label, context, researchCtx);

        await new Promise(r => setTimeout(r, 5000));

        const res = await generateWithRetry({
          promptTemplate: docTd.templateName,
          promptVariables: docTd.variables,
        });

        const docContent = cleanMarkdown(res.text || '*Error generating content*');
        setGeneratedDocs(prev => ({ ...prev, [sec.id]: docContent }));
        setDocSummaries(prev => ({ ...prev, [sec.id]: extractSectionSummary(docContent) }));
        setDocGenerationProgress(prev => ({ ...prev, [sec.id]: 'completed' }));

        // Fire-and-forget: persist to draft + git
        draftService.syncSection(currentDraftId, sec.id, docContent).catch(() => {});
      } catch (e) {
        console.error(`Failed to generate ${sec.label}`, e);
        setDocGenerationProgress(prev => ({ ...prev, [sec.id]: 'error' }));
        setGeneratedDocs(prev => ({
          ...prev,
          [sec.id]: `
            <div class="p-6 border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-xl text-red-600 dark:text-red-400">
                <h3 class="font-bold text-sm mb-2">Generation Skipped</h3>
                <p class="text-xs">
                    Rate limit exceeded or service busy for this section. You can try regenerating it manually using the AI editor below.
                </p>
            </div>
          `
        }));
      }
    }

    setCurrentGeneratingDoc(null);
    setLoadingStatus('');
  };

  const handleDismissDraft = async () => {
    if (!resumableDraft) return;
    draftService.deleteDraft(resumableDraft.id).catch(() => {});
    setResumableDraft(null);
  };

  // 1. Initial Generation
  const handleGenerate = async () => {
      if (inputMode === 'scratch' && !productName) return;
      if (inputMode === 'import' && !uploadedFile) return;
      if (inputMode === 'import' && !fileText) {
          warning('Invalid File', 'File content is empty or unreadable. Please upload a valid text/PDF/DOCX file.');
          return;
      }
      if (repoMode && !selectedGitRepo) {
          warning('Repository Required', 'Please select a repository or deselect the storage mode.');
          return;
      }

      setStep('processing');
      setIsAiLoading(true);
      setLoadingStatus('Initializing AI analysis...');

      try {
          // Conduct web research if enabled
          let researchCtx: string | undefined;
          if (researchEnabled) {
              setIsResearching(true);
              setLoadingStatus('Conducting competitive research...');
              try {
                  const report = await researchService.conductResearch({
                      productName,
                      description,
                      tags,
                  });
                  setResearchReport(report);
                  researchCtx = formatResearchContext(report as ResearchReportData);
              } catch (err) {
                  console.warn('Research failed, continuing without:', err);
                  info('Research Skipped', 'Web research could not be completed. Proceeding with AI analysis only.');
              } finally {
                  setIsResearching(false);
              }
          }

          let td: PromptRequest;

          setLoadingStatus(inputMode === 'import' ? 'Processing uploaded document...' : 'Analyzing product concept...');

          if (inputMode === 'import') {
              td = analyzeImportedDocument(fileText, researchCtx);
          } else {
              td = analyzeProductConcept(productName, description, tags, researchCtx);
          }

          setLoadingStatus('Generating product vision with AI...');

          const response = await generateWithRetry({
              promptTemplate: td.templateName,
              promptVariables: td.variables,
              config: {
                  responseMimeType: 'application/json'
              }
          });

          setLoadingStatus('Processing AI response...');
          const jsonText = cleanJson(response.text || '{}');
          let data;
          try {
              data = JSON.parse(jsonText);
          } catch (e) {
              console.warn("JSON Parse failed, treating as error", e);
              throw new Error("Failed to parse AI response.");
          }

          if (data.productName && (!productName || inputMode === 'import')) setProductName(data.productName);
          // Save the refined vision as the product description
          if (data.vision && (!description || inputMode === 'import')) setDescription(data.vision);
          setRefinedVision(data.vision || '');

          if (data.suggestions && Array.isArray(data.suggestions)) {
              const mappedSuggestions = data.suggestions.map((s: any, idx: number) => ({
                  id: `s-${idx}`,
                  title: s.title || s.name || 'Untitled Suggestion',
                  description: s.description || s.details || 'No description provided',
                  type: s.type || 'feature',
                  selected: idx < 3
              }));

              setSuggestions(mappedSuggestions);

              const initialAdditions = mappedSuggestions
                  .filter((s: Suggestion) => s.selected)
                  .map((s: Suggestion) => `\n\n[${s.type.toUpperCase()}]: ${s.title}\n${s.description}`)
                  .join('');

              if (data.vision && initialAdditions) {
                  setRefinedVision(data.vision + initialAdditions);
              }

          } else {
              setSuggestions([]);
          }

          handleStepChange('review', 'forward');
          setMessages([]);
      } catch (error) {
          console.error("AI Error:", error);
          let errorMsg = `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}.`;
          if (error instanceof Error && (error.message.includes('quota') || error.message.includes('AI Service is busy'))) {
              errorMsg = "AI Service is busy or you have exceeded your quota. Please try again later.";
          }
          setRefinedVision(errorMsg);
          setSuggestions([]);
          handleStepChange('review', 'forward');
      } finally {
          setIsAiLoading(false);
      }
  };

  const handleMoreSuggestions = async () => {
      setIsAiLoading(true);
      const td = generateMoreSuggestions(productName, refinedVision);

      try {
          const response = await generateWithRetry({
              promptTemplate: td.templateName,
              promptVariables: td.variables,
              config: {
                  responseMimeType: 'application/json'
              }
          });

          const text = cleanJson(response.text || '{}');
          const parsed = JSON.parse(text);

          let newItems = [];
          if (Array.isArray(parsed)) {
              newItems = parsed;
          } else if (parsed && typeof parsed === 'object') {
              if (Array.isArray(parsed.suggestions)) {
                  newItems = parsed.suggestions;
              } else if (Array.isArray(parsed.newSuggestions)) {
                  newItems = parsed.newSuggestions;
              }
          }

          if (newItems.length > 0) {
              const mapped = newItems.map((s: any, i: number) => ({
                  id: `more-${Date.now()}-${i}`,
                  title: s.title,
                  description: s.description,
                  type: s.type || 'feature',
                  selected: false
              }));
              setSuggestions(prev => [...prev, ...mapped]);
          } else {
              console.warn("No suggestions found in response", parsed);
          }
      } catch (e) {
          console.error("Failed to generate more suggestions", e);
      } finally {
          setIsAiLoading(false);
      }
  };

  // Helper: extract plain-text summary from HTML content
  const extractSectionSummary = (htmlContent: string): string => {
    const plainText = htmlContent.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    return plainText.substring(0, 500);
  };

  // 2. Generate Full Documentation
  const handleGenerateDocs = async () => {
      setStep('generating_docs');
      setLoadingStatus('Preparing documentation context...');

      const context = `
        Product: ${productName}
        Description: ${description}
        Refined Vision: ${refinedVision}
        Tags: ${tags}
        ${fileText ? `\nOriginal Document Context:\n${fileText.substring(0, 150000)}` : ''}
      `;

      const researchCtx = researchReport ? formatResearchContext(researchReport as ResearchReportData) : undefined;

      // Create draft session for incremental persistence + git sync
      let currentDraftId = draftSessionId;
      try {
          const gitSettings = selectedGitConnection && selectedGitRepo ? {
            provider_id: selectedGitConnection.provider_id,
            repo_owner: selectedGitRepo.owner.login,
            repo_name: selectedGitRepo.name,
            docs_path: gitDocsPath || 'docs/',
            default_branch: selectedGitRepo.default_branch || 'main',
          } : undefined;

          const session = await draftService.createSession({
            productName,
            git: gitSettings,
          });
          currentDraftId = session.sessionId;
          setDraftSessionId(session.sessionId);
      } catch (err) {
          console.warn('[Draft] Failed to create draft session, continuing without incremental sync:', err);
      }

      try {
          const prdTd = generatePRD(productName, context, researchCtx);

          setLoadingStatus('Generating PRD Requirements...');

          const prdResponse = await generateWithRetry({
              promptTemplate: prdTd.templateName,
              promptVariables: prdTd.variables,
          });

          // Save PRD immediately
          const prdContent = cleanMarkdown(prdResponse.text || '*Error generating PRD*');
          setGeneratedDocs(prev => ({ ...prev, prd: prdContent }));
          setDocSummaries(prev => ({ ...prev, prd: extractSectionSummary(prdContent) }));
          setDocGenerationProgress(prev => ({ ...prev, prd: 'completed' }));
          handleStepChange('prd_view', 'forward');
          setMessages([]);

          // Fire-and-forget: persist PRD to draft + git + wizard state
          if (currentDraftId) {
            draftService.syncSection(currentDraftId, 'prd', prdContent).catch(() => {});
            draftService.updateMeta(currentDraftId, {
              step: 'prd_view', vision: refinedVision, description, input_mode: inputMode, tags,
              suggestions, repo_mode: repoMode,
            }).catch(() => {});
          }

          // Initialize progress for all sections
          const sectionsToGenerate = DOC_NAV_ITEMS.filter(s => s.id !== 'prd');
          setDocGenerationProgress(prev => {
              const initial: Record<string, 'pending' | 'generating' | 'completed' | 'error'> = { ...prev };
              sectionsToGenerate.forEach(s => { initial[s.id] = 'pending'; });
              return initial;
          });

          // Generate each document separately with independent API calls
          for (let i = 0; i < sectionsToGenerate.length; i++) {
              const sec = sectionsToGenerate[i];
              // Mark as generating
              setCurrentGeneratingDoc(sec.id);
              setDocGenerationProgress(prev => ({ ...prev, [sec.id]: 'generating' }));
              setLoadingStatus(`Generating ${sec.label} (${i + 1}/${sectionsToGenerate.length})...`);

              try {
                  const docTd = generateDocSection(sec.label, context, researchCtx);

                  await new Promise(r => setTimeout(r, 5000));

                  // Separate API call for each document
                  const res = await generateWithRetry({
                      promptTemplate: docTd.templateName,
                      promptVariables: docTd.variables,
                  });

                  // Save document immediately after generation
                  const docContent = cleanMarkdown(res.text || '*Error generating content*');
                  setGeneratedDocs(prev => ({ ...prev, [sec.id]: docContent }));
                  setDocSummaries(prev => ({ ...prev, [sec.id]: extractSectionSummary(docContent) }));
                  setDocGenerationProgress(prev => ({ ...prev, [sec.id]: 'completed' }));

                  // Fire-and-forget: persist to draft + git
                  if (currentDraftId) {
                    draftService.syncSection(currentDraftId, sec.id, docContent).catch(() => {});
                  }

              } catch (e) {
                  console.error(`Failed to generate ${sec.label}`, e);
                  // Mark as error but still save error state
                  setDocGenerationProgress(prev => ({ ...prev, [sec.id]: 'error' }));
                  setGeneratedDocs(prev => ({
                      ...prev,
                      [sec.id]: `
                        <div class="p-6 border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-xl text-red-600 dark:text-red-400">
                            <h3 class="font-bold text-sm mb-2">Generation Skipped</h3>
                            <p class="text-xs">
                                Rate limit exceeded or service busy for this section. You can try regenerating it manually using the AI editor below.
                            </p>
                        </div>
                      `
                  }));
              }
          }

          // Clear current generating doc when done
          setCurrentGeneratingDoc(null);

      } catch (error) {
          console.error("Failed to generate PRD", error);
          handleStepChange('review', 'backward');
          showError('Generation Failed', 'Failed to generate documentation. Please check your API quota or try again later.');
      }
  };

  // Retry generating a single document
  const handleRetryDocument = async (sectionId: string) => {
      const section = DOC_NAV_ITEMS.find(s => s.id === sectionId);
      if (!section) return;

      setCurrentGeneratingDoc(sectionId);
      setDocGenerationProgress(prev => ({ ...prev, [sectionId]: 'generating' }));

      const context = `
        Product: ${productName}
        Description: ${description}
        Refined Vision: ${refinedVision}
        Tags: ${tags}
        ${fileText ? `\nOriginal Document Context:\n${fileText.substring(0, 150000)}` : ''}
      `;

      try {
          const docTd = generateDocSection(section.label, context);

          const res = await generateWithRetry({
              promptTemplate: docTd.templateName,
              promptVariables: docTd.variables,
          });

          const docContent = cleanMarkdown(res.text || '*Error generating content*');
          setGeneratedDocs(prev => ({ ...prev, [sectionId]: docContent }));
          setDocSummaries(prev => ({ ...prev, [sectionId]: extractSectionSummary(docContent) }));
          setDocGenerationProgress(prev => ({ ...prev, [sectionId]: 'completed' }));

          // Fire-and-forget: persist to draft + git
          if (draftSessionId) {
            draftService.syncSection(draftSessionId, sectionId, docContent).catch(() => {});
          }

      } catch (e) {
          console.error(`Failed to retry ${section.label}`, e);
          setDocGenerationProgress(prev => ({ ...prev, [sectionId]: 'error' }));
      } finally {
          setCurrentGeneratingDoc(null);
      }
  };

  const handleGeneratePlan = async () => {
      // 14-category batch execution system
      setIsPlanGenerating(true);
      setLoadingStatus('Loading epic categories configuration...');

      try {
          // 1. Fetch enabled epic categories from backend
          const token = localStorage.getItem('infinia_token');
          const categoriesResp = await fetch('/api/v1/products/epic-categories', {
              headers: { Authorization: `Bearer ${token}` }
          });

          if (!categoriesResp.ok) {
              throw new Error('Failed to load epic categories');
          }

          const categoriesData = await categoriesResp.json();
          const allCategories = categoriesData.data.filter((c: any) => c.is_enabled);

          if (allCategories.length === 0) {
              console.warn('No epic categories enabled, falling back to legacy mode');
              throw new Error('No epic categories enabled');
          }

          setLoadingStatus(`Preparing context for ${allCategories.length} categories...`);

          // 2. Assemble context (full PRD + doc summaries)
          const prdFull = generatedDocs['prd'] || '';
          const otherSummaries = Object.entries(docSummaries)
              .filter(([key]) => key !== 'prd')
              .map(([key, summary]) => `### ${key.toUpperCase()}\n${summary.substring(0, 500)}`)
              .join('\n\n');

          const prdContext = `## FULL PRD\n${prdFull}`;
          const researchCtx = researchReport
              ? formatResearchContext(researchReport as ResearchReportData)
              : undefined;

          // 3. Organize into 5 batches (3 categories each)
          const batches: any[][] = [];
          for (let i = 0; i < allCategories.length; i += 3) {
              batches.push(allCategories.slice(i, i + 3));
          }

          setLoadingStatus(`Executing ${batches.length} batches in parallel (${allCategories.length} categories total)...`);

          let allEpics: any[] = [];
          let epicIdCounter = 0;
          let taskIdCounter = 0;

          // 4. Execute batches sequentially with delays (to avoid rate limits)
          for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
              const batch = batches[batchIdx];
              setLoadingStatus(`Batch ${batchIdx + 1}/${batches.length}: Processing ${batch.map((c: any) => c.display_name).join(', ')}...`);

              // 4a. Execute 3 categories in this batch in parallel
              const batchPromises = batch.map(async (category: any) => {
                  const categoryTd = generateCategoryEpics(
                      category,
                      prdContext,
                      otherSummaries,
                      researchCtx
                  );

                  try {
                      const response = await generateWithRetry({
                          promptTemplate: categoryTd.templateName,
                          promptVariables: categoryTd.variables,
                          config: { responseMimeType: "application/json" }
                      });

                      const text = cleanJson(response.text || '{}');
                      const parsed = JSON.parse(text);

                      if (parsed.epics && Array.isArray(parsed.epics)) {
                          return { category: category.display_name, epics: parsed.epics };
                      }

                      console.warn(`Category ${category.display_name} returned no epics`);
                      return { category: category.display_name, epics: [] };

                  } catch (error) {
                      console.error(`Category ${category.display_name} failed:`, error);
                      return { category: category.display_name, epics: [] };
                  }
              });

              const batchResults = await Promise.all(batchPromises);

              // 4b. Merge batch results into allEpics
              for (const result of batchResults) {
                  for (const epic of result.epics) {
                      allEpics.push({
                          ...epic,
                          category: result.category
                      });
                  }
              }

              // 4c. Delay between batches (5 seconds) to avoid rate limits
              if (batchIdx < batches.length - 1) {
                  setLoadingStatus(`Batch ${batchIdx + 1} complete. Waiting 5s before next batch...`);
                  await new Promise(resolve => setTimeout(resolve, 5000));
              }
          }

          setLoadingStatus(`Processing ${allEpics.length} epics...`);

          // 5. Fallback: If fewer than 5 epics generated, use single-shot legacy approach
          if (allEpics.length < 5) {
              console.warn('Batch execution yielded < 5 epics. Falling back to single-shot generation.');
              setLoadingStatus('Batch execution incomplete. Running fallback generation...');

              const contextToUse = `## FULL PRD\n${prdFull}\n\n## OTHER DOCUMENT SUMMARIES\n${otherSummaries}\n\n## VISION\n${refinedVision}`;
              const planTd = generateProjectPlan(contextToUse, researchCtx);

              const response = await generateWithRetry({
                  promptTemplate: planTd.templateName,
                  promptVariables: planTd.variables,
                  config: { responseMimeType: "application/json" }
              });

              const text = cleanJson(response.text || '[]');
              const parsed = JSON.parse(text);

              let fallbackEpics: any[] = [];
              if (parsed.epics && Array.isArray(parsed.epics)) {
                  fallbackEpics = parsed.epics;
              } else if (Array.isArray(parsed)) {
                  fallbackEpics = parsed;
              }

              console.log('Fallback generated', fallbackEpics.length, 'epics');

              // Merge fallback epics (avoid duplicates by checking titles)
              const existingTitles = new Set(allEpics.map(e => e.title?.toLowerCase() || ''));
              for (const epic of fallbackEpics) {
                  if (!existingTitles.has((epic.title || '').toLowerCase())) {
                      allEpics.push(epic);
                  }
              }
          }

          // 6. Validate and hydrate
          if (allEpics.length === 0) {
              setIsPlanGenerating(false);
              showError('Planning Failed', 'No epics generated. Please try again.');
              return;
          }

          setLoadingStatus(`Building ${allEpics.length} epics and assigning tasks...`);

          const today = new Date();
          const hydratedEpics: GeneratedEpic[] = allEpics.map((epic: any) => {
              const epicId = `epic-${epicIdCounter++}`;

              return {
                  id: epicId,
                  title: epic.title || 'Untitled Epic',
                  description: epic.description || '',
                  tasks: Array.isArray(epic.tasks) ? epic.tasks.map((task: any) => {
                      const getUserForRole = (roleStr: string) => {
                          if (!users || users.length === 0) {
                              return { id: 'unassigned', name: 'Unassigned', avatarUrl: '', email: '' };
                          }
                          const roleLower = (roleStr || '').toLowerCase();
                          if (roleLower.includes('front') || roleLower.includes('ui'))
                              return users.find(u => u.role?.toLowerCase().includes('front')) || users[0];
                          if (roleLower.includes('back') || roleLower.includes('api'))
                              return users.find(u => u.role?.toLowerCase().includes('back')) || users[0];
                          if (roleLower.includes('design'))
                              return users.find(u => u.role?.toLowerCase().includes('design')) || users[0];
                          if (roleLower.includes('devops'))
                              return users.find(u => u.role?.toLowerCase().includes('devops')) || users[0];
                          if (roleLower.includes('qa'))
                              return users.find(u => u.role?.toLowerCase().includes('qa')) || users[0];
                          return users[0];
                      };

                      const assignedUser = getUserForRole(task.role);

                      // Staggered due dates: spread across 30 days
                      const dueDate = new Date(today);
                      dueDate.setDate(today.getDate() + 3 + (taskIdCounter % 30));

                      taskIdCounter++;

                      return {
                          id: `gen-task-${taskIdCounter}`,
                          title: task.title || 'Untitled Task',
                          description: task.description || '',
                          type: task.type || 'task',
                          points: task.points || 3,
                          assigneeId: assignedUser.id,
                          dueDate: dueDate.toISOString().split('T')[0]
                      };
                  }) : []
              };
          });

          setLoadingStatus(`Plan ready: ${hydratedEpics.length} epics, ${taskIdCounter} tasks`);

          setGeneratedEpics(hydratedEpics);
          setIsPlanGenerating(false);
          handleStepChange('planning', 'forward');
          setMessages([]);

          // Fire-and-forget: save planning state
          if (draftSessionId) {
              draftService.updateMeta(draftSessionId, {
                  step: 'planning',
                  epics: hydratedEpics,
              }).catch(() => {});
          }

      } catch (error: any) {
          console.error("Failed to generate plan", error);
          setIsPlanGenerating(false);
          showError('Planning Failed', `Failed to generate project plan: ${error.message}`);
      }
  };

  const handleTaskChange = (epicId: string, taskId: string, field: keyof GeneratedTask, value: any) => {
      setGeneratedEpics(prev => prev.map(epic => {
          if (epic.id !== epicId) return epic;
          return {
              ...epic,
              tasks: epic.tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t)
          };
      }));
  };

  const handleEpicChange = (id: string, field: keyof GeneratedEpic, value: string) => {
      setGeneratedEpics(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleDeleteTask = (epicId: string, taskId: string) => {
      setGeneratedEpics(prev => prev.map(epic => {
          if (epic.id !== epicId) return epic;
          return {
              ...epic,
              tasks: epic.tasks.filter(t => t.id !== taskId)
          };
      }));
  };

  const handleDeleteEpic = (epicId: string) => {
      setGeneratedEpics(prev => prev.filter(e => e.id !== epicId));
  };

  const handleAddTask = (epicId: string) => {
      setGeneratedEpics(prev => prev.map(epic => {
          if (epic.id !== epicId) return epic;
          const newTask: GeneratedTask = {
              id: `manual-${Date.now()}`,
              title: 'New Task',
              type: 'task',
              points: 1,
              assigneeId: users.length > 0 ? users[0].id : 'unassigned',
              dueDate: new Date().toISOString().split('T')[0]
          };
          return { ...epic, tasks: [...epic.tasks, newTask] };
      }));
  };

  const handleAiAddTasks = async (epicId: string) => {
      if (!aiTaskPrompt.trim()) return;
      setIsGeneratingTasks(true);
      const epic = generatedEpics.find(e => e.id === epicId);

      try {
          const taskTd = generateTasksForEpic(
              epic?.title || '',
              aiTaskPrompt,
              fileText ? fileText.substring(0, 10000) : undefined
          );

          const response = await generateWithRetry({
              promptTemplate: taskTd.templateName,
              promptVariables: taskTd.variables,
              config: { responseMimeType: 'application/json' }
          });

          let newTasks: any[] = [];
          try {
              const text = cleanJson(response.text || '[]');
              const parsed = JSON.parse(text);
              if (parsed.tasks && Array.isArray(parsed.tasks)) {
                  newTasks = parsed.tasks;
              } else if (Array.isArray(parsed)) {
                  newTasks = parsed;
              } else if (parsed && typeof parsed === 'object') {
                   const arr = Object.values(parsed).find(v => Array.isArray(v));
                   if (arr) newTasks = arr as any[];
              }
          } catch (e) {
              console.error("Failed to parse AI tasks", e);
          }

          if (newTasks.length > 0) {
              setGeneratedEpics(prev => prev.map(e => {
                  if (e.id !== epicId) return e;
                  const mappedTasks = newTasks.map((t: any, idx: number) => {

                      const getUserForRole = (roleStr: string) => {
                          if (!users || users.length === 0) {
                              return { id: 'unassigned' };
                          }
                          const roleLower = (roleStr || '').toLowerCase();
                          if (roleLower.includes('front') || roleLower.includes('ui')) return users.find(u => u.role?.toLowerCase().includes('front')) || users[0];
                          if (roleLower.includes('back') || roleLower.includes('api')) return users.find(u => u.role?.toLowerCase().includes('back')) || users[0];
                          if (roleLower.includes('design')) return users.find(u => u.role?.toLowerCase().includes('design')) || users[0];
                          return users[0];
                      };

                      const assignedUser = getUserForRole(t.role);

                      return {
                          id: `ai-gen-${Date.now()}-${idx}`,
                          title: t.title || 'Untitled',
                          description: t.description || '',
                          type: t.type || 'task',
                          points: t.points || 2,
                          assigneeId: assignedUser.id,
                          dueDate: new Date().toISOString().split('T')[0]
                      };
                  });
                  return { ...e, tasks: [...e.tasks, ...mappedTasks] };
              }));
          }
          setAiTaskPrompt('');
          setAiPromptEpicId(null);
      } catch (error) {
          console.error("Failed to generate tasks", error);
      } finally {
          setIsGeneratingTasks(false);
      }
  };

  const handleOpenTaskDetail = (epic: GeneratedEpic, task: GeneratedTask) => {
      setActiveEpicId(epic.id);

      const safeUser = users.find(u => u.id === task.assigneeId) || (users.length > 0 ? users[0] : { id: 'unassigned', name: 'Unassigned', avatarUrl: '', email: '' } as UserType);

      let desc = task.description;
      if (!desc) {
          desc = `<h3>Context</h3><p>This task is part of the epic <strong>${epic.title}</strong>.</p>`;
      }
      const fullTask: Task = {
          id: task.id,
          title: task.title,
          description: desc,
          columnId: 'todo',
          type: task.type,
          priority: 'MEDIUM',
          points: task.points,
          assignee: safeUser,
          tags: [{ label: 'Planned', color: 'blue' }],
          commentsCount: 0,
          productTheme: 'Feature',
          dueDate: task.dueDate,
          projectId: 'temp-project-id',
          reporter: safeUser
      };
      setSelectedTaskForDetail(fullTask);
  };

  const handleTaskUpdateFromModal = (updatedTask: Task) => {
      if (!activeEpicId) return;
      setGeneratedEpics(prev => prev.map(epic => {
          if (epic.id !== activeEpicId) return epic;
          return {
              ...epic,
              tasks: epic.tasks.map(t => {
                  if (t.id !== updatedTask.id) return t;
                  return {
                      ...t,
                      title: updatedTask.title,
                      description: updatedTask.description,
                      points: updatedTask.points || t.points,
                      assigneeId: updatedTask.assignee.id,
                      dueDate: updatedTask.dueDate || t.dueDate
                  };
              })
          };
      }));
      setSelectedTaskForDetail(updatedTask);
  };

  const handleFinalize = async () => {
      setStep('creating_project');
      setCreationProgress(0);
      setCreationJob(null);

      const projectCode = productName.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PROJ';

      const input = {
          name: productName,
          code: projectCode,
          description: description,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          vision: refinedVision,
          draftSessionId,
          docs: { ...generatedDocs },
          epics: generatedEpics.map(e => ({
              title: e.title,
              description: e.description,
              tasks: e.tasks.map(t => ({
                  title: t.title,
                  description: t.description,
                  type: t.type,
                  points: t.points,
                  assigneeId: t.assigneeId,
              })),
          })),
          team: selectedTeam,
          startDate,
          dueDate: targetDate,
          ownerId,
          repoMode,
          gitProviderId: selectedGitConnection?.provider_id || null,
          gitRepoOwner: selectedGitRepo?.owner.login || null,
          gitRepoName: selectedGitRepo?.name || null,
          gitDocsPath,
          gitBranchStrategy,
      };

      try {
          const { jobId } = await productGeneratorService.startCreation(input);

          // Try SSE stream first
          let sseWorked = false;
          const unsubscribe = productGeneratorService.subscribeToStream(
              jobId,
              (status) => {
                  sseWorked = true;
                  setCreationJob(status);
                  setCreationProgress(status.progress);

                  if (status.status === 'completed') {
                      setCreationProgress(100);
                      // Cleanup draft
                      if (draftSessionId) draftService.deleteDraft(draftSessionId).catch(() => {});
                      // Refresh project list after short delay
                      setTimeout(async () => {
                          await refreshData();
                          onClose();
                      }, 1500);
                  }
              },
              (err) => {
                  console.warn('[ProductGenerator] SSE failed, falling back to polling:', err.message);
                  // Fall back to polling
                  if (!sseWorked) {
                      startPolling(jobId);
                  }
              }
          );

          // Safety: if SSE doesn't deliver within 3s, start polling
          setTimeout(() => {
              if (!sseWorked) {
                  unsubscribe();
                  startPolling(jobId);
              }
          }, 3000);
      } catch (err: any) {
          showError(err.message || 'Failed to create product');
          setStep('planning');
      }
  };

  const startPolling = (jobId: string) => {
      const pollInterval = setInterval(async () => {
          try {
              const status = await productGeneratorService.getStatus(jobId);
              setCreationJob(status);
              setCreationProgress(status.progress);

              if (status.status === 'completed' || status.status === 'failed') {
                  clearInterval(pollInterval);

                  if (status.status === 'completed') {
                      setCreationProgress(100);
                      if (draftSessionId) draftService.deleteDraft(draftSessionId).catch(() => {});
                      setTimeout(async () => {
                          await refreshData();
                          onClose();
                      }, 1500);
                  } else if (status.status === 'failed') {
                      showError(status.error || 'Product creation failed');
                  }
              }
          } catch {
              clearInterval(pollInterval);
          }
      }, 1000);
  };

  const toggleSuggestion = (id: string) => {
      const suggestion = suggestions.find(s => s.id === id);
      if (!suggestion) return;

      const isSelecting = !suggestion.selected;

      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, selected: isSelecting } : s));

      const suggestionBlock = `\n\n[${suggestion.type.toUpperCase()}]: ${suggestion.title}\n${suggestion.description}`;

      if (isSelecting) {
          setRefinedVision(prev => prev + suggestionBlock);
      } else {
          setRefinedVision(prev => prev.replace(suggestionBlock, '').trim());
      }
  };

  const handleChatSubmit = async () => {
      if (!chatInput.trim()) return;
      const userMsg = chatInput;
      setChatInput('');
      setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setIsAiLoading(true);

      try {
          if (step === 'review') {
              const visionTd = refineVision(refinedVision, userMsg);
              const res = await generateWithRetry({
                  promptTemplate: visionTd.templateName,
                  promptVariables: visionTd.variables,
              });
              setRefinedVision(res.text || refinedVision);
              setMessages(prev => [...prev, { role: 'ai', text: "Vision updated." }]);
          }
          else if (step === 'prd_view') {
              const currentContent = generatedDocs[activeDocSection] || '';
              const sectionName = DOC_NAV_ITEMS.find(d => d.id === activeDocSection)?.label || 'Document';
              const editTd = editDocSection(sectionName, currentContent, userMsg);
              const res = await generateWithRetry({
                  promptTemplate: editTd.templateName,
                  promptVariables: editTd.variables,
              });

              if (res.text) {
                  setGeneratedDocs(prev => ({ ...prev, [activeDocSection]: cleanMarkdown(res.text) }));
                  setMessages(prev => [...prev, { role: 'ai', text: `Updated ${sectionName}.` }]);
              }
          }
          else if (step === 'planning') {
              const epicsJson = JSON.stringify(generatedEpics.map(e => ({ title: e.title, tasks: e.tasks.map(t => ({ title: t.title, type: t.type, points: t.points })) })));
              const planEditTd = editPlanStructure(epicsJson, userMsg);
              const res = await generateWithRetry({
                  promptTemplate: planEditTd.templateName,
                  promptVariables: planEditTd.variables,
                  config: { responseMimeType: 'application/json' }
              });

              const jsonText = cleanJson(res.text || '[]');
              const parsed = JSON.parse(jsonText);

              if (Array.isArray(parsed)) {
                  const newEpics = parsed.map((e: any, i: number) => ({
                      id: generatedEpics[i]?.id || `epic-${Date.now()}-${i}`,
                      title: e.title,
                      description: e.description || generatedEpics[i]?.description || '',
                      tasks: e.tasks ? e.tasks.map((t: any, j: number) => ({
                          id: generatedEpics[i]?.tasks[j]?.id || `task-${Date.now()}-${i}-${j}`,
                          title: t.title,
                          description: t.description || '',
                          type: t.type || 'task',
                          points: t.points || 1,
                          assigneeId: generatedEpics[i]?.tasks[j]?.assigneeId || (users[0]?.id || 'unassigned'),
                          dueDate: generatedEpics[i]?.tasks[j]?.dueDate || new Date().toISOString()
                      })) : []
                  }));
                  setGeneratedEpics(newEpics);
                  setMessages(prev => [...prev, { role: 'ai', text: "Plan updated." }]);
              }
          }

      } catch (e) {
          console.error(e);
          setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I couldn't process that request." }]);
      } finally {
          setIsAiLoading(false);
      }
  };

  // Document editing is now handled via DocumentsView's markdown editor

  if (!isOpen) return null;

  const currentStepIndex = getCurrentStepIndex();

  // Stepper Component with progress line and backward navigation
  const StepIndicator = () => {
    const progressPercent = (currentStepIndex / (STEPS.length - 1)) * 100;

    return (
      <div className="border-b border-gray-100 dark:border-[#1F2128] bg-gray-50/50 dark:bg-[#0B0C0E]/50">
        {/* Desktop Stepper */}
        <div className="hidden md:flex items-center justify-center gap-2 py-4 px-6 relative">
          {/* Progress Line Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {STEPS.map((s, idx) => {
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            const Icon = s.icon;
            const canNavigate = isCompleted && !isTransitioning;
            const targetStep = s.id as typeof step;

            return (
              <React.Fragment key={s.id}>
                <div
                  onClick={() => canNavigate && handleStepChange(targetStep, 'backward')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 relative z-10 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 animate-progressPulse'
                      : isCompleted
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 cursor-pointer hover:scale-105 hover:shadow-md'
                        : 'bg-gray-100 dark:bg-[#1F2128] text-gray-400 dark:text-gray-500'
                  }`}
                  title={canNavigate ? `Go back to ${s.label}` : undefined}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isActive ? 'bg-white/20' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
                  }`}>
                    {isCompleted ? <Check size={12} /> : idx + 1}
                  </div>
                  <Icon size={14} />
                  <span className="text-xs font-bold uppercase tracking-wide">{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <ChevronRight size={16} className={`relative z-10 transition-colors duration-300 ${idx < currentStepIndex ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Document generation progress — below the Documents timeline tag */}
        {(step === 'prd_view' || step === 'generating_docs') && Object.values(docGenerationProgress).some(s => s === 'generating' || s === 'pending') && (
          <div className="hidden md:flex items-center justify-center gap-3 pb-3 px-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/15 rounded-full">
              <Loader2 size={10} className="animate-spin text-blue-500" />
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                {new Set([
                  ...Object.entries(docGenerationProgress).filter(([,s]) => s === 'completed').map(([k]) => k),
                  ...Object.keys(generatedDocs)
                ]).size}/{DOC_NAV_ITEMS.length} docs
              </span>
            </div>
            <div className="flex gap-0.5 w-48">
              {DOC_NAV_ITEMS.map(doc => {
                const done = docGenerationProgress[doc.id] === 'completed' || !!generatedDocs[doc.id];
                const active = docGenerationProgress[doc.id] === 'generating' || currentGeneratingDoc === doc.id;
                const err = docGenerationProgress[doc.id] === 'error';
                return (
                  <div key={doc.id} className={`h-1.5 flex-1 rounded-full transition-all ${
                    done ? 'bg-green-500' : active ? 'bg-blue-500 animate-pulse' : err ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`} title={doc.label} />
                );
              })}
            </div>
          </div>
        )}

        {/* Plan generation progress — below Documents timeline tag */}
        {step === 'prd_view' && isPlanGenerating && (
          <div className="hidden md:flex items-center justify-center gap-3 pb-3 px-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/15 rounded-full">
              <Loader2 size={10} className="animate-spin text-indigo-500" />
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                {loadingStatus || 'Generating plan...'}
              </span>
            </div>
          </div>
        )}

        {/* Mobile Stepper - Compact dots */}
        <div className="md:hidden flex items-center justify-center gap-2 py-3 px-6">
          {STEPS.map((s, idx) => {
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            return (
              <div
                key={s.id}
                className={`h-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'w-8 bg-blue-600'
                    : isCompleted
                      ? 'w-2 bg-green-500'
                      : 'w-2 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            );
          })}
          <span className="ml-3 text-xs font-bold text-gray-500 dark:text-gray-400">
            {STEPS[currentStepIndex]?.label}
          </span>
        </div>
      </div>
    );
  };

  // Step Summary Component - shows context from previous steps
  const StepSummary = ({ stepName, onEdit, children }: { stepName: string; onEdit: () => void; children: React.ReactNode }) => (
    <div className="bg-gray-50 dark:bg-[#0B0C0E] rounded-xl p-3 mb-4 border border-gray-100 dark:border-[#1F2128]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
          <Check size={10} className="text-green-500" />
          From: {stepName}
        </span>
        <button
          onClick={onEdit}
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline flex items-center gap-1"
        >
          <Edit3 size={10} /> Edit
        </button>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300">{children}</div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-[#12141A] animate-in fade-in duration-200">
        <div className="bg-white dark:bg-[#12141A] w-full overflow-hidden flex flex-col flex-1 min-h-0">

            {/* Header */}
            {step !== 'creating_project' && (
            <div className="px-8 py-5 border-b border-gray-200 dark:border-[#1F2128] flex justify-between items-center bg-white dark:bg-[#15171E] z-10 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-sm font-medium transition-colors">
                        <ArrowLeft size={16} />
                        <span>Back</span>
                    </button>
                    <div className="h-6 w-px bg-gray-200 dark:bg-[#2D2F36]"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[#172B4D] dark:text-white">Product Architect</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {productName ? productName : 'AI-powered product creation'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Step Indicator - Show on review/prd_view/planning */}
            {(step === 'review' || step === 'prd_view' || step === 'planning') && <StepIndicator />}

            {/* Content Body */}
            <div className="flex-1 overflow-hidden relative flex flex-col min-h-0">

                {/* Step 1: Input & Metadata */}
                {step === 'input' && (
                    <div className={`p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar max-w-3xl mx-auto w-full ${
                      isTransitioning ? 'opacity-0' : transitionDirection === 'forward' ? 'animate-slideInFromRight' : 'animate-slideInFromLeft'
                    }`}>
                        {/* Draft Resume Banner */}
                        {resumableDraft && (
                          <div className="flex items-center justify-between gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 min-w-0">
                              <RefreshCw size={16} className="flex-shrink-0" />
                              <span className="truncate">
                                In-progress draft: <strong>{resumableDraft.product_name}</strong> ({Object.keys(resumableDraft.sections).length} docs)
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={handleResumeDraft}
                                disabled={isResumingDraft}
                                className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                              >
                                {isResumingDraft ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                                Resume
                              </button>
                              <button
                                onClick={handleDismissDraft}
                                className="px-3 py-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Input Type Toggle */}
                        <div className="flex p-1 bg-gray-100 dark:bg-[#0B0C0E] rounded-xl">
                            <button
                                onClick={() => setInputMode('scratch')}
                                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${inputMode === 'scratch' ? 'bg-white dark:bg-[#1F2128] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                            >
                                <Wand2 size={16} /> From Scratch
                            </button>
                            <button
                                onClick={() => setInputMode('import')}
                                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${inputMode === 'import' ? 'bg-white dark:bg-[#1F2128] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                            >
                                <FileText size={16} /> Import Document
                            </button>
                        </div>

                        {inputMode === 'scratch' ? (
                            <div className="space-y-5">
                                {/* Product Header Row */}
                                <div className="flex gap-4">
                                    {/* Logo Upload */}
                                    <div
                                        onClick={() => productImageInputRef.current?.click()}
                                        className="w-20 h-20 rounded-xl bg-gray-50 dark:bg-[#0B0C0E] border-2 border-dashed border-gray-200 dark:border-[#2D2F36] flex items-center justify-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group overflow-hidden flex-shrink-0"
                                    >
                                        <input
                                            type="file"
                                            ref={productImageInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleProductImageUpload}
                                        />
                                        {productImage ? (
                                            <img src={productImage} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-0.5 text-gray-400 group-hover:text-blue-500 transition-colors">
                                                <ImageIcon size={20} />
                                                <span className="text-[9px] font-bold uppercase">Logo</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Name */}
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Product Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Nexus Analytics"
                                            value={productName}
                                            onChange={(e) => setProductName(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl px-4 py-3 text-sm text-[#172B4D] dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Elevator Pitch</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Describe your product in 1-2 sentences..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl px-4 py-3 text-sm text-[#172B4D] dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
                                    />
                                </div>

                                {/* Tags */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Tags</label>
                                    <input
                                        type="text"
                                        placeholder="AI, SaaS, B2B..."
                                        value={tags}
                                        onChange={(e) => setTags(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl px-4 py-3 text-sm text-[#172B4D] dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>

                                {/* AI Web Research Toggle */}
                                {researchAvailable && (
                                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 border border-purple-200 dark:border-purple-800/30 rounded-xl">
                                        <div className="flex items-center gap-2.5">
                                            <Globe size={16} className="text-purple-500" />
                                            <div>
                                                <span className="text-sm font-medium text-[#172B4D] dark:text-white">AI Web Research</span>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400">Search competitors, market trends & insights</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setResearchEnabled(!researchEnabled)}
                                            className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                                                researchEnabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-700'
                                            }`}
                                        >
                                            <div
                                                className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                                                    researchEnabled ? 'translate-x-5' : 'translate-x-0.5'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                )}

                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    {/* Timeline */}
                                    <div className="space-y-3 p-4 bg-gray-50 dark:bg-[#0B0C0E] rounded-xl border border-gray-100 dark:border-[#1F2128]">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Calendar size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Timeline</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <span className="text-[9px] text-gray-400 block mb-1">Start</span>
                                                <input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-2.5 py-1.5 text-xs text-[#172B4D] dark:text-gray-200"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-gray-400 block mb-1">Target</span>
                                                <input
                                                    type="date"
                                                    value={targetDate}
                                                    onChange={(e) => setTargetDate(e.target.value)}
                                                    className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-2.5 py-1.5 text-xs text-[#172B4D] dark:text-gray-200"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Owner */}
                                    <div className="space-y-3 p-4 bg-gray-50 dark:bg-[#0B0C0E] rounded-xl border border-gray-100 dark:border-[#1F2128]">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <User size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Owner</span>
                                        </div>
                                        <select
                                            value={ownerId}
                                            onChange={(e) => setOwnerId(e.target.value)}
                                            className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-3 py-2 text-xs text-[#172B4D] dark:text-gray-200 appearance-none cursor-pointer"
                                        >
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Team Selection */}
                                <div className="space-y-3 p-4 bg-gray-50 dark:bg-[#0B0C0E] rounded-xl border border-gray-100 dark:border-[#1F2128]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Users size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Team</span>
                                        </div>
                                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">{selectedTeam.length} selected</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {users.map(u => (
                                            <button
                                                key={u.id}
                                                onClick={() => toggleTeamMember(u.id)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedTeam.includes(u.id) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20' : 'bg-white dark:bg-[#15171E] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2D2F36] hover:border-blue-300'}`}
                                            >
                                                <img src={u.avatarUrl} className="w-4 h-4 rounded-full" alt={u.name} />
                                                {u.name.split(' ')[0]}
                                                {selectedTeam.includes(u.id) && <Check size={12} className="text-blue-600" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Documentation Storage (Git) - Inline */}
                                <div className="space-y-3 p-4 bg-gray-50 dark:bg-[#0B0C0E] rounded-xl border border-gray-100 dark:border-[#1F2128]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <GitBranch size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Documentation Storage</span>
                                        </div>
                                        <span className={`text-[10px] font-medium ${repoMode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>{repoMode ? 'Required' : 'Optional'}</span>
                                    </div>
                                    <p className="text-[11px] text-gray-400">
                                        {gitConnections.length > 0
                                            ? 'Choose how product docs are stored in Git.'
                                            : 'Connect a Git provider in Settings to enable doc storage.'}
                                    </p>

                                    {gitConnections.length > 0 && (
                                        <>
                                            {/* Mode Selector */}
                                            <div className="grid grid-cols-3 gap-2">
                                                {([
                                                    { mode: 'shared' as const, icon: Building2, label: 'Shared Docs Repo', desc: 'Company-wide repo, project folder' },
                                                    { mode: 'dedicated' as const, icon: BookOpen, label: 'Dedicated Repo', desc: 'Standalone docs repository' },
                                                    { mode: 'code' as const, icon: Code2, label: 'Code Repository', desc: 'Docs alongside source code' },
                                                ]).map(opt => (
                                                    <button
                                                        key={opt.mode}
                                                        type="button"
                                                        onClick={() => handleRepoModeToggle(opt.mode)}
                                                        className={`p-3 text-left rounded-lg border transition-all ${
                                                            repoMode === opt.mode
                                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500/30'
                                                                : 'border-gray-200 dark:border-[#2D2F36] hover:border-blue-300 hover:bg-white dark:hover:bg-[#15171E]'
                                                        }`}
                                                    >
                                                        <opt.icon size={16} className={`mb-1.5 ${repoMode === opt.mode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                                                        <div className={`text-xs font-bold ${repoMode === opt.mode ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>{opt.label}</div>
                                                        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{opt.desc}</p>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Expanded Repo Picker (when mode selected) */}
                                            {repoMode && (
                                                <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-[#1F2128] mt-2">
                                                    {/* Git Provider */}
                                                    {gitConnections.length > 1 && (
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Provider</label>
                                                            <div className="flex gap-1.5 flex-wrap">
                                                                {gitConnections.map(conn => (
                                                                    <button
                                                                        key={conn.id}
                                                                        type="button"
                                                                        onClick={() => setSelectedGitConnection(conn)}
                                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                                                            selectedGitConnection?.id === conn.id
                                                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                                                : 'border-gray-200 dark:border-[#2D2F36] hover:bg-white dark:hover:bg-[#15171E] text-gray-600 dark:text-gray-400'
                                                                        }`}
                                                                    >
                                                                        <GitBranch size={12} />
                                                                        {conn.provider_display_name}
                                                                        <span className="text-gray-400">@{conn.provider_username}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Repo Search + List */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Repository</label>
                                                            {gitCapabilities?.create_repo !== false ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowCreateRepo(!showCreateRepo)}
                                                                    className="text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
                                                                >
                                                                    <Plus size={12} /> Create New
                                                                </button>
                                                            ) : (
                                                                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium" title={gitCapabilitiesHint || ''}>
                                                                    Create not available
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Capabilities hint */}
                                                        {gitCapabilities?.create_repo === false && gitCapabilitiesHint && (
                                                            <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                                                                <p className="text-[10px] text-amber-700 dark:text-amber-400">{gitCapabilitiesHint}</p>
                                                            </div>
                                                        )}

                                                        {/* Create Repo Inline Form */}
                                                        {showCreateRepo && gitCapabilities?.create_repo !== false && (
                                                            <div className="mb-2 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-lg space-y-2">
                                                                <input
                                                                    type="text"
                                                                    value={newRepoName}
                                                                    onChange={(e) => setNewRepoName(e.target.value)}
                                                                    placeholder="Repository name..."
                                                                    className="w-full px-3 py-2 text-xs bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
                                                                />
                                                                <div className="flex items-center justify-between">
                                                                    <label className="flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={newRepoPrivate}
                                                                            onChange={(e) => setNewRepoPrivate(e.target.checked)}
                                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                        />
                                                                        <Lock size={10} /> Private
                                                                    </label>
                                                                    <div className="flex gap-1.5">
                                                                        <button type="button" onClick={() => { setShowCreateRepo(false); setNewRepoName(''); }}
                                                                            className="px-2.5 py-1 text-[10px] font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded transition-colors">
                                                                            Cancel
                                                                        </button>
                                                                        <button type="button" onClick={handleCreateRepo}
                                                                            disabled={!newRepoName.trim() || creatingRepo}
                                                                            className="px-3 py-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors">
                                                                            {creatingRepo ? <RefreshCw size={10} className="animate-spin" /> : <Plus size={10} />}
                                                                            {creatingRepo ? 'Creating...' : 'Create'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="relative mb-2">
                                                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                            <input
                                                                type="text"
                                                                value={gitRepoSearch}
                                                                onChange={(e) => setGitRepoSearch(e.target.value)}
                                                                placeholder="Search repositories..."
                                                                className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
                                                            />
                                                        </div>
                                                        {loadingGitRepos ? (
                                                            <div className="flex items-center justify-center py-6">
                                                                <RefreshCw size={16} className="animate-spin text-blue-500" />
                                                            </div>
                                                        ) : (
                                                            <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-[#2D2F36] rounded-lg divide-y divide-gray-100 dark:divide-[#1F2128]">
                                                                {gitRepos
                                                                    .filter(r => r.full_name.toLowerCase().includes(gitRepoSearch.toLowerCase()) || r.description?.toLowerCase().includes(gitRepoSearch.toLowerCase()))
                                                                    .length === 0 ? (
                                                                    <div className="p-3 text-center text-[11px] text-gray-400">
                                                                        {gitRepoSearch ? 'No repositories found' : 'No writable repositories'}
                                                                    </div>
                                                                ) : (
                                                                    gitRepos
                                                                        .filter(r => r.full_name.toLowerCase().includes(gitRepoSearch.toLowerCase()) || r.description?.toLowerCase().includes(gitRepoSearch.toLowerCase()))
                                                                        .map(repo => (
                                                                        <button
                                                                            key={repo.id}
                                                                            type="button"
                                                                            onClick={() => setSelectedGitRepo(repo)}
                                                                            className={`w-full flex items-start gap-2 p-2.5 text-left hover:bg-gray-50 dark:hover:bg-[#15171E] transition-colors ${
                                                                                selectedGitRepo?.id === repo.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                                                            }`}
                                                                        >
                                                                            <div className="mt-0.5">
                                                                                {repo.private ? <Lock size={12} className="text-gray-400" /> : <Globe size={12} className="text-gray-400" />}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="text-xs font-medium text-gray-900 dark:text-white truncate">{repo.full_name}</span>
                                                                                    {selectedGitRepo?.id === repo.id && (
                                                                                        <Check size={12} className="text-blue-600 flex-shrink-0" />
                                                                                    )}
                                                                                </div>
                                                                                {repo.description && <p className="text-[10px] text-gray-400 truncate mt-0.5">{repo.description}</p>}
                                                                            </div>
                                                                        </button>
                                                                    ))
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Amber warning when mode selected but no repo */}
                                                    {repoMode && !selectedGitRepo && !loadingGitRepos && (
                                                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 text-amber-700 dark:text-amber-400 text-[11px]">
                                                            <AlertTriangle size={14} className="flex-shrink-0" />
                                                            <span>Select a repository to continue, or deselect the storage mode above.</span>
                                                        </div>
                                                    )}

                                                    {/* Docs Path + Sync Strategy (shown when repo selected) */}
                                                    {selectedGitRepo && (
                                                        <>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Docs Path</label>
                                                                <div className="relative">
                                                                    <Folder size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                                    <input
                                                                        type="text"
                                                                        value={gitDocsPath}
                                                                        onChange={(e) => setGitDocsPath(e.target.value)}
                                                                        placeholder="docs/"
                                                                        className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-gray-700 dark:text-gray-200"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Sync Strategy</label>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setGitBranchStrategy('direct')}
                                                                        className={`p-2 text-left rounded-lg border transition-colors ${
                                                                            gitBranchStrategy === 'direct'
                                                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                                                : 'border-gray-200 dark:border-[#2D2F36] hover:bg-white dark:hover:bg-[#15171E]'
                                                                        }`}
                                                                    >
                                                                        <div className="text-xs font-bold text-gray-700 dark:text-gray-200">Direct Push</div>
                                                                        <p className="text-[10px] text-gray-400 mt-0.5">Push to default branch</p>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setGitBranchStrategy('pr')}
                                                                        className={`p-2 text-left rounded-lg border transition-colors ${
                                                                            gitBranchStrategy === 'pr'
                                                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                                                : 'border-gray-200 dark:border-[#2D2F36] hover:bg-white dark:hover:bg-[#15171E]'
                                                                        }`}
                                                                    >
                                                                        <div className="text-xs font-bold text-gray-700 dark:text-gray-200">Pull Request</div>
                                                                        <p className="text-[10px] text-gray-400 mt-0.5">Create PRs for review</p>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* File Upload */}
                                <div
                                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${uploadedFile ? 'border-green-400 bg-green-50/50 dark:bg-green-900/10' : 'border-gray-200 dark:border-[#2D2F36] hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'}`}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".pdf,.txt,.md,.doc,.docx,.csv,.json,.js,.jsx,.ts,.tsx,.html,.css,.xml,.yml,.yaml"
                                        onChange={handleFileUpload}
                                    />
                                    {isExtracting ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 size={32} className="animate-spin text-blue-500" />
                                            <p className="text-sm font-medium text-gray-500">Extracting content...</p>
                                        </div>
                                    ) : uploadedFile ? (
                                        <>
                                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center mb-2">
                                                <FileIcon size={24} />
                                            </div>
                                            <h3 className="font-bold text-[#172B4D] dark:text-white text-sm">{uploadedFile.name}</h3>
                                            <p className="text-xs text-gray-500 mt-1">Click to replace</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl flex items-center justify-center mb-2">
                                                <UploadCloud size={24} />
                                            </div>
                                            <h3 className="font-semibold text-[#172B4D] dark:text-white text-sm">Upload Document</h3>
                                            <p className="text-xs text-gray-500 mt-1 max-w-xs">
                                                PDF, DOCX, TXT, MD, or code files
                                            </p>
                                        </>
                                    )}
                                </div>

                                {/* Meta Details Section */}
                                <div className="border-t border-gray-100 dark:border-[#1F2128] pt-4">
                                    <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-3 flex items-center gap-2">
                                        <Settings size={12} />
                                        Optional Meta Details
                                    </h4>

                                    {/* Product Name & Logo Row */}
                                    <div className="flex gap-3 mb-3">
                                        <div
                                            onClick={() => productImageInputRef.current?.click()}
                                            className="w-16 h-16 rounded-xl bg-gray-50 dark:bg-[#0B0C0E] border-2 border-dashed border-gray-200 dark:border-[#2D2F36] flex items-center justify-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group overflow-hidden flex-shrink-0"
                                        >
                                            {productImage ? (
                                                <img src={productImage} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-0.5 text-gray-400 group-hover:text-blue-500 transition-colors">
                                                    <ImageIcon size={16} />
                                                    <span className="text-[8px] font-bold uppercase">Logo</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Product Name</label>
                                            <input
                                                type="text"
                                                placeholder="Auto-extracted from document..."
                                                value={productName}
                                                onChange={(e) => setProductName(e.target.value)}
                                                className="w-full mt-1 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    <div className="mb-3">
                                        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Tags</label>
                                        <input
                                            type="text"
                                            placeholder="AI, SaaS, B2B..."
                                            value={tags}
                                            onChange={(e) => setTags(e.target.value)}
                                            className="w-full mt-1 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>

                                    {/* AI Web Research Toggle */}
                                    {researchAvailable && (
                                        <div className="flex items-center justify-between p-2.5 mb-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 border border-purple-200 dark:border-purple-800/30 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <Globe size={14} className="text-purple-500" />
                                                <div>
                                                    <span className="text-xs font-medium text-[#172B4D] dark:text-white">AI Web Research</span>
                                                    <p className="text-[9px] text-gray-500 dark:text-gray-400">Search competitors & market trends</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setResearchEnabled(!researchEnabled)}
                                                className={`w-9 h-[18px] rounded-full transition-colors flex-shrink-0 ${
                                                    researchEnabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-700'
                                                }`}
                                            >
                                                <div
                                                    className={`w-3.5 h-3.5 bg-white rounded-full shadow transform transition-transform ${
                                                        researchEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                                                    }`}
                                                />
                                            </button>
                                        </div>
                                    )}

                                    {/* Timeline & Owner Row */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2 p-3 bg-gray-50 dark:bg-[#0B0C0E] rounded-lg border border-gray-100 dark:border-[#1F2128]">
                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                <Calendar size={12} />
                                                <span className="text-[9px] font-bold uppercase tracking-wider">Timeline</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <span className="text-[8px] text-gray-400 block mb-0.5">Start</span>
                                                    <input
                                                        type="date"
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                        className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded px-2 py-1 text-[10px] text-[#172B4D] dark:text-gray-200"
                                                    />
                                                </div>
                                                <div>
                                                    <span className="text-[8px] text-gray-400 block mb-0.5">Target</span>
                                                    <input
                                                        type="date"
                                                        value={targetDate}
                                                        onChange={(e) => setTargetDate(e.target.value)}
                                                        className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded px-2 py-1 text-[10px] text-[#172B4D] dark:text-gray-200"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2 p-3 bg-gray-50 dark:bg-[#0B0C0E] rounded-lg border border-gray-100 dark:border-[#1F2128]">
                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                <User size={12} />
                                                <span className="text-[9px] font-bold uppercase tracking-wider">Owner</span>
                                            </div>
                                            <select
                                                value={ownerId}
                                                onChange={(e) => setOwnerId(e.target.value)}
                                                className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded px-2 py-1.5 text-xs text-[#172B4D] dark:text-gray-200"
                                            >
                                                <option value="">Select owner...</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Team Selection */}
                                    <div className="mt-3 p-3 bg-gray-50 dark:bg-[#0B0C0E] rounded-lg border border-gray-100 dark:border-[#1F2128]">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                <Users size={12} />
                                                <span className="text-[9px] font-bold uppercase tracking-wider">Team Members</span>
                                            </div>
                                            <span className="text-[9px] text-blue-600 dark:text-blue-400 font-medium">{selectedTeam.length} selected</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mb-2">AI will auto-assign tasks based on roles</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {users.map(u => (
                                                <button
                                                    key={u.id}
                                                    onClick={() => toggleTeamMember(u.id)}
                                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium transition-all ${selectedTeam.includes(u.id) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20' : 'bg-white dark:bg-[#15171E] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2D2F36] hover:border-blue-300'}`}
                                                >
                                                    <img src={u.avatarUrl} className="w-3.5 h-3.5 rounded-full" alt={u.name} />
                                                    {u.name.split(' ')[0]}
                                                    {selectedTeam.includes(u.id) && <Check size={10} className="text-blue-600" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Documentation Storage (Git) - Inline */}
                                    <div className="mt-3 p-3 bg-gray-50 dark:bg-[#0B0C0E] rounded-lg border border-gray-100 dark:border-[#1F2128]">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                <GitBranch size={12} />
                                                <span className="text-[9px] font-bold uppercase tracking-wider">Doc Storage</span>
                                            </div>
                                            <span className={`text-[9px] font-medium ${repoMode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>{repoMode ? 'Required' : 'Optional'}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mb-2">
                                            {gitConnections.length > 0 ? 'Choose how docs are stored in Git' : 'Connect Git in Settings to enable'}
                                        </p>

                                        {gitConnections.length > 0 && (
                                            <>
                                                <div className="grid grid-cols-3 gap-1.5">
                                                    {([
                                                        { mode: 'shared' as const, icon: Building2, label: 'Shared Repo', desc: 'Company-wide' },
                                                        { mode: 'dedicated' as const, icon: BookOpen, label: 'Dedicated', desc: 'Standalone repo' },
                                                        { mode: 'code' as const, icon: Code2, label: 'Code Repo', desc: 'With source' },
                                                    ]).map(opt => (
                                                        <button
                                                            key={opt.mode}
                                                            type="button"
                                                            onClick={() => handleRepoModeToggle(opt.mode)}
                                                            className={`p-2 text-left rounded-lg border transition-all ${
                                                                repoMode === opt.mode
                                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500/30'
                                                                    : 'border-gray-200 dark:border-[#2D2F36] hover:border-blue-300 hover:bg-white dark:hover:bg-[#15171E]'
                                                            }`}
                                                        >
                                                            <opt.icon size={14} className={`mb-1 ${repoMode === opt.mode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                                                            <div className={`text-[10px] font-bold ${repoMode === opt.mode ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>{opt.label}</div>
                                                            <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">{opt.desc}</p>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Expanded inline repo picker */}
                                                {repoMode && (
                                                    <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-[#1F2128] mt-2">
                                                        {gitConnections.length > 1 && (
                                                            <div className="flex gap-1 flex-wrap">
                                                                {gitConnections.map(conn => (
                                                                    <button key={conn.id} type="button" onClick={() => setSelectedGitConnection(conn)}
                                                                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                                                                            selectedGitConnection?.id === conn.id
                                                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                                                : 'border-gray-200 dark:border-[#2D2F36] text-gray-500'
                                                                        }`}
                                                                    >
                                                                        <GitBranch size={10} /> {conn.provider_display_name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Repo</span>
                                                            {gitCapabilities?.create_repo !== false ? (
                                                                <button type="button" onClick={() => setShowCreateRepo(!showCreateRepo)}
                                                                    className="text-[9px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-0.5">
                                                                    <Plus size={10} /> New
                                                                </button>
                                                            ) : (
                                                                <span className="text-[8px] text-amber-600 dark:text-amber-400" title={gitCapabilitiesHint || ''}>
                                                                    Create N/A
                                                                </span>
                                                            )}
                                                        </div>
                                                        {gitCapabilities?.create_repo === false && gitCapabilitiesHint && (
                                                            <div className="mb-1.5 p-1.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded">
                                                                <p className="text-[9px] text-amber-700 dark:text-amber-400 leading-tight">{gitCapabilitiesHint}</p>
                                                            </div>
                                                        )}
                                                        {showCreateRepo && gitCapabilities?.create_repo !== false && (
                                                            <div className="mb-1.5 p-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-lg space-y-1.5">
                                                                <input type="text" value={newRepoName} onChange={(e) => setNewRepoName(e.target.value)}
                                                                    placeholder="Repo name..." className="w-full px-2 py-1.5 text-[10px] bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-400" />
                                                                <div className="flex items-center justify-between">
                                                                    <label className="flex items-center gap-1 text-[9px] text-gray-500 cursor-pointer">
                                                                        <input type="checkbox" checked={newRepoPrivate} onChange={(e) => setNewRepoPrivate(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3" />
                                                                        <Lock size={9} /> Private
                                                                    </label>
                                                                    <div className="flex gap-1">
                                                                        <button type="button" onClick={() => { setShowCreateRepo(false); setNewRepoName(''); }}
                                                                            className="px-2 py-0.5 text-[9px] text-gray-500 hover:text-gray-700 rounded">Cancel</button>
                                                                        <button type="button" onClick={handleCreateRepo} disabled={!newRepoName.trim() || creatingRepo}
                                                                            className="px-2 py-0.5 text-[9px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 flex items-center gap-0.5">
                                                                            {creatingRepo ? <RefreshCw size={9} className="animate-spin" /> : <Plus size={9} />}
                                                                            {creatingRepo ? 'Creating...' : 'Create'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="relative">
                                                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                                            <input type="text" value={gitRepoSearch} onChange={(e) => setGitRepoSearch(e.target.value)}
                                                                placeholder="Search repos..." className="w-full pl-7 pr-2 py-1.5 text-[10px] bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-400" />
                                                        </div>
                                                        {loadingGitRepos ? (
                                                            <div className="flex justify-center py-4"><RefreshCw size={14} className="animate-spin text-blue-500" /></div>
                                                        ) : (
                                                            <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-[#2D2F36] rounded-lg divide-y divide-gray-100 dark:divide-[#1F2128]">
                                                                {gitRepos.filter(r => r.full_name.toLowerCase().includes(gitRepoSearch.toLowerCase())).length === 0 ? (
                                                                    <div className="p-2 text-center text-[10px] text-gray-400">{gitRepoSearch ? 'No repos found' : 'No writable repos'}</div>
                                                                ) : (
                                                                    gitRepos.filter(r => r.full_name.toLowerCase().includes(gitRepoSearch.toLowerCase())).map(repo => (
                                                                        <button key={repo.id} type="button" onClick={() => setSelectedGitRepo(repo)}
                                                                            className={`w-full flex items-center gap-1.5 p-2 text-left hover:bg-gray-50 dark:hover:bg-[#15171E] transition-colors ${selectedGitRepo?.id === repo.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                                                            {repo.private ? <Lock size={10} className="text-gray-400 flex-shrink-0" /> : <Globe size={10} className="text-gray-400 flex-shrink-0" />}
                                                                            <span className="text-[10px] font-medium text-gray-900 dark:text-white truncate">{repo.full_name}</span>
                                                                            {selectedGitRepo?.id === repo.id && <Check size={10} className="text-blue-600 flex-shrink-0 ml-auto" />}
                                                                        </button>
                                                                    ))
                                                                )}
                                                            </div>
                                                        )}
                                                        {repoMode && !selectedGitRepo && !loadingGitRepos && (
                                                            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 text-amber-700 dark:text-amber-400 text-[10px]">
                                                                <AlertTriangle size={12} className="flex-shrink-0" />
                                                                <span>Select a repo or deselect the mode above.</span>
                                                            </div>
                                                        )}
                                                        {selectedGitRepo && (
                                                            <>
                                                                <div className="relative">
                                                                    <Folder size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                                                    <input type="text" value={gitDocsPath} onChange={(e) => setGitDocsPath(e.target.value)} placeholder="docs/"
                                                                        className="w-full pl-7 pr-2 py-1.5 text-[10px] bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none text-gray-700 dark:text-gray-200" />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-1.5">
                                                                    {(['direct', 'pr'] as const).map(strat => (
                                                                        <button key={strat} type="button" onClick={() => setGitBranchStrategy(strat)}
                                                                            className={`p-1.5 rounded-lg border text-left transition-colors ${gitBranchStrategy === strat ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-[#2D2F36]'}`}>
                                                                            <div className="text-[10px] font-bold text-gray-700 dark:text-gray-200">{strat === 'direct' ? 'Direct Push' : 'Pull Request'}</div>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={(inputMode === 'scratch' ? !productName : !uploadedFile || isExtracting) || gitRepoIncomplete}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            <Sparkles size={16} /> Generate Product Vision
                        </button>
                    </div>
                )}

                {/* Loading States */}
                {(step === 'processing' || step === 'generating_docs') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-[#12141A] animate-in fade-in duration-500 z-50">
                        <div className="relative mb-8">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
                                <Loader2 size={40} className="animate-spin text-white" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white dark:bg-[#12141A] rounded-xl flex items-center justify-center shadow-lg border border-gray-100 dark:border-[#2D2F36]">
                                <Sparkles size={16} className="text-blue-600 animate-pulse" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">
                            {step === 'processing' ? 'Analyzing Product Vision' : 'Generating Documents'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            {step === 'processing' ? 'Crafting strategic insights...' : 'Building comprehensive documentation...'}
                        </p>

                        {/* Current Status */}
                        <div className="flex items-center gap-2 mb-6 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                {loadingStatus || 'Initializing...'}
                            </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-80 h-2.5 bg-gray-100 dark:bg-[#1F2128] rounded-full overflow-hidden mb-3">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out rounded-full"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-400">{Math.round(progress)}% complete</p>

                        {/* Step Indicators for Processing */}
                        {step === 'processing' && (
                          <div className="flex gap-6 mt-6">
                              <div className={`flex items-center gap-2 text-xs font-medium ${progress > 10 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${progress > 10 ? 'bg-green-100 dark:bg-green-900/30' : progress > 0 ? 'bg-blue-100 dark:bg-blue-900/30 animate-pulse' : 'bg-gray-100 dark:bg-[#1F2128]'}`}>
                                      {progress > 10 ? <Check size={12} /> : <span className="text-[10px]">1</span>}
                                  </div>
                                  <span>Initialize</span>
                              </div>
                              <div className={`flex items-center gap-2 text-xs font-medium ${progress > 40 ? 'text-green-600 dark:text-green-400' : progress > 10 ? 'text-blue-500' : 'text-gray-400'}`}>
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${progress > 40 ? 'bg-green-100 dark:bg-green-900/30' : progress > 10 ? 'bg-blue-100 dark:bg-blue-900/30 animate-pulse' : 'bg-gray-100 dark:bg-[#1F2128]'}`}>
                                      {progress > 40 ? <Check size={12} /> : <span className="text-[10px]">2</span>}
                                  </div>
                                  <span>Analyze</span>
                              </div>
                              <div className={`flex items-center gap-2 text-xs font-medium ${progress > 70 ? 'text-green-600 dark:text-green-400' : progress > 40 ? 'text-blue-500' : 'text-gray-400'}`}>
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${progress > 70 ? 'bg-green-100 dark:bg-green-900/30' : progress > 40 ? 'bg-blue-100 dark:bg-blue-900/30 animate-pulse' : 'bg-gray-100 dark:bg-[#1F2128]'}`}>
                                      {progress > 70 ? <Check size={12} /> : <span className="text-[10px]">3</span>}
                                  </div>
                                  <span>Generate</span>
                              </div>
                              <div className={`flex items-center gap-2 text-xs font-medium ${progress > 95 ? 'text-green-600 dark:text-green-400' : progress > 70 ? 'text-blue-500' : 'text-gray-400'}`}>
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${progress > 95 ? 'bg-green-100 dark:bg-green-900/30' : progress > 70 ? 'bg-blue-100 dark:bg-blue-900/30 animate-pulse' : 'bg-gray-100 dark:bg-[#1F2128]'}`}>
                                      {progress > 95 ? <Check size={12} /> : <span className="text-[10px]">4</span>}
                                  </div>
                                  <span>Finalize</span>
                              </div>
                          </div>
                        )}

                        {/* Document generation detail now shown in prd_view sidebar */}
                    </div>
                )}

                {/* Creating Project State */}
                {step === 'creating_project' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-[#12141A] animate-in fade-in duration-500 z-50 p-8">
                        <div className="relative mb-6">
                            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${creationJob?.status === 'completed' ? 'from-green-500 to-emerald-600' : creationJob?.status === 'failed' ? 'from-red-500 to-rose-600' : 'from-green-500 to-emerald-600 animate-pulse'} flex items-center justify-center shadow-xl shadow-green-500/30`}>
                                {creationJob?.status === 'completed' ? (
                                    <Check size={40} className="text-white" />
                                ) : creationJob?.status === 'failed' ? (
                                    <X size={40} className="text-white" />
                                ) : (
                                    <Briefcase size={40} className="text-white" />
                                )}
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">
                            {creationJob?.status === 'completed' ? 'Project Created!' : creationJob?.status === 'failed' ? 'Creation Failed' : 'Creating Your Project'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center max-w-sm">
                            {creationJob?.status === 'completed' && creationJob.result ? (
                                `${creationJob.result.epicsCreated} epics, ${creationJob.result.tasksCreated} tasks, ${creationJob.result.docsCreated} documents created`
                            ) : creationJob?.status === 'failed' ? (
                                creationJob.error || 'An error occurred during product creation'
                            ) : (
                                'Setting up your workspace with epics, tasks, and documentation...'
                            )}
                        </p>

                        {/* Step-by-step progress list */}
                        {creationJob?.steps && (
                            <div className="w-96 max-w-full space-y-2 mb-6">
                                {creationJob.steps.map((jobStep) => (
                                    <div key={jobStep.id} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50 dark:bg-[#1F2128]">
                                        <div className="flex-shrink-0">
                                            {jobStep.status === 'completed' && (
                                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                                    <Check size={12} className="text-white" />
                                                </div>
                                            )}
                                            {jobStep.status === 'in_progress' && (
                                                <Loader2 size={18} className="text-blue-500 animate-spin" />
                                            )}
                                            {jobStep.status === 'failed' && (
                                                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                                                    <X size={12} className="text-white" />
                                                </div>
                                            )}
                                            {jobStep.status === 'pending' && (
                                                <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className={`text-xs font-medium ${
                                                jobStep.status === 'completed' ? 'text-green-700 dark:text-green-400' :
                                                jobStep.status === 'in_progress' ? 'text-blue-700 dark:text-blue-400' :
                                                jobStep.status === 'failed' ? 'text-red-700 dark:text-red-400' :
                                                'text-gray-400'
                                            }`}>
                                                {jobStep.label}
                                            </span>
                                            {jobStep.detail && (
                                                <p className="text-[10px] text-gray-400 truncate">{jobStep.detail}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Overall progress bar */}
                        <div className="w-80 bg-gray-100 dark:bg-[#1F2128] rounded-full h-3 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ease-out rounded-full ${
                                    creationJob?.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                    creationJob?.status === 'failed' ? 'bg-gradient-to-r from-red-500 to-rose-500' :
                                    'bg-gradient-to-r from-green-500 to-emerald-500'
                                }`}
                                style={{ width: `${creationProgress}%` }}
                            />
                        </div>
                        <span className="text-xs text-gray-400 mt-2 font-medium">{Math.round(creationProgress)}%</span>

                        {creationJob?.status === 'failed' && (
                            <button
                                onClick={() => setStep('planning')}
                                className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            >
                                Back to Plan
                            </button>
                        )}
                    </div>
                )}

                {/* Review, PRD View, Planning Steps */}
                {(step === 'review' || step === 'prd_view' || step === 'planning') && (
                     <div className="flex flex-1 min-h-0 animate-in fade-in duration-300">
                        {/* Main Content Area */}
                        <div className="flex-1 flex flex-col min-w-0 min-h-0">
                            <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar min-h-0">

                                {/* Review Step */}
                                {step === 'review' && (
                                    <div className={`flex flex-1 min-h-0 ${
                                      isTransitioning ? 'opacity-0' : transitionDirection === 'forward' ? 'animate-slideInFromRight' : 'animate-slideInFromLeft'
                                    }`}>
                                        {/* Vision Editor - Left */}
                                        <div className="flex-1 p-6 border-r border-gray-100 dark:border-[#1F2128] flex flex-col">
                                            {/* Step Summary from Input */}
                                            <StepSummary stepName="Define" onEdit={() => handleStepChange('input', 'backward')}>
                                              <div className="flex items-center gap-4">
                                                {productImage && (
                                                  <img src={productImage} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                  <p className="font-semibold text-[#172B4D] dark:text-white truncate">{productName || 'Untitled Product'}</p>
                                                  <p className="text-xs text-gray-400 truncate">{description || 'No description'}</p>
                                                </div>
                                                {tags && (
                                                  <div className="flex gap-1 flex-shrink-0">
                                                    {tags.split(',').slice(0, 2).map((tag, i) => (
                                                      <span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 dark:bg-[#1F2128] rounded-full text-gray-500">{tag.trim()}</span>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            </StepSummary>

                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Lightbulb size={16} className="text-amber-500" />
                                                    <h3 className="text-sm font-bold text-[#172B4D] dark:text-white">Product Vision</h3>
                                                </div>
                                                <span className="text-[10px] text-gray-400 flex items-center gap-1 bg-gray-100 dark:bg-[#1F2128] px-2 py-1 rounded">
                                                    <Edit3 size={10} /> Editable
                                                </span>
                                            </div>
                                            <textarea
                                                className="w-full h-[calc(100%-80px)] bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl p-4 text-sm text-[#172B4D] dark:text-gray-200 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                value={refinedVision}
                                                onChange={(e) => setRefinedVision(e.target.value)}
                                                placeholder="Your product vision will appear here..."
                                            />
                                        </div>

                                        {/* Suggestions - Right */}
                                        <div className="w-80 flex flex-col bg-gray-50/50 dark:bg-[#0B0C0E]/50">
                                            <div className="p-4 border-b border-gray-100 dark:border-[#1F2128] flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Zap size={14} className="text-amber-500" />
                                                    <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Suggestions</h3>
                                                </div>
                                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">
                                                    {suggestions.filter(s => s.selected).length}/{suggestions.length}
                                                </span>
                                            </div>

                                            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                                                {suggestions.length > 0 ? suggestions.map(s => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => toggleSuggestion(s.id)}
                                                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                                                            s.selected
                                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                                            : 'bg-white dark:bg-[#15171E] border-gray-200 dark:border-[#2D2F36] hover:border-blue-300 dark:hover:border-blue-700'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${getSuggestionColor(s.type)}`}>
                                                                {getSuggestionIcon(s.type)}
                                                                {s.type}
                                                            </span>
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                                s.selected ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-[#2D2F36] text-gray-400'
                                                            }`}>
                                                                {s.selected ? <Check size={10} /> : <Plus size={10} />}
                                                            </div>
                                                        </div>
                                                        <h4 className="font-semibold text-xs text-[#172B4D] dark:text-white mb-1">{s.title}</h4>
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2">{s.description}</p>
                                                    </button>
                                                )) : (
                                                    <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                                                        <Lightbulb size={24} className="text-gray-300 dark:text-gray-600 mb-2" />
                                                        <p className="text-xs text-gray-400">No suggestions yet</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-3 border-t border-gray-100 dark:border-[#1F2128]">
                                                <button
                                                    onClick={handleMoreSuggestions}
                                                    disabled={isAiLoading}
                                                    className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-gray-900 dark:text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                                                >
                                                    {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                                    Generate More Ideas
                                                </button>
                                            </div>

                                            {/* Research Insights Panel */}
                                            {researchReport && (
                                                <div className="border-t border-gray-100 dark:border-[#1F2128]">
                                                    <button
                                                        onClick={() => setShowResearchPanel(!showResearchPanel)}
                                                        className="w-full p-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Globe size={14} className="text-purple-500" />
                                                            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Research Insights</span>
                                                        </div>
                                                        <ChevronRight size={14} className={`text-gray-400 transition-transform ${showResearchPanel ? 'rotate-90' : ''}`} />
                                                    </button>
                                                    {showResearchPanel && (
                                                        <div className="px-3 pb-3 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                                            {researchReport.keyFindings.map((finding, i) => (
                                                                <div key={i} className="p-2 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/20 rounded-lg">
                                                                    <p className="text-[10px] text-purple-700 dark:text-purple-300">{finding}</p>
                                                                </div>
                                                            ))}
                                                            {researchReport.sources.length > 0 && (
                                                                <div className="pt-1">
                                                                    <p className="text-[9px] font-bold uppercase text-gray-400 mb-1">Sources</p>
                                                                    {researchReport.sources.slice(0, 5).map((source, i) => (
                                                                        <a
                                                                            key={i}
                                                                            href={source.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="block text-[10px] text-blue-500 hover:text-blue-400 truncate"
                                                                        >
                                                                            {source.title}
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* PRD View Step */}
                                {step === 'prd_view' && (
                                    <div className={`flex flex-col flex-1 min-h-0 ${
                                      isTransitioning ? 'opacity-0' : transitionDirection === 'forward' ? 'animate-slideInFromRight' : 'animate-slideInFromLeft'
                                    }`}>
                                        {/* Horizontal Document Tabs */}
                                        <div className="border-b border-gray-100 dark:border-[#1F2128] bg-gray-50/50 dark:bg-[#0B0C0E]/50 flex-shrink-0">
                                            <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto custom-scrollbar">
                                                {DOC_NAV_ITEMS.map(section => {
                                                    const isActive = activeDocSection === section.id;
                                                    const Icon = section.icon;
                                                    return (
                                                        <button
                                                            key={section.id}
                                                            onClick={() => setActiveDocSection(section.id)}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                                                                isActive
                                                                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm'
                                                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1F2128]'
                                                            }`}
                                                        >
                                                            <Icon size={12} />
                                                            <span>{section.label}</span>
                                                            {docGenerationProgress[section.id] === 'completed' || generatedDocs[section.id] ? (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                            ) : docGenerationProgress[section.id] === 'generating' || currentGeneratingDoc === section.id ? (
                                                                <Loader2 size={10} className="animate-spin text-blue-500" />
                                                            ) : docGenerationProgress[section.id] === 'error' ? (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                            ) : (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Document Content */}
                                        <div className="flex-1 p-6 bg-gray-100/50 dark:bg-[#0B0C0E]/50 overflow-y-auto custom-scrollbar">
                                             {/* Step Summary from Vision */}
                                             <div className="max-w-4xl mx-auto mb-4">
                                               <StepSummary stepName="Vision" onEdit={() => handleStepChange('review', 'backward')}>
                                                 <div className="flex items-center justify-between">
                                                   <div className="flex-1 min-w-0">
                                                     <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                                       {refinedVision?.substring(0, 100) || 'Product vision generated'}...
                                                     </p>
                                                   </div>
                                                   <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                                     <span className="text-[10px] px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full font-bold">
                                                       {suggestions.filter(s => s.selected).length} suggestions included
                                                     </span>
                                                   </div>
                                                 </div>
                                               </StepSummary>
                                             </div>

                                             {docGenerationProgress[activeDocSection] === 'error' ? (
                                                <div className="max-w-4xl mx-auto">
                                                    <div className="p-8 border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-xl text-center">
                                                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                                                            <X size={24} className="text-red-500" />
                                                        </div>
                                                        <h3 className="font-bold text-lg text-red-600 dark:text-red-400 mb-2">Generation Failed</h3>
                                                        <p className="text-sm text-red-500 dark:text-red-400/80 mb-6">
                                                            Rate limit exceeded or service busy for this section.
                                                        </p>
                                                        <button
                                                            onClick={() => handleRetryDocument(activeDocSection)}
                                                            disabled={currentGeneratingDoc === activeDocSection}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium transition-colors"
                                                        >
                                                            {currentGeneratingDoc === activeDocSection ? (
                                                                <>
                                                                    <Loader2 size={16} className="animate-spin" />
                                                                    Retrying...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <RefreshCw size={16} />
                                                                    Retry Generation
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                             ) : generatedDocs[activeDocSection] ? (
                                                <div className="relative">
                                                    <div
                                                        ref={docContentRef}
                                                        className="max-w-4xl mx-auto bg-white dark:bg-[#15171E] min-h-[700px] shadow-sm border border-gray-200 dark:border-[#1F2128] rounded-xl p-10 text-[#172B4D] dark:text-gray-200"
                                                    >
                                                        <MarkdownRenderer
                                                            content={generatedDocs[activeDocSection]}
                                                            className="prose prose-sm dark:prose-invert max-w-none"
                                                        />
                                                    </div>
                                                </div>
                                             ) : currentGeneratingDoc === activeDocSection ? (
                                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                                    <Loader2 size={24} className="animate-spin text-blue-500" />
                                                    <span className="text-sm text-gray-500">Generating {DOC_NAV_ITEMS.find(d => d.id === activeDocSection)?.label}...</span>
                                                </div>
                                             ) : (
                                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                                    <Loader2 size={24} className="animate-spin text-gray-400" />
                                                    <span className="text-sm text-gray-400">Waiting in queue...</span>
                                                </div>
                                             )}
                                        </div>
                                    </div>
                                )}

                                {/* Planning Step */}
                                {step === 'planning' && (
                                    <div className={`p-6 max-w-5xl mx-auto space-y-4 ${
                                      isTransitioning ? 'opacity-0' : transitionDirection === 'forward' ? 'animate-slideInFromRight' : 'animate-slideInFromLeft'
                                    }`}>
                                        {/* Step Summary from Documents */}
                                        <StepSummary stepName="Documents" onEdit={() => handleStepChange('prd_view', 'backward')}>
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <FileText size={14} className="text-blue-500" />
                                              <span className="text-xs">
                                                {Object.keys(generatedDocs).filter(k => generatedDocs[k]).length} documents generated
                                              </span>
                                            </div>
                                            <div className="flex gap-1">
                                              {Object.keys(generatedDocs).filter(k => generatedDocs[k]).slice(0, 4).map((docId) => (
                                                <div key={docId} className="w-1.5 h-1.5 rounded-full bg-green-500" title={docId} />
                                              ))}
                                              {Object.keys(generatedDocs).filter(k => generatedDocs[k]).length > 4 && (
                                                <span className="text-[10px] text-gray-400">+{Object.keys(generatedDocs).filter(k => generatedDocs[k]).length - 4}</span>
                                              )}
                                            </div>
                                          </div>
                                        </StepSummary>

                                        {/* Summary Stats */}
                                        <div className="flex gap-4 mb-6">
                                            <div className="flex-1 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/20 rounded-xl p-4">
                                                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                                                    <Layers size={16} />
                                                    <span className="text-2xl font-bold">{generatedEpics.length}</span>
                                                </div>
                                                <span className="text-xs text-purple-600/70 dark:text-purple-400/70 font-medium">Epics</span>
                                            </div>
                                            <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-xl p-4">
                                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                                                    <Check size={16} />
                                                    <span className="text-2xl font-bold">{generatedEpics.reduce((acc, e) => acc + e.tasks.length, 0)}</span>
                                                </div>
                                                <span className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">Tasks</span>
                                            </div>
                                            <div className="flex-1 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl p-4">
                                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                                                    <Target size={16} />
                                                    <span className="text-2xl font-bold">{generatedEpics.reduce((acc, e) => acc + e.tasks.reduce((a, t) => a + t.points, 0), 0)}</span>
                                                </div>
                                                <span className="text-xs text-amber-600/70 dark:text-amber-400/70 font-medium">Story Points</span>
                                            </div>
                                        </div>

                                        {/* Epics List */}
                                        {generatedEpics.map((epic, epicIdx) => (
                                            <div key={epic.id} className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden">
                                                {/* Epic Header */}
                                                <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-white dark:from-[#1F2128]/50 dark:to-[#15171E] border-b border-gray-100 dark:border-[#1F2128] flex items-start gap-4">
                                                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                                                        {epicIdx + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <input
                                                            type="text"
                                                            value={epic.title}
                                                            onChange={(e) => handleEpicChange(epic.id, 'title', e.target.value)}
                                                            className="bg-transparent font-bold text-[#172B4D] dark:text-white w-full focus:outline-none text-sm"
                                                            placeholder="Epic Title"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={epic.description}
                                                            onChange={(e) => handleEpicChange(epic.id, 'description', e.target.value)}
                                                            className="bg-transparent text-xs text-gray-500 w-full focus:outline-none mt-0.5"
                                                            placeholder="Epic description..."
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => { setAiPromptEpicId(epic.id); setAiTaskPrompt(''); }}
                                                            className="px-2.5 py-1.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors flex items-center gap-1"
                                                        >
                                                            <Wand2 size={12} /> AI
                                                        </button>
                                                        <button
                                                            onClick={() => handleAddTask(epic.id)}
                                                            className="px-2.5 py-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex items-center gap-1"
                                                        >
                                                            <Plus size={12} /> Task
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteEpic(epic.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* AI Task Prompt */}
                                                {aiPromptEpicId === epic.id && (
                                                    <div className="px-5 py-3 bg-purple-50/50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/20 flex gap-2 animate-in slide-in-from-top-2">
                                                        <input
                                                            type="text"
                                                            value={aiTaskPrompt}
                                                            onChange={(e) => setAiTaskPrompt(e.target.value)}
                                                            placeholder="Describe tasks to generate..."
                                                            className="flex-1 bg-white dark:bg-[#0B0C0E] border border-purple-200 dark:border-purple-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                                            autoFocus
                                                            onKeyDown={(e) => e.key === 'Enter' && handleAiAddTasks(epic.id)}
                                                        />
                                                        <button
                                                            onClick={() => handleAiAddTasks(epic.id)}
                                                            disabled={!aiTaskPrompt.trim() || isGeneratingTasks}
                                                            className="px-4 py-2 text-xs bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                                                        >
                                                            {isGeneratingTasks ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                            Generate
                                                        </button>
                                                        <button onClick={() => setAiPromptEpicId(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Tasks */}
                                                <div className="divide-y divide-gray-50 dark:divide-[#1F2128]">
                                                    {epic.tasks.length > 0 ? epic.tasks.map((task, taskIdx) => (
                                                        <div
                                                            key={task.id}
                                                            className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 dark:hover:bg-[#1F2128]/30 transition-colors group"
                                                        >
                                                            <span className="text-[10px] text-gray-400 font-mono w-6">{taskIdx + 1}</span>

                                                            <div className="flex-1 min-w-0" onClick={() => handleOpenTaskDetail(epic, task)}>
                                                                <input
                                                                    type="text"
                                                                    value={task.title}
                                                                    onChange={(e) => { e.stopPropagation(); handleTaskChange(epic.id, task.id, 'title', e.target.value); }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-full bg-transparent text-xs font-medium text-[#172B4D] dark:text-gray-200 focus:outline-none cursor-pointer"
                                                                />
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <select
                                                                    value={task.type}
                                                                    onChange={(e) => handleTaskChange(epic.id, task.id, 'type', e.target.value)}
                                                                    className="text-[10px] bg-gray-100 dark:bg-[#1F2128] text-gray-600 dark:text-gray-400 rounded px-2 py-1 border-none cursor-pointer"
                                                                >
                                                                    <option value="task">Task</option>
                                                                    <option value="story">Story</option>
                                                                    <option value="bug">Bug</option>
                                                                </select>

                                                                <select
                                                                    value={task.points}
                                                                    onChange={(e) => handleTaskChange(epic.id, task.id, 'points', parseInt(e.target.value))}
                                                                    className="text-[10px] bg-gray-100 dark:bg-[#1F2128] text-gray-600 dark:text-gray-400 rounded px-2 py-1 border-none cursor-pointer font-mono w-14"
                                                                >
                                                                    {[1,2,3,5,8,13].map(p => <option key={p} value={p}>{p} pts</option>)}
                                                                </select>

                                                                <div className="relative">
                                                                    <select
                                                                        value={task.assigneeId}
                                                                        onChange={(e) => handleTaskChange(epic.id, task.id, 'assigneeId', e.target.value)}
                                                                        className="text-[10px] bg-gray-100 dark:bg-[#1F2128] text-gray-600 dark:text-gray-400 rounded pl-6 pr-2 py-1 border-none cursor-pointer appearance-none w-20"
                                                                    >
                                                                        {users.length > 0 ? users.map(u => (
                                                                            <option key={u.id} value={u.id}>{u.name.split(' ')[0]}</option>
                                                                        )) : (
                                                                            <option value="unassigned">Unassigned</option>
                                                                        )}
                                                                    </select>
                                                                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                                                        {users.find(u => u.id === task.assigneeId) ? (
                                                                            <img src={users.find(u => u.id === task.assigneeId)?.avatarUrl} className="w-3.5 h-3.5 rounded-full" alt="" />
                                                                        ) : (
                                                                            <div className="w-3.5 h-3.5 rounded-full bg-gray-300" />
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <button
                                                                    onClick={() => handleOpenTaskDetail(epic, task)}
                                                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                                                >
                                                                    <Maximize2 size={12} />
                                                                </button>

                                                                <button
                                                                    onClick={() => handleDeleteTask(epic.id, task.id)}
                                                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )) : (
                                                        <div className="py-6 text-center text-xs text-gray-400">
                                                            No tasks yet. Add manually or use AI to generate.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Add Epic Button */}
                                        <button
                                            onClick={() => {
                                                setGeneratedEpics(prev => [...prev, {
                                                    id: `epic-${Date.now()}`,
                                                    title: 'New Epic',
                                                    description: '',
                                                    tasks: []
                                                }]);
                                            }}
                                            className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-[#2D2F36] rounded-xl text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all font-bold text-xs flex items-center justify-center gap-2"
                                        >
                                            <Plus size={14} /> Add Epic
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Floating AI Chat - Fixed at bottom */}
                            {(step === 'review' || step === 'prd_view' || step === 'planning') && (
                            <div className="border-t border-gray-100 dark:border-[#1F2128] bg-white dark:bg-[#12141A] p-4">
                                <div className="max-w-3xl mx-auto">
                                    {/* Chat History */}
                                    {messages.length > 0 && (
                                        <div className="max-h-24 overflow-y-auto mb-3 space-y-2 custom-scrollbar">
                                            {messages.map((m, i) => (
                                                <div key={i} className={`text-xs ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                                                    <span className={`inline-block px-3 py-1.5 rounded-lg ${
                                                        m.role === 'user'
                                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                        : 'bg-gray-100 dark:bg-[#1F2128] text-gray-600 dark:text-gray-400'
                                                    }`}>
                                                        {m.text}
                                                    </span>
                                                </div>
                                            ))}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}

                                    {/* Input */}
                                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#0B0C0E] rounded-xl px-4 py-3 border border-gray-200 dark:border-[#1F2128]">
                                        <Sparkles size={16} className="text-blue-500 flex-shrink-0" />
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                                            placeholder={
                                                step === 'review' ? "Refine vision (e.g., 'Make it more enterprise focused')..." :
                                                step === 'prd_view' ? `Edit ${DOC_NAV_ITEMS.find(d => d.id === activeDocSection)?.label || 'document'}...` :
                                                "Modify plan (e.g., 'Add QA tasks to each epic')..."
                                            }
                                            className="flex-1 bg-transparent text-sm text-[#172B4D] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
                                        />
                                        <button
                                            onClick={handleChatSubmit}
                                            disabled={isAiLoading || !chatInput.trim()}
                                            className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            )}
                        </div>
                     </div>
                )}
            </div>

            {/* Footer Actions */}
            {(step === 'review' || step === 'prd_view' || step === 'planning') && (
                <div className="px-6 py-4 border-t border-gray-100 dark:border-[#1F2128] bg-gray-50/50 dark:bg-[#0B0C0E]/50 flex justify-between items-center z-10 flex-shrink-0">
                    <button
                        onClick={() => handleStepChange(getPreviousStep(), 'backward')}
                        disabled={isTransitioning}
                        className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <ArrowLeft size={14} /> Back
                    </button>

                    <div className="flex items-center gap-3">
                        {step === 'review' && (
                            <button
                                onClick={handleGenerateDocs}
                                disabled={isAiLoading}
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center gap-2 transition-all disabled:opacity-50"
                            >
                                <FileText size={14} /> Generate Documents
                            </button>
                        )}
                        {step === 'prd_view' && (
                            <button
                                onClick={handleGeneratePlan}
                                disabled={isPlanGenerating || isAiLoading}
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isPlanGenerating ? (
                                  <><Loader2 size={14} className="animate-spin" /> Generating Plan...</>
                                ) : (
                                  <><Layout size={14} /> Generate Plan</>
                                )}
                            </button>
                        )}
                        {step === 'planning' && (
                            <button
                                onClick={handleFinalize}
                                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-green-500/20 hover:shadow-green-500/30 flex items-center gap-2 transition-all"
                            >
                                <Check size={14} /> Create Project
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Task Detail Modal */}
        {selectedTaskForDetail && (
            <TaskDetailModal
                task={selectedTaskForDetail}
                isOpen={!!selectedTaskForDetail}
                onClose={() => setSelectedTaskForDetail(null)}
                onUpdate={handleTaskUpdateFromModal}
            />
        )}
    </div>
  );
};

export default ProductGeneratorModal;
