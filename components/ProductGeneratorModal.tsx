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
  MessageSquare,
  Send,
  Bot,
  PenLine,
  HelpCircle,
  CheckCircle2,
  PanelRightClose,
  PanelRightOpen,
  AlertTriangle
} from 'lucide-react';
import { DOC_NAV_ITEMS } from '../constants';
import { Task, User as UserType } from '../types';
import TaskDetailModal from './TaskDetailModal';
import { useProjectData } from '../context/ProjectDataContext';
import { useToast } from '../context/ToastContext';
import { aiClient } from '../lib/ai';
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
  onCreate?: (productData: any) => Promise<void> | void;
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

// Chat message types for Claude-style assistant
interface DocChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    type: 'question' | 'edit' | 'response';
    timestamp: Date;
    editApplied?: boolean;
    editPreview?: string;
}

// Step Configuration
const STEPS = [
  { id: 'input', label: 'Define', icon: Target },
  { id: 'review', label: 'Vision', icon: Lightbulb },
  { id: 'prd_view', label: 'Documents', icon: FileText },
  { id: 'planning', label: 'Plan', icon: Layout },
];

const ProductGeneratorModal: React.FC<ProductGeneratorModalProps> = ({ isOpen, onClose, onCreate }) => {
  const { organizationUsers: users, currentUser } = useProjectData();
  const { error: showError, warning, success, info } = useToast();
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

  // Document Chat Assistant State (Claude Code style)
  const [docChatMessages, setDocChatMessages] = useState<DocChatMessage[]>([]);
  const [docChatInput, setDocChatInput] = useState('');
  const [isDocChatLoading, setIsDocChatLoading] = useState(false);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(true);
  const docChatEndRef = useRef<HTMLDivElement>(null);

  // Planning State
  const [generatedEpics, setGeneratedEpics] = useState<GeneratedEpic[]>([]);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [activeEpicId, setActiveEpicId] = useState<string | null>(null);
  const [aiPromptEpicId, setAiPromptEpicId] = useState<string | null>(null);
  const [aiTaskPrompt, setAiTaskPrompt] = useState('');
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);

  // Editor State
  const [isRegenerating, setIsRegenerating] = useState(false);
  const docContentRef = useRef<HTMLDivElement>(null);

  // Transition State for UX improvements
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  // Exit Confirmation State
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productImageInputRef = useRef<HTMLInputElement>(null);

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

  // Check if there's work in progress that would be lost
  const hasUnsavedWork = () => {
    // Check if we're past the initial input step
    if (step !== 'input') return true;
    // Check if any form data has been entered
    if (productName || description || tags || uploadedFile || productImage) return true;
    // Check if any docs have been generated
    if (Object.keys(generatedDocs).some(k => generatedDocs[k])) return true;
    // Check if any epics have been generated
    if (generatedEpics.length > 0) return true;
    return false;
  };

  // Reset all state to initial values
  const resetAllState = () => {
    setStep('input');
    setInputMode('scratch');
    setProductName('');
    setDescription('');
    setTags('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setTargetDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setOwnerId('');
    setSelectedTeam([]);
    setUploadedFile(null);
    setFileText('');
    setProductImage(null);
    setIsExtracting(false);
    setRefinedVision('');
    setSuggestions([]);
    setMessages([]);
    setChatInput('');
    setIsAiLoading(false);
    setProgress(0);
    setCreationProgress(0);
    setTimeLeft(0);
    setLoadingStatus('');
    setActiveDocSection('prd');
    setGeneratedDocs({});
    setParsedSections([]);
    setCurrentGeneratingDoc(null);
    setDocGenerationProgress({});
    setDocChatMessages([]);
    setDocChatInput('');
    setIsDocChatLoading(false);
    setIsChatPanelOpen(true);
    setGeneratedEpics([]);
    setSelectedTaskForDetail(null);
    setActiveEpicId(null);
    setAiPromptEpicId(null);
    setAiTaskPrompt('');
    setIsGeneratingTasks(false);
    setIsRegenerating(false);
    setTransitionDirection('forward');
    setIsTransitioning(false);
    setCompletedSteps(new Set());
    setShowExitConfirmation(false);
  };

  // Handle close with confirmation if needed
  const handleCloseAttempt = () => {
    if (hasUnsavedWork()) {
      setShowExitConfirmation(true);
    } else {
      resetAllState();
      onClose();
    }
  };

  // Confirm exit and close
  const handleConfirmExit = () => {
    resetAllState();
    setShowExitConfirmation(false);
    onClose();
  };

  // Cancel exit
  const handleCancelExit = () => {
    setShowExitConfirmation(false);
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

  const cleanHtml = (text: string) => {
      if (!text) return '';
      return text.replace(/```(?:html)?\n?([\s\S]*?)\n?```/gi, '$1').trim();
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

  // 1. Initial Generation
  const handleGenerate = async () => {
      if (inputMode === 'scratch' && !productName) return;
      if (inputMode === 'import' && !uploadedFile) return;
      if (inputMode === 'import' && !fileText) {
          warning('Invalid File', 'File content is empty or unreadable. Please upload a valid text/PDF/DOCX file.');
          return;
      }

      setStep('processing');
      setIsAiLoading(true);
      setLoadingStatus('Initializing AI analysis...');

      try {
          let prompt = '';
          const parts: any[] = [];

          setLoadingStatus(inputMode === 'import' ? 'Processing uploaded document...' : 'Analyzing product concept...');

          if (inputMode === 'import') {
              const content = fileText;
              prompt = `
                Act as a Chief Product Officer and Visionary Architect.
                Analyze the provided document content below. Treat this text as the absolute truth source for the product.

                DOCUMENT CONTENT:
                ${content.substring(0, 150000)}

                Tasks:
                1. Extract the product name from the document (or infer a professional one).
                2. **Preserve and Enhance the Product Vision**:
                   - **Do NOT summarize or shorten**. Keep ALL original details, features, and specifications.
                   - EXPAND on the existing content with additional professional insights.
                   - Maintain the full depth and richness of the original document.
                   - Add structure and clarity while preserving every detail.
                   - The 'vision' should be comprehensive and AT LEAST as detailed as the source (aim for 500+ words).
                3. Extract the main Description or purpose as a concise elevator pitch.
                4. Extract ALL key pillars, capabilities, and features mentioned.
                5. Brainstorm 5 strategic suggestions to further enhance the product.

                Output the response in STRICT JSON format with the following keys:
                {
                  "productName": "string",
                  "description": "string (concise elevator pitch)",
                  "vision": "string (comprehensive, detailed - preserve ALL original content and enhance)",
                  "suggestions": [
                    { "title": "string", "description": "string", "type": "feature" }
                  ]
                }
              `;
          } else {
              prompt = `
                Act as a Chief Product Officer and Visionary Architect.
                Analyze this product concept:
                - Product Name: ${productName}
                - Raw Description: ${description || 'No specific description provided, please infer from name and tags.'}
                - Tags: ${tags}

                Tasks:
                1. **Develop a Detailed Product Vision & Strategy**:
                   - **Do NOT summarize**. Expand on the input ideas significantly.
                   - Create a compelling narrative that defines the core value proposition.
                   - Describe the Target Audience and the specific pain points solved.
                   - Outline the User Experience and the "Magic Moment".
                   - Articulate the Technical Innovation and Long-term Impact.
                   - The 'vision' text should be substantial, professional, and inspiring (approx 200-300 words).

                2. **Strategic Suggestions**:
                   - Brainstorm 5 specific, high-impact strategic suggestions (Features, Monetization models, Growth hacks, or UX differentiators).

                Output strictly in this JSON format:
                {
                  "productName": "Refined Name (if appropriate)",
                  "description": "A concise 1-sentence elevator pitch.",
                  "vision": "The full detailed vision text...",
                  "suggestions": [
                    { "title": "Short Title", "description": "One sentence explanation", "type": "feature" }
                  ]
                }
              `;
          }

          parts.push({ text: prompt });

          setLoadingStatus('Generating product vision with AI...');

          const response = await generateWithRetry({
              model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
              contents: [{ role: 'user', parts }],
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
      const prompt = `
        Product: ${productName}
        Current Vision Summary: ${refinedVision.substring(0, 500)}...

        Generate 3 NEW, distinct strategic suggestions (features, monetization, or market angles) that might improve this product.

        Output valid JSON with format:
        {
          "suggestions": [
            { "title": "Title", "description": "Desc", "type": "feature" }
          ]
        }
      `;

      try {
          const response = await generateWithRetry({
              model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
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

      const baseParts = [];

      try {
          const prdPrompt = `
            Role: Chief Product Architect.
            Task: Generate a comprehensive Product Requirements Document (PRD) for: ${productName}.
            Context Summary: ${context}

            **VISUAL STYLE GUIDE (Strict Tailwind CSS):**
            - **Typography**: Use 'text-[#172B4D] dark:text-white' for headings. Use 'text-gray-600 dark:text-gray-300' for body.
            - **Spacing**: Generous spacing. 'mb-8' between sections. 'p-6' inside cards.
            - **Containers**: Wrap major sections in rounded cards: 'bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#2D2F36] p-6 mb-8 shadow-sm'.
            - **Tables**: Use 'w-full text-left border-collapse'. Header: 'bg-gray-50 dark:bg-[#1F2128] text-xs uppercase tracking-wider text-gray-500 font-bold'. Cells: 'p-4 border-b border-gray-100 dark:border-[#2D2F36] text-sm'.
            - **Badges**: Use pill-shaped badges for status/priority (e.g., 'bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold').
            - **Emphasis**: Use 'border-l-4 border-purple-500 pl-4 py-1' for key statements or quotes.

            **STRUCTURE:**
            1. <h2>Executive Summary</h2>
               - Wrap in a Hero Card: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-100 dark:border-blue-900/20'.
            2. <h2>Problem Statement & Context</h2>
               - Use a 2-column grid layout ('grid grid-cols-1 md:grid-cols-2 gap-6') for Current vs Future state.
            3. <h2>Goals & Non-Goals</h2>
               - Use a comparison table or distinct cards.
            4. <h2>User Personas</h2>
               - Display as specific cards with "Avatar" placeholders (colored circles with initials).
            5. <h2>Functional Requirements</h2>
               - **MUST** be a detailed Table: ID | Feature Name | Priority | Description.
            6. <h2>Technical Architecture</h2>
               - Use a dashed border box for Diagram Placeholder.
            7. <h2>Rollout Strategy</h2>
               - Timeline style list.

            Output strictly valid raw HTML. No markdown.
          `;

          setLoadingStatus('Generating PRD Requirements...');

          const prdResponse = await generateWithRetry({
              model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
              contents: [{ role: 'user', parts: [...baseParts, { text: prdPrompt }] }]
          });

          // Save PRD immediately
          const prdContent = cleanHtml(prdResponse.text || '<p>Error generating PRD</p>');
          setGeneratedDocs(prev => ({ ...prev, prd: prdContent }));
          setDocGenerationProgress(prev => ({ ...prev, prd: 'completed' }));
          handleStepChange('prd_view', 'forward');
          setMessages([]);

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
                  const docPrompt = `
                    Role: Chief Product Architect.
                    Task: Generate the "${sec.label}" document.
                    Context Summary: ${context}

                    **Style Guide:**
                    - Use 'bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#2D2F36] p-6 mb-6' for main containers.
                    - Use <h2> for section headers (text-xl font-bold mb-4).
                    - Use tables for structured data.
                    - Make it look professional, spacious, and easy to read.

                    Output strictly valid HTML using Tailwind CSS classes. No markdown.
                  `;

                  await new Promise(r => setTimeout(r, 5000));

                  // Separate API call for each document
                  const res = await generateWithRetry({
                      model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
                      contents: [{ role: 'user', parts: [...baseParts, { text: docPrompt }] }]
                  });

                  // Save document immediately after generation
                  const docContent = cleanHtml(res.text || '<p>Error generating content</p>');
                  setGeneratedDocs(prev => ({ ...prev, [sec.id]: docContent }));
                  setDocGenerationProgress(prev => ({ ...prev, [sec.id]: 'completed' }));

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
          const docPrompt = `
            Role: Chief Product Architect.
            Task: Generate the "${section.label}" document.
            Context Summary: ${context}

            **Style Guide:**
            - Use 'bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#2D2F36] p-6 mb-6' for main containers.
            - Use <h2> for section headers (text-xl font-bold mb-4).
            - Use tables for structured data.
            - Make it look professional, spacious, and easy to read.

            Output strictly valid HTML using Tailwind CSS classes. No markdown.
          `;

          const res = await generateWithRetry({
              model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
              contents: [{ role: 'user', parts: [{ text: docPrompt }] }]
          });

          const docContent = cleanHtml(res.text || '<p>Error generating content</p>');
          setGeneratedDocs(prev => ({ ...prev, [sectionId]: docContent }));
          setDocGenerationProgress(prev => ({ ...prev, [sectionId]: 'completed' }));

      } catch (e) {
          console.error(`Failed to retry ${section.label}`, e);
          setDocGenerationProgress(prev => ({ ...prev, [sectionId]: 'error' }));
      } finally {
          setCurrentGeneratingDoc(null);
      }
  };

  const handleGeneratePlan = async () => {
      setStep('generating_docs');
      setLoadingStatus('Preparing project plan context...');

      const fullContext = Object.entries(generatedDocs)
        .map(([key, content]) => `--- SECTION: ${key.toUpperCase()} ---\n${content}`)
        .join('\n\n');

      const contextToUse = (fullContext || refinedVision) + (fileText ? `\n\nOriginal Source Material: ${fileText.substring(0, 150000)}` : '');

      setLoadingStatus('Analyzing documentation for epic breakdown...');

      const prompt = `
        Role: Senior Technical Lead & Project Architect.
        Task: Create a highly detailed, exhaustive project execution plan based on the provided documentation.

        DOCUMENTATION CONTEXT:
        ${contextToUse}

        STRICT REQUIREMENTS:
        1. **Granularity**: Break down features into the "minutest" possible jobs (Atomic Developer Tasks).
           - BAD: "Build Authentication"
           - GOOD: "Setup Users Table", "Create Login API Endpoint", "Implement JWT Logic", "Build Login UI Form", "Add Form Validation".
        2. **Completeness**: Do NOT limit the number of Epics or Tasks. Generate as many as required to build the full product described in the context.
        3. **Structure**: Group tasks logically into Epics.
        4. **Task Types**: Distinguish between 'story' (user value), 'task' (technical chore/setup), and 'bug' (if noted).
        5. **Estimates**: Provide points (1, 2, 3, 5, 8) for each task. Small atomic tasks should be 1 or 2 points.
        6. **Descriptions**: For each task, generate a RICH HTML description containing:
           - **User Story**: (If applicable) "As a user..."
           - **Implementation Details**: Specific steps, libraries, or logic to be used.
           - **Acceptance Criteria**: A bulleted list of what defines "Done".

        CRITICAL OUTPUT INSTRUCTIONS:
        - Output ONLY valid JSON, nothing else.
        - Do NOT include any thinking, reasoning, or explanation.
        - Do NOT wrap the JSON in markdown code blocks.
        - Do NOT include <think> tags or any other XML tags.
        - Start your response directly with the opening brace {

        OUTPUT FORMAT (return exactly this structure):
        {
          "epics": [
            {
                "title": "Epic Title",
                "description": "High level summary...",
                "tasks": [
                    {
                        "title": "Setup Database Schema for Users",
                        "description": "<p><strong>Implementation:</strong> Create migration file. <strong>Criteria:</strong><ul><li>Schema validated</li><li>Types generated</li></ul></p>",
                        "type": "task",
                        "points": 2,
                        "role": "Backend"
                    }
                ]
            }
          ]
        }
      `;

      try {
          setLoadingStatus('Generating epics and tasks with AI...');

          const response = await generateWithRetry({
              model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: {
                  responseMimeType: "application/json"
              }
          });

          setLoadingStatus('Processing project plan...');
          console.log('Plan generation response:', response.text?.substring(0, 500));

          let rawEpics: any[] = [];
          try {
              const text = cleanJson(response.text || '[]');
              console.log('Parsed text for epics:', text.substring(0, 500));
              const parsed = JSON.parse(text);
              console.log('Parsed object keys:', Object.keys(parsed || {}));

              if (parsed.epics && Array.isArray(parsed.epics)) {
                  rawEpics = parsed.epics;
                  console.log('Found epics array with', rawEpics.length, 'epics');
              } else if (Array.isArray(parsed)) {
                  rawEpics = parsed;
              } else if (typeof parsed === 'object' && parsed !== null) {
                  const findEpicsArray = (obj: any): any[] | null => {
                      if (Array.isArray(obj)) {
                          if (obj.length > 0 && (obj[0].tasks || obj[0].title)) return obj;
                          return null;
                      }
                      if (typeof obj === 'object' && obj !== null) {
                          for (const key of Object.keys(obj)) {
                              const result = findEpicsArray(obj[key]);
                              if (result) return result;
                          }
                      }
                      return null;
                  };

                  const found = findEpicsArray(parsed);
                  if (found) rawEpics = found;
              }
          } catch (e) {
              console.error("Failed to parse JSON", e);
              rawEpics = [];
          }

          console.log('Total rawEpics found:', rawEpics.length);

          // If no epics were generated, retry once with a simpler prompt
          if (rawEpics.length === 0) {
              console.warn('No epics were parsed from the AI response. Retrying with simpler prompt...');
              setLoadingStatus('Retrying plan generation...');

              const retryPrompt = `Based on this product vision, create a project plan with epics and tasks.

Product: ${productName}
Vision: ${refinedVision.substring(0, 2000)}

Return JSON format:
{"epics":[{"title":"Epic Name","description":"Description","tasks":[{"title":"Task","description":"Details","type":"task","points":2,"role":"Developer"}]}]}

Generate 3-5 epics with 3-5 tasks each. Output ONLY valid JSON, no explanation.`;

              const retryResponse = await generateWithRetry({
                  model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
                  contents: [{ role: 'user', parts: [{ text: retryPrompt }] }],
                  config: { responseMimeType: "application/json" }
              });

              try {
                  const retryText = cleanJson(retryResponse.text || '{}');
                  const retryParsed = JSON.parse(retryText);
                  if (retryParsed.epics && Array.isArray(retryParsed.epics)) {
                      rawEpics = retryParsed.epics;
                  } else if (Array.isArray(retryParsed)) {
                      rawEpics = retryParsed;
                  }
              } catch (retryError) {
                  console.error('Retry parsing also failed:', retryError);
              }

              // If still no epics, throw error
              if (rawEpics.length === 0) {
                  throw new Error('Failed to generate project plan. Please try again.');
              }
          }

          setLoadingStatus(`Building ${rawEpics.length} epics and assigning tasks...`);

          const today = new Date();
          const hydratedEpics: GeneratedEpic[] = rawEpics.map((epic: any, eIdx: number) => ({
              id: `epic-${eIdx}`,
              title: epic.title || 'Untitled Epic',
              description: epic.description || '',
              tasks: Array.isArray(epic.tasks) ? epic.tasks.map((task: any, tIdx: number) => {

                  const getUserForRole = (roleStr: string) => {
                      if (!users || users.length === 0) {
                          return { id: 'unassigned', name: 'Unassigned', avatarUrl: '', email: '' };
                      }
                      const roleLower = (roleStr || '').toLowerCase();
                      if (roleLower.includes('front') || roleLower.includes('ui')) return users.find(u => u.role?.toLowerCase().includes('front')) || users[0];
                      if (roleLower.includes('back') || roleLower.includes('api')) return users.find(u => u.role?.toLowerCase().includes('back')) || users[0];
                      if (roleLower.includes('design')) return users.find(u => u.role?.toLowerCase().includes('design')) || users[0];
                      return users[0];
                  };

                  const assignedUser = getUserForRole(task.role);

                  const dueDate = new Date(today);
                  dueDate.setDate(today.getDate() + 3 + (eIdx * 2));

                  return {
                      id: `gen-task-${eIdx}-${tIdx}`,
                      title: task.title || 'Untitled Task',
                      description: task.description || '',
                      type: task.type || 'task',
                      points: task.points || 3,
                      assigneeId: assignedUser.id,
                      dueDate: dueDate.toISOString().split('T')[0]
                  };
              }) : []
          }));

          setGeneratedEpics(hydratedEpics);
          handleStepChange('planning', 'forward');
          setMessages([]);

      } catch (error) {
          console.error("Failed to generate plan", error);
          handleStepChange('prd_view', 'backward');
          showError('Planning Failed', 'Failed to generate project plan. Please try again.');
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
          const prompt = `
            Act as a Technical Lead.
            We are breaking down work for the Epic: "${epic?.title}".
            User Requirement: "${aiTaskPrompt}"
            ${fileText ? `\nReference Context: ${fileText.substring(0, 10000)}` : ''}

            Generate a list of specific, actionable tasks based on the requirement.
            Break them down into atomic units (e.g. separate tasks for DB schema, API, and UI).

            OUTPUT FORMAT:
            Return strictly a JSON object with a key "tasks" containing an array.
            {
              "tasks": [
                {
                  "title": "Task Title",
                  "type": "task",
                  "points": 2,
                  "role": "Frontend",
                  "description": "<p>Details...</p>"
                }
              ]
            }
          `;

          const response = await generateWithRetry({
              model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
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

      const progressInterval = setInterval(() => {
          setCreationProgress(prev => {
              if (prev >= 90) return prev;
              return prev + (Math.random() * 10);
          });
      }, 600);

      const projectData = {
          name: productName,
          description: description,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          vision: refinedVision,
          docs: generatedDocs,
          epics: generatedEpics,
          team: selectedTeam,
          startDate,
          dueDate: targetDate,
          ownerId,
          imageUrl: productImage
      };

      if (onCreate) {
          await onCreate(projectData);
      } else {
          setTimeout(onClose, 2000);
      }

      clearInterval(progressInterval);
      setCreationProgress(100);
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
              const prompt = `Current Vision: "${refinedVision}"\nUser Request: "${userMsg}"\nRewrite the vision statement based on the request. Return only the updated vision text.`;
              const res = await generateWithRetry({
                  model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
                  contents: [{ role: 'user', parts: [{ text: prompt }] }]
              });
              setRefinedVision(res.text || refinedVision);
              setMessages(prev => [...prev, { role: 'ai', text: "Vision updated." }]);
          }
          else if (step === 'prd_view') {
              const currentContent = generatedDocs[activeDocSection] || '';
              const sectionName = DOC_NAV_ITEMS.find(d => d.id === activeDocSection)?.label || 'Document';
              const prompt = `
                You are editing the "${sectionName}" section of a PRD.
                Current Content (HTML): ${currentContent}
                User Request: "${userMsg}"

                Return the FULL updated HTML for this section based on the request. Do not wrap in markdown.
              `;
              const res = await generateWithRetry({
                  model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
                  contents: [{ role: 'user', parts: [{ text: prompt }] }]
              });

              if (res.text) {
                  setGeneratedDocs(prev => ({ ...prev, [activeDocSection]: cleanHtml(res.text) }));
                  if (docContentRef.current) docContentRef.current.innerHTML = cleanHtml(res.text);
                  setMessages(prev => [...prev, { role: 'ai', text: `Updated ${sectionName}.` }]);
              }
          }
          else if (step === 'planning') {
              const prompt = `
                Current Epics JSON: ${JSON.stringify(generatedEpics.map(e => ({ title: e.title, tasks: e.tasks.map(t => ({ title: t.title, type: t.type, points: t.points })) })))}
                User Request: "${userMsg}"

                Update the plan structure based on the request (e.g. add a task to all epics, rename epics, remove bugs).
                Return the FULL updated JSON array of Epics.
              `;
              const res = await generateWithRetry({
                  model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
                  contents: [{ role: 'user', parts: [{ text: prompt }] }],
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

  const handleDocBlur = (e: React.FocusEvent<HTMLDivElement>) => {
      const newContent = e.target.innerHTML;
      if (generatedDocs[activeDocSection] !== newContent) {
          setGeneratedDocs(prev => ({ ...prev, [activeDocSection]: newContent }));
      }
  };

  // Scroll to bottom of doc chat when messages change
  useEffect(() => {
      docChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [docChatMessages]);

  // Enhanced Document Chat Handler - Claude Code style
  const handleDocChatSubmit = async () => {
      if (!docChatInput.trim() || isDocChatLoading) return;

      const userMessage = docChatInput.trim();
      setDocChatInput('');

      // Add user message
      const userMsgId = `msg-${Date.now()}`;
      const isEditRequest = /\b(change|update|modify|edit|add|remove|delete|replace|rewrite|make|fix|improve)\b/i.test(userMessage);

      setDocChatMessages(prev => [...prev, {
          id: userMsgId,
          role: 'user',
          content: userMessage,
          type: isEditRequest ? 'edit' : 'question',
          timestamp: new Date()
      }]);

      setIsDocChatLoading(true);

      try {
          const currentContent = generatedDocs[activeDocSection] || '';
          const sectionName = DOC_NAV_ITEMS.find(d => d.id === activeDocSection)?.label || 'Document';

          // Get FULL context from ALL generated docs for comprehensive answers
          const allDocsContext = Object.entries(generatedDocs)
              .filter(([_, content]) => content)
              .map(([id, content]) => {
                  const docName = DOC_NAV_ITEMS.find(d => d.id === id)?.label || id;
                  // Strip HTML tags for context - include full content
                  const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                  return `=== ${docName.toUpperCase()} ===\n${textContent}`;
              })
              .join('\n\n---\n\n');

          if (isEditRequest) {
              // Edit mode - modify the current document
              const prompt = `You are an expert document editor. You are editing the "${sectionName}" section of a Product Requirements Document.

Current Content (HTML):
${currentContent}

User Request: "${userMessage}"

Instructions:
1. Make the requested changes to the document
2. Return the FULL updated HTML content (not just the changed parts)
3. Preserve the existing HTML structure and styling
4. Do not wrap in markdown code blocks
5. Only return the HTML, nothing else`;

              const res = await generateWithRetry({
                  model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
                  contents: [{ role: 'user', parts: [{ text: prompt }] }]
              });

              if (res.text) {
                  const updatedContent = cleanHtml(res.text);
                  setGeneratedDocs(prev => ({ ...prev, [activeDocSection]: updatedContent }));
                  if (docContentRef.current) {
                      docContentRef.current.innerHTML = updatedContent;
                  }

                  setDocChatMessages(prev => [...prev, {
                      id: `msg-${Date.now()}`,
                      role: 'assistant',
                      content: `I've updated the ${sectionName}. The changes have been applied based on your request: "${userMessage}"`,
                      type: 'edit',
                      timestamp: new Date(),
                      editApplied: true
                  }]);
              }
          } else {
              // Question mode - answer based on ALL document content
              const prompt = `You are a precise product documentation assistant. Search ALL sections below to answer.

FULL PRODUCT DOCUMENTATION:
${allDocsContext}

Question: "${userMessage}"

STRICT RULES:
- Search ALL document sections above to find the answer
- Answer in 2-3 sentences MAX unless more detail is explicitly requested
- Use bullet points for lists (max 4-5 items)
- No introductory phrases - start directly with the answer
- Cite which section(s) the info came from in parentheses at the end
- If not found anywhere, say "Not covered in documentation"
- Be specific with names, numbers, and facts`;

              const res = await generateWithRetry({
                  model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
                  contents: [{ role: 'user', parts: [{ text: prompt }] }]
              });

              setDocChatMessages(prev => [...prev, {
                  id: `msg-${Date.now()}`,
                  role: 'assistant',
                  content: res.text || "I couldn't find relevant information in the documentation.",
                  type: 'response',
                  timestamp: new Date()
              }]);
          }
      } catch (error) {
          console.error('Doc chat error:', error);
          setDocChatMessages(prev => [...prev, {
              id: `msg-${Date.now()}`,
              role: 'assistant',
              content: "Sorry, I encountered an error processing your request. Please try again.",
              type: 'response',
              timestamp: new Date()
          }]);
      } finally {
          setIsDocChatLoading(false);
      }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className={`bg-white dark:bg-[#12141A] w-full rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden flex flex-col transition-all duration-500 ${step === 'review' || step === 'prd_view' || step === 'planning' || step === 'creating_project' ? 'max-w-6xl h-[85vh]' : 'max-w-xl'}`}>

            {/* Header */}
            {step !== 'creating_project' && (
            <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1F2128] flex justify-between items-center bg-white dark:bg-[#12141A] z-10 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-[#172B4D] dark:text-white">Product Architect</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {productName ? productName : 'AI-powered product creation'}
                        </p>
                    </div>
                </div>
                <button onClick={handleCloseAttempt} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2D2F36] transition-colors">
                    <X size={16} />
                </button>
            </div>
            )}

            {/* Step Indicator - Show on review/prd_view/planning */}
            {(step === 'review' || step === 'prd_view' || step === 'planning') && <StepIndicator />}

            {/* Content Body */}
            <div className="flex-1 overflow-hidden relative flex flex-col">

                {/* Step 1: Input & Metadata */}
                {step === 'input' && (
                    <div className={`p-6 space-y-5 overflow-y-auto custom-scrollbar ${
                      isTransitioning ? 'opacity-0' : transitionDirection === 'forward' ? 'animate-slideInFromRight' : 'animate-slideInFromLeft'
                    }`}>
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
                                </div>
                            </div>
                        )}

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={inputMode === 'scratch' ? !productName : !uploadedFile || isExtracting}
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

                        {/* Document Generation Progress */}
                        {step === 'generating_docs' && (
                          <div className="mt-6 w-96">
                            <div className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-3 text-center">
                              Document Generation Progress
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {DOC_NAV_ITEMS.map(doc => {
                                const status = docGenerationProgress[doc.id];
                                const isGenerating = status === 'generating' || currentGeneratingDoc === doc.id;
                                const isCompleted = status === 'completed' || generatedDocs[doc.id];
                                const isError = status === 'error';

                                return (
                                  <div
                                    key={doc.id}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                                      isCompleted
                                        ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                        : isGenerating
                                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 animate-pulse'
                                          : isError
                                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                            : 'bg-gray-50 dark:bg-[#1F2128] text-gray-400'
                                    }`}
                                  >
                                    {isCompleted ? (
                                      <Check size={10} className="flex-shrink-0" />
                                    ) : isGenerating ? (
                                      <Loader2 size={10} className="flex-shrink-0 animate-spin" />
                                    ) : isError ? (
                                      <X size={10} className="flex-shrink-0" />
                                    ) : (
                                      <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                                    )}
                                    <span className="truncate">{doc.label.replace(' Architecture', '').replace(' Workflows', '')}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                    </div>
                )}

                {/* Creating Project State */}
                {step === 'creating_project' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-[#12141A] animate-in fade-in duration-500 z-50">
                        <div className="relative mb-6">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-green-500/30 animate-pulse">
                                <Briefcase size={40} className="text-white" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">Creating Your Project</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center max-w-sm">
                            Setting up epics, tasks, and initializing your workspace...
                        </p>

                        <div className="w-80 bg-gray-100 dark:bg-[#1F2128] rounded-full h-3 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 ease-out rounded-full"
                                style={{ width: `${creationProgress}%` }}
                            />
                        </div>

                        <div className="flex gap-8 mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <span className={creationProgress > 20 ? "text-green-600 dark:text-green-400" : ""}>Structure</span>
                            <span className={creationProgress > 50 ? "text-green-600 dark:text-green-400" : ""}>Epics</span>
                            <span className={creationProgress > 80 ? "text-green-600 dark:text-green-400" : ""}>Tasks</span>
                            <span className={creationProgress > 95 ? "text-green-600 dark:text-green-400" : ""}>Complete</span>
                        </div>
                    </div>
                )}

                {/* Review, PRD View, Planning Steps */}
                {(step === 'review' || step === 'prd_view' || step === 'planning') && (
                     <div className="flex-1 flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-300">
                        {/* Main Content Area */}
                        <div className="flex-1 flex min-h-0 overflow-hidden">

                                {/* Review Step */}
                                {step === 'review' && (
                                    <div className={`flex w-full h-full overflow-hidden ${
                                      isTransitioning ? 'opacity-0' : transitionDirection === 'forward' ? 'animate-slideInFromRight' : 'animate-slideInFromLeft'
                                    }`}>
                                        {/* Vision Editor - Left */}
                                        <div className="flex-1 p-6 border-r border-gray-100 dark:border-[#1F2128] flex flex-col min-w-0 overflow-hidden">
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

                                            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <Lightbulb size={16} className="text-amber-500" />
                                                    <h3 className="text-sm font-bold text-[#172B4D] dark:text-white">Product Vision</h3>
                                                </div>
                                                <span className="text-[10px] text-gray-400 flex items-center gap-1 bg-gray-100 dark:bg-[#1F2128] px-2 py-1 rounded">
                                                    <Edit3 size={10} /> Editable
                                                </span>
                                            </div>
                                            <textarea
                                                className="flex-1 w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl p-4 text-sm text-[#172B4D] dark:text-gray-200 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 overflow-y-auto"
                                                value={refinedVision}
                                                onChange={(e) => setRefinedVision(e.target.value)}
                                                placeholder="Your product vision will appear here..."
                                            />
                                        </div>

                                        {/* Suggestions - Right */}
                                        <div className="w-64 flex-shrink-0 flex flex-col bg-gray-50/50 dark:bg-[#0B0C0E]/50">
                                            <div className="p-4 border-b border-gray-100 dark:border-[#1F2128] flex items-center justify-between flex-shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <Zap size={14} className="text-amber-500" />
                                                    <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider">Suggestions</h3>
                                                </div>
                                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">
                                                    {suggestions.filter(s => s.selected).length}/{suggestions.length}
                                                </span>
                                            </div>

                                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
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

                                            <div className="p-3 border-t border-gray-100 dark:border-[#1F2128] flex-shrink-0">
                                                <button
                                                    onClick={handleMoreSuggestions}
                                                    disabled={isAiLoading}
                                                    className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                                                >
                                                    {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                                    Generate More Ideas
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* PRD View Step */}
                                {step === 'prd_view' && (
                                    <div className={`flex h-full ${
                                      isTransitioning ? 'opacity-0' : transitionDirection === 'forward' ? 'animate-slideInFromRight' : 'animate-slideInFromLeft'
                                    }`}>
                                        {/* Document Navigation */}
                                        <div className="w-56 bg-gray-50 dark:bg-[#0B0C0E] border-r border-gray-100 dark:border-[#1F2128] flex flex-col flex-shrink-0">
                                            <div className="p-3 border-b border-gray-100 dark:border-[#1F2128]">
                                                <h3 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Documents</h3>
                                            </div>
                                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                                {DOC_NAV_ITEMS.map(section => (
                                                    <button
                                                        key={section.id}
                                                        onClick={() => setActiveDocSection(section.id)}
                                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                                            activeDocSection === section.id
                                                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1F2128]'
                                                        }`}
                                                    >
                                                        <section.icon size={14} />
                                                        <span className="flex-1 text-left truncate">{section.label}</span>
                                                        {docGenerationProgress[section.id] === 'completed' || generatedDocs[section.id] ? (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Generated" />
                                                        ) : docGenerationProgress[section.id] === 'generating' || currentGeneratingDoc === section.id ? (
                                                            <Loader2 size={10} className="animate-spin text-blue-500" title="Generating..." />
                                                        ) : docGenerationProgress[section.id] === 'error' ? (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" title="Error" />
                                                        ) : (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" title="Pending" />
                                                        )}
                                                    </button>
                                                ))}
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
                                                <div className="relative group/doc">
                                                    <div className="absolute top-3 right-3 z-10 opacity-0 group-hover/doc:opacity-100 transition-opacity">
                                                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1">
                                                            <Edit3 size={9} /> Editable
                                                        </span>
                                                    </div>
                                                    <div
                                                        ref={docContentRef}
                                                        contentEditable
                                                        suppressContentEditableWarning
                                                        onBlur={handleDocBlur}
                                                        className="max-w-4xl mx-auto bg-white dark:bg-[#15171E] min-h-[700px] shadow-sm border border-gray-200 dark:border-[#1F2128] rounded-xl p-10 text-[#172B4D] dark:text-gray-200 prose prose-sm dark:prose-invert max-w-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                        dangerouslySetInnerHTML={{ __html: generatedDocs[activeDocSection] }}
                                                    />
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

                                        {/* Right Sidebar - AI Chat Assistant (Claude Code style) */}
                                        <div className={`${isChatPanelOpen ? 'w-96' : 'w-12'} bg-white dark:bg-[#12141A] border-l border-gray-100 dark:border-[#1F2128] flex flex-col flex-shrink-0 transition-all duration-300`}>
                                            {/* Chat Header */}
                                            <div className="p-3 border-b border-gray-100 dark:border-[#1F2128] flex items-center justify-between">
                                                {isChatPanelOpen ? (
                                                    <>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                                                <Bot size={14} className="text-white" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-xs font-bold text-[#172B4D] dark:text-white">Doc Assistant</h3>
                                                                <p className="text-[10px] text-gray-400">Ask questions or request edits</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => setIsChatPanelOpen(false)}
                                                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F2128] rounded-lg transition-colors"
                                                        >
                                                            <PanelRightClose size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => setIsChatPanelOpen(true)}
                                                        className="w-full flex flex-col items-center gap-1 py-2 text-gray-400 hover:text-blue-500 transition-colors"
                                                    >
                                                        <PanelRightOpen size={18} />
                                                        <span className="text-[9px] font-bold uppercase tracking-wider">Chat</span>
                                                    </button>
                                                )}
                                            </div>

                                            {isChatPanelOpen && (
                                                <>
                                                    {/* Chat Messages */}
                                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                                                        {docChatMessages.length === 0 ? (
                                                            <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center mb-4">
                                                                    <MessageSquare size={24} className="text-blue-500" />
                                                                </div>
                                                                <h4 className="text-sm font-semibold text-[#172B4D] dark:text-white mb-2">Document Assistant</h4>
                                                                <p className="text-xs text-gray-400 mb-4">Ask questions about your documentation or request changes</p>
                                                                <div className="space-y-2 w-full">
                                                                    <button
                                                                        onClick={() => setDocChatInput("What are the key features described in this document?")}
                                                                        className="w-full text-left px-3 py-2 text-xs bg-gray-50 dark:bg-[#1F2128] hover:bg-gray-100 dark:hover:bg-[#2D2F36] rounded-lg text-gray-600 dark:text-gray-400 transition-colors flex items-center gap-2"
                                                                    >
                                                                        <HelpCircle size={12} className="text-blue-500 flex-shrink-0" />
                                                                        <span>What are the key features?</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setDocChatInput("Add a section about security considerations")}
                                                                        className="w-full text-left px-3 py-2 text-xs bg-gray-50 dark:bg-[#1F2128] hover:bg-gray-100 dark:hover:bg-[#2D2F36] rounded-lg text-gray-600 dark:text-gray-400 transition-colors flex items-center gap-2"
                                                                    >
                                                                        <PenLine size={12} className="text-purple-500 flex-shrink-0" />
                                                                        <span>Add a security section</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setDocChatInput("Make the language more technical and detailed")}
                                                                        className="w-full text-left px-3 py-2 text-xs bg-gray-50 dark:bg-[#1F2128] hover:bg-gray-100 dark:hover:bg-[#2D2F36] rounded-lg text-gray-600 dark:text-gray-400 transition-colors flex items-center gap-2"
                                                                    >
                                                                        <PenLine size={12} className="text-purple-500 flex-shrink-0" />
                                                                        <span>Make it more technical</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {docChatMessages.map((msg) => (
                                                                    <div
                                                                        key={msg.id}
                                                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                                                    >
                                                                        <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                                                                            {msg.role === 'assistant' && (
                                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                                                                        <Bot size={10} className="text-white" />
                                                                                    </div>
                                                                                    <span className="text-[10px] font-medium text-gray-400">Assistant</span>
                                                                                    {msg.type === 'edit' && msg.editApplied && (
                                                                                        <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded font-medium">
                                                                                            <CheckCircle2 size={9} /> Applied
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                            <div
                                                                                className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                                                                                    msg.role === 'user'
                                                                                        ? 'bg-blue-600 text-white rounded-br-md'
                                                                                        : 'bg-gray-100 dark:bg-[#1F2128] text-[#172B4D] dark:text-gray-200 rounded-bl-md'
                                                                                }`}
                                                                            >
                                                                                {msg.content}
                                                                            </div>
                                                                            <div className={`text-[9px] text-gray-400 mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                {isDocChatLoading && (
                                                                    <div className="flex items-center gap-2 px-3 py-2">
                                                                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                                                            <Bot size={10} className="text-white" />
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div ref={docChatEndRef} />
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Chat Input */}
                                                    <div className="p-3 border-t border-gray-100 dark:border-[#1F2128]">
                                                        <div className="flex items-end gap-2 bg-gray-50 dark:bg-[#0B0C0E] rounded-xl p-2 border border-gray-200 dark:border-[#1F2128] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                                            <textarea
                                                                value={docChatInput}
                                                                onChange={(e) => setDocChatInput(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                                        e.preventDefault();
                                                                        handleDocChatSubmit();
                                                                    }
                                                                }}
                                                                placeholder="Ask a question or request changes..."
                                                                rows={1}
                                                                className="flex-1 bg-transparent text-xs text-[#172B4D] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none resize-none max-h-24"
                                                                style={{ minHeight: '24px' }}
                                                            />
                                                            <button
                                                                onClick={handleDocChatSubmit}
                                                                disabled={isDocChatLoading || !docChatInput.trim()}
                                                                className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                                            >
                                                                {isDocChatLoading ? (
                                                                    <Loader2 size={14} className="animate-spin" />
                                                                ) : (
                                                                    <Send size={14} />
                                                                )}
                                                            </button>
                                                        </div>
                                                        <p className="text-[9px] text-gray-400 mt-2 text-center">
                                                            <span className="text-blue-500">Questions</span> search all docs &bull; <span className="text-purple-500">Edit requests</span> modify current doc
                                                        </p>
                                                    </div>
                                                </>
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
                        {/* Close Main Content Area */}

                            {/* Floating AI Chat - Fixed at bottom (only for review and planning, prd_view has sidebar chat) */}
                            {(step === 'review' || step === 'planning') && (
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
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center gap-2 transition-all"
                            >
                                <Layout size={14} /> Generate Plan
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

        {/* Exit Confirmation Dialog */}
        {showExitConfirmation && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={handleCancelExit}
                />

                {/* Dialog */}
                <div className="relative bg-white dark:bg-[#1A1D26] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2D2F36] w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                    {/* Header */}
                    <div className="p-6 pb-4">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle size={24} className="text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-[#172B4D] dark:text-white mb-1">
                                    Discard Progress?
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    You have unsaved work in the Product Architect. All generated documents, vision, and plans will be lost.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Progress Summary */}
                    <div className="px-6 pb-4">
                        <div className="bg-gray-50 dark:bg-[#0B0C0E] rounded-xl p-4 space-y-2">
                            {productName && (
                                <div className="flex items-center gap-2 text-xs">
                                    <Check size={12} className="text-green-500" />
                                    <span className="text-gray-600 dark:text-gray-400">Product: <span className="font-medium text-[#172B4D] dark:text-white">{productName}</span></span>
                                </div>
                            )}
                            {refinedVision && (
                                <div className="flex items-center gap-2 text-xs">
                                    <Check size={12} className="text-green-500" />
                                    <span className="text-gray-600 dark:text-gray-400">Vision generated</span>
                                </div>
                            )}
                            {Object.keys(generatedDocs).filter(k => generatedDocs[k]).length > 0 && (
                                <div className="flex items-center gap-2 text-xs">
                                    <Check size={12} className="text-green-500" />
                                    <span className="text-gray-600 dark:text-gray-400">{Object.keys(generatedDocs).filter(k => generatedDocs[k]).length} documents generated</span>
                                </div>
                            )}
                            {generatedEpics.length > 0 && (
                                <div className="flex items-center gap-2 text-xs">
                                    <Check size={12} className="text-green-500" />
                                    <span className="text-gray-600 dark:text-gray-400">{generatedEpics.length} epics with {generatedEpics.reduce((a, e) => a + e.tasks.length, 0)} tasks</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="px-6 pb-6 flex gap-3">
                        <button
                            onClick={handleCancelExit}
                            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#1F2128] hover:bg-gray-200 dark:hover:bg-[#2D2F36] rounded-xl transition-colors"
                        >
                            Continue Editing
                        </button>
                        <button
                            onClick={handleConfirmExit}
                            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 size={14} />
                            Discard & Exit
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default ProductGeneratorModal;
