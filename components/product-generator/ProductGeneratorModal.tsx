import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  FileText,
  Layout,
  File as FileIcon,
  Edit3,
  ChevronRight,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Task, User as UserType } from '../../types';
import TaskDetailModal from '../task-detail/TaskDetailModal';
import { useProjectData } from '../../context/ProjectDataContext';
import { useConfig } from '../../context/ConfigContext';
import { useToast } from '../../context/ToastContext';
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.0.379';
import mammoth from 'https://esm.sh/mammoth@1.6.0';
import { aiProvidersService } from '../../services/ai-providers.service';
import { createAIClient } from '../../lib/ai-multi-provider';

// Types
import {
  Suggestion,
  ProductGeneratorModalProps,
  DocSection,
  GeneratedTask,
  GeneratedEpic,
  DocChatMessage,
  WizardStep,
  STEPS,
} from './types';

// Utils
import {
  renderMarkdown,
  cleanJson,
  cleanHtml,
  generateWithRetry,
  generateWithFallback,
  getUserForRole,
  STEP_ICONS,
} from './utils';

// Fallback Notification
import { useFallbackNotification } from '../../hooks/useFallbackNotification';
import FallbackNotification from './FallbackNotification';

// Step Components
import InputStep from './InputStep';
import ProcessingOverlay from './ProcessingOverlay';
import ReviewStep from './ReviewStep';
import DocumentsStep from './DocumentsStep';
import PlanningStep from './PlanningStep';
import CreatingProjectOverlay from './CreatingProjectOverlay';

// Initialize PDF Worker
try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;
} catch (e) {
    console.warn("Failed to initialize PDF worker", e);
}

// Log AI configuration for debugging
const envVars = (import.meta as any).env || {};
console.log('[AI Config] Environment check:', {
  hasApiKey: !!envVars.VITE_SAIF_API_KEY,
  apiKeyPrefix: envVars.VITE_SAIF_API_KEY?.substring(0, 10) || 'NOT SET',
  baseUrl: envVars.VITE_SAIF_API_BASE_URL || 'https://model.iamsaif.ai/v1',
  defaultModel: envVars.VITE_SAIF_MODEL || 'openai/gpt-oss-120b'
});

const ProductGeneratorModal: React.FC<ProductGeneratorModalProps> = ({ isOpen, onClose, onCreate, onSaveDraft, draftProject }) => {
  const { organizationMembers, currentUser } = useProjectData();
  const users = organizationMembers.map(m => m.user);
  const { error: showError, warning, success, info } = useToast();
  const { docNavItems } = useConfig();
  const [step, setStep] = useState<WizardStep>('input');
  const [draftProjectId, setDraftProjectId] = useState<string | null>(draftProject?.id || null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // AI Provider State
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [customAiClient, setCustomAiClient] = useState<any | null>(null);

  // Fallback Notification Hook
  const { notification, showFallbackNotification, hideNotification } = useFallbackNotification();

  // Input Mode
  const [inputMode, setInputMode] = useState<'scratch' | 'import'>('scratch');

  // Form State
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // Dynamic Owner/Team Defaults
  const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const hasInitializedDefaults = useRef(false);

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

  // Document Chat Assistant State
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

  // Transition State
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
    if (step !== 'input') return true;
    if (productName || description || tags || uploadedFile || productImage) return true;
    if (Object.keys(generatedDocs).some(k => generatedDocs[k])) return true;
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
    setOwnerIds([]);
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

  const handleCloseAttempt = () => {
    if (hasUnsavedWork()) {
      setShowExitConfirmation(true);
    } else {
      resetAllState();
      onClose();
    }
  };

  const handleConfirmExit = () => {
    resetAllState();
    setShowExitConfirmation(false);
    onClose();
  };

  const handleCancelExit = () => {
    setShowExitConfirmation(false);
  };

  const handleSaveDraftAndExit = async () => {
    const success_result = await handleSaveDraft();
    if (success_result) {
      setShowExitConfirmation(false);
      onClose();
    }
  };

  const handleStepChange = (newStep: WizardStep, direction: 'forward' | 'backward') => {
    setTransitionDirection(direction);
    setIsTransitioning(true);
    if (direction === 'forward') {
      setCompletedSteps(prev => new Set([...prev, step]));
    }
    setTimeout(() => {
      setStep(newStep);
      setIsTransitioning(false);
    }, 200);
  };

  const getPreviousStep = (): WizardStep => {
    const stepOrder: WizardStep[] = ['input', 'review', 'prd_view', 'planning'];
    const currentIdx = stepOrder.indexOf(step);
    return currentIdx > 0 ? stepOrder[currentIdx - 1] : 'input';
  };

  // Load available AI providers when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadProviders = async () => {
      try {
        setIsLoadingProviders(true);
        const providers = await aiProvidersService.getAvailableProviders();
        const defaultProvider = await aiProvidersService.getDefaultProvider();

        setAvailableProviders(providers);
        setSelectedProvider(defaultProvider);

        // Create AI client for default provider
        const client = createAIClient({ provider: defaultProvider });
        setCustomAiClient(client);

        console.log('[Product Generator] Loaded AI providers:', {
          count: providers.length,
          default: defaultProvider?.display_name
        });
      } catch (error) {
        console.error('[Product Generator] Failed to load providers:', error);
        // Fallback to default client (SAIF AI)
        const fallbackClient = createAIClient();
        setCustomAiClient(fallbackClient);
      } finally {
        setIsLoadingProviders(false);
      }
    };

    loadProviders();
  }, [isOpen]);

  // Initialize form defaults (only once when modal opens)
  useEffect(() => {
      if (isOpen && currentUser && users.length > 0 && !draftProject && !hasInitializedDefaults.current) {
          hasInitializedDefaults.current = true;
          setOwnerIds([currentUser.id]);
          const team = [currentUser.id, ...users.filter(u => u.id !== currentUser.id).slice(0, 2).map(u => u.id)];
          setSelectedTeam(team);
      }
      if (!isOpen) {
          hasInitializedDefaults.current = false;
      }
  }, [isOpen, currentUser, users, draftProject]);

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

  // Load draft data when resuming
  useEffect(() => {
    if (draftProject && draftProject.draftData) {
      const data = draftProject.draftData;
      setDraftProjectId(draftProject.id);
      setProductName(data.productName || '');
      setDescription(data.description || '');
      setTags(data.tags || '');
      setStartDate(data.startDate || new Date().toISOString().split('T')[0]);
      setTargetDate(data.targetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setOwnerIds(data.ownerIds || (data.ownerId ? [data.ownerId] : [currentUser?.id || users[0]?.id || ''].filter(Boolean)));
      setSelectedTeam(data.selectedTeam || []);
      setRefinedVision(data.refinedVision || '');
      setSuggestions(data.suggestions || []);
      setGeneratedDocs(data.generatedDocs || {});
      setGeneratedEpics(data.generatedEpics || []);
      setInputMode(data.inputMode || 'scratch');
      setFileText(data.fileText || '');
      setProductImage(data.productImage || null);

      const restoredDocs = data.generatedDocs || {};
      const restoredProgress: Record<string, 'pending' | 'generating' | 'completed' | 'error'> = {};
      Object.keys(restoredDocs).forEach(key => {
        if (restoredDocs[key]) {
          restoredProgress[key] = 'completed';
        }
      });
      setDocGenerationProgress(restoredProgress);

      const stepMap: Record<number, WizardStep> = {
        1: 'input',
        2: 'review',
        3: 'prd_view',
        4: 'planning'
      };
      if (draftProject.draftStep) {
        setStep(stepMap[draftProject.draftStep] || 'input');
        setCompletedSteps(new Set(Object.values(stepMap).slice(0, draftProject.draftStep)));
      }

      info(`Resuming from draft: ${draftProject.name}`);
    }
  }, [draftProject]);

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

  // 1. Initial Generation
  // Handler: Change AI Provider
  const handleProviderChange = (provider: any) => {
    setSelectedProvider(provider);
    const client = createAIClient({ provider });
    setCustomAiClient(client);
    console.log('[Product Generator] Switched to provider:', provider.display_name);
  };

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
                Act as a Product Manager preparing a product for engineering implementation.
                Analyze the provided document content below and transform it into an actionable product blueprint.

                DOCUMENT CONTENT:
                ${content.substring(0, 150000)}

                Your goal: Create a comprehensive, implementation-ready product plan with clear user flows.

                Tasks:
                1. Extract or infer the product name.

                2. Write a concise elevator pitch (1-2 sentences) that explains what the product does and who it's for.

                3. **Create a Detailed Product Vision** that includes:

                   **Target Users & Pain Points**
                   - Define 2-3 specific user personas (roles, not names)
                   - List the key problems they face that this product solves
                   - Explain why existing solutions fall short

                   **Core Value Proposition**
                   - What makes this product unique and valuable?
                   - What is the "magic moment" when users realize the value?

                   **Primary User Flows** (CRITICAL - be specific)
                   For each major use case, describe the step-by-step user journey:
                   - Flow 1: [Name] - Numbered steps from entry point to completion
                   - Flow 2: [Name] - Numbered steps from entry point to completion
                   - Flow 3: [Name] - Numbered steps from entry point to completion

                   **User Stories** (Format: "As a [user], I want [action], so that [benefit]")
                   - List 5-8 core user stories that drive the feature set

                   **Key Features & Capabilities**
                   - Preserve ALL original features from the document
                   - Organize into MVP (Phase 1) vs Future Enhancements (Phase 2+)
                   - For each feature, note the user story it supports

                   **Success Metrics**
                   - How will you measure if the product is successful?
                   - What are the key KPIs to track?

                   The vision should be comprehensive (500-800 words) and actionable for an engineering team.

                4. **Strategic Suggestions**: Brainstorm 5 specific, high-impact suggestions to enhance the product (features, integrations, or differentiators).

                Output the response in STRICT JSON format:
                {
                  "productName": "string",
                  "description": "string (concise elevator pitch)",
                  "vision": "string (comprehensive markdown-formatted vision with sections above)",
                  "suggestions": [
                    { "title": "string", "description": "string", "type": "feature" }
                  ]
                }
              `;
          } else {
              prompt = `
                Act as a Product Manager preparing a product for engineering implementation.
                Transform this product concept into an actionable product blueprint with clear user flows.

                PRODUCT CONCEPT:
                - Product Name: ${productName}
                - Description: ${description || 'No specific description provided, please infer from name and tags.'}
                - Tags/Category: ${tags}

                Your goal: Create a comprehensive, implementation-ready product plan.

                Tasks:
                1. Refine the product name if needed (keep it concise and memorable).

                2. Write a compelling elevator pitch (1-2 sentences) that explains what the product does and who it's for.

                3. **Develop a Detailed Product Vision** that includes:

                   **Target Users & Pain Points**
                   - Define 2-3 specific user personas (e.g., "Small business owner", "Enterprise IT manager")
                   - List the key problems they face that this product solves
                   - Explain the impact of these pain points on their work/life

                   **Core Value Proposition**
                   - What makes this product unique and compelling?
                   - What is the "magic moment" when users realize the value?
                   - Why would users choose this over alternatives?

                   **Primary User Flows** (CRITICAL - be specific and detailed)
                   Map out 3-4 key user journeys with numbered steps:

                   Example format:
                   **Flow 1: First-Time User Onboarding**
                   1. User lands on welcome screen and sees value proposition
                   2. User selects their role/use case from predefined options
                   3. System configures personalized dashboard based on selection
                   4. User completes guided tutorial (3-4 key actions)
                   5. User reaches "aha moment" by completing first meaningful task

                   [Create similar detailed flows for other core use cases]

                   **User Stories** (Format: "As a [user], I want [action], so that [benefit]")
                   - List 6-10 core user stories that cover the main functionality
                   - Prioritize by impact (mark as MVP or Phase 2)

                   **Key Features & Capabilities**
                   - List all core features organized by category
                   - Clearly separate MVP features from future enhancements
                   - For each feature, note which user story/flow it supports

                   **Technical Considerations**
                   - Key integrations or APIs needed
                   - Data storage and security requirements
                   - Performance or scalability considerations

                   **Success Metrics**
                   - Define 3-5 KPIs to measure product success
                   - Include both engagement and business metrics

                   The vision should be substantial (400-600 words), well-structured, and actionable for an engineering team to start building.

                4. **Strategic Suggestions**: Brainstorm 5 specific, high-impact ideas to enhance the product (features, integrations, growth strategies, or UX differentiators).

                Output strictly in this JSON format:
                {
                  "productName": "string (refined name if appropriate)",
                  "description": "string (concise elevator pitch)",
                  "vision": "string (comprehensive markdown-formatted vision with all sections above)",
                  "suggestions": [
                    { "title": "string", "description": "string (one sentence)", "type": "feature" }
                  ]
                }
              `;
          }

          parts.push({ text: prompt });
          setLoadingStatus('Generating product vision with AI...');

          const fallbackResult = await generateWithFallback({
              model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
              contents: [{ role: 'user', parts }],
              config: {
                  responseMimeType: 'application/json'
              }
          }, selectedProvider, 3, 3);

          // Show notification if fallback occurred
          if (fallbackResult.hadFallback) {
              showFallbackNotification(
                  'fallback',
                  fallbackResult.attempts[0].provider.display_name,
                  fallbackResult.providerUsed.display_name
              );
          }

          const response = fallbackResult.response;
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
          if (data.description && (!description || inputMode === 'import')) setDescription(data.description);
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
          showError('Generation Failed', errorMsg);
          setStep('input');
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
          const fallbackResult = await generateWithFallback({
              model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: {
                  responseMimeType: 'application/json'
              }
          }, selectedProvider, 3, 3);

          if (fallbackResult.hadFallback) {
              showFallbackNotification('fallback',
                  fallbackResult.attempts[0].provider.display_name,
                  fallbackResult.providerUsed.display_name);
          }

          const response = fallbackResult.response;
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

          const prdFallbackResult = await generateWithFallback({
              model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
              contents: [{ role: 'user', parts: [{ text: prdPrompt }] }]
          }, selectedProvider, 3, 3);

          if (prdFallbackResult.hadFallback) {
              showFallbackNotification('fallback',
                  prdFallbackResult.attempts[0].provider.display_name,
                  prdFallbackResult.providerUsed.display_name);
          }

          const prdResponse = prdFallbackResult.response;
          const prdContent = cleanHtml(prdResponse.text || '<p>Error generating PRD</p>');
          setGeneratedDocs(prev => ({ ...prev, prd: prdContent }));
          setDocGenerationProgress(prev => ({ ...prev, prd: 'completed' }));
          handleStepChange('prd_view', 'forward');
          setMessages([]);

          // Initialize progress for all sections
          const sectionsToGenerate = docNavItems.filter(s => s.id !== 'prd');
          setDocGenerationProgress(prev => {
              const initial: Record<string, 'pending' | 'generating' | 'completed' | 'error'> = { ...prev };
              sectionsToGenerate.forEach(s => { initial[s.id] = 'pending'; });
              return initial;
          });

          // Generate each document separately
          for (let i = 0; i < sectionsToGenerate.length; i++) {
              const sec = sectionsToGenerate[i];
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

                  const docFallbackResult = await generateWithFallback({
                      model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
                      contents: [{ role: 'user', parts: [{ text: docPrompt }] }]
                  }, selectedProvider, 3, 3);

                  if (docFallbackResult.hadFallback) {
                      showFallbackNotification('fallback',
                          docFallbackResult.attempts[0].provider.display_name,
                          docFallbackResult.providerUsed.display_name);
                  }

                  const res = docFallbackResult.response;
                  const docContent = cleanHtml(res.text || '<p>Error generating content</p>');
                  setGeneratedDocs(prev => ({ ...prev, [sec.id]: docContent }));
                  setDocGenerationProgress(prev => ({ ...prev, [sec.id]: 'completed' }));

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

      } catch (error) {
          console.error("Failed to generate PRD", error);
          handleStepChange('review', 'backward');
          showError('Generation Failed', 'Failed to generate documentation. Please check your API quota or try again later.');
      }
  };

  const handleRetryDocument = async (sectionId: string) => {
      const section = docNavItems.find(s => s.id === sectionId);
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

          const retryFallbackResult = await generateWithFallback({
              model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
              contents: [{ role: 'user', parts: [{ text: docPrompt }] }]
          }, selectedProvider, 3, 3);

          if (retryFallbackResult.hadFallback) {
              showFallbackNotification('fallback',
                  retryFallbackResult.attempts[0].provider.display_name,
                  retryFallbackResult.providerUsed.display_name);
          }

          const res = retryFallbackResult.response;
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
      const allDocsComplete = docNavItems.every(doc =>
          docGenerationProgress[doc.id] === 'completed'
      );

      if (!allDocsComplete) {
          const pendingDocs = docNavItems.filter(doc =>
              docGenerationProgress[doc.id] !== 'completed'
          ).map(doc => {
              const status = docGenerationProgress[doc.id];
              return status === 'error' ? `${doc.label} (failed - please retry)` : doc.label;
          });

          alert(`Please wait for all documentation to be generated before creating the plan.\n\nPending documents:\n${pendingDocs.join('\n')}`);
          return;
      }

      setStep('generating_docs');
      setLoadingStatus('Preparing project plan context...');

      const fullContext = Object.entries(generatedDocs)
        .map(([key, content]) => `--- SECTION: ${key.toUpperCase()} ---\n${content}`)
        .join('\n\n');

      const contextToUse = (fullContext || refinedVision) + (fileText ? `\n\nOriginal Source Material: ${fileText.substring(0, 150000)}` : '');

      setLoadingStatus('Analyzing documentation for epic breakdown...');

      const epicCategories = [
        {
          id: 'infrastructure',
          name: 'Infrastructure & Setup',
          emoji: '\u{1F3D7}\uFE0F',
          focus: 'Project Setup, CI/CD, environments, tooling, repository structure, development workflows',
          docTypes: ['Technology Architecture', 'ADRs'],
          minTasks: 8
        },
        {
          id: 'database',
          name: 'Database & Data Layer',
          emoji: '\u{1F5C4}\uFE0F',
          focus: 'Database schemas, migrations, seeds, indexes, data models, ETL pipelines, data validation',
          docTypes: ['Data Architecture', 'Technical Specifications'],
          minTasks: 10
        },
        {
          id: 'auth',
          name: 'Authentication & Authorization',
          emoji: '\u{1F510}',
          focus: 'Login, signup, password reset, JWT tokens, sessions, roles, permissions, OAuth, SSO',
          docTypes: ['PRD', 'Application Architecture', 'Technical Specifications'],
          minTasks: 12
        },
        {
          id: 'user_management',
          name: 'User Management',
          emoji: '\u{1F464}',
          focus: 'User profiles, settings, preferences, avatars, account management, notifications',
          docTypes: ['PRD', 'Business Workflows'],
          minTasks: 8
        },
        {
          id: 'core_features_1',
          name: 'Core Features - Part 1',
          emoji: '\u{1F3AF}',
          focus: 'Primary product features from PRD sections 1-3, main user journeys, key functionality',
          docTypes: ['PRD', 'Business Architecture', 'Roadmap'],
          minTasks: 15
        },
        {
          id: 'core_features_2',
          name: 'Core Features - Part 2',
          emoji: '\u{1F3AF}',
          focus: 'Secondary product features from PRD sections 4+, additional functionality, advanced features',
          docTypes: ['PRD', 'Business Architecture', 'Roadmap'],
          minTasks: 15
        },
        {
          id: 'api_development',
          name: 'API Development',
          emoji: '\u{1F50C}',
          focus: 'REST/GraphQL endpoints, request validation, error handling, rate limiting, API versioning',
          docTypes: ['Technical Specifications', 'Application Architecture'],
          minTasks: 12
        },
        {
          id: 'ui_components',
          name: 'UI Components & Design System',
          emoji: '\u{1F3A8}',
          focus: 'Reusable components, design system, forms, buttons, modals, navigation, layouts',
          docTypes: ['Design Documents', 'PRD'],
          minTasks: 12
        },
        {
          id: 'ui_pages',
          name: 'UI Pages & User Flows',
          emoji: '\u{1F4F1}',
          focus: 'Page implementations, user flows, responsive design, animations, accessibility',
          docTypes: ['Design Documents', 'PRD', 'Business Workflows'],
          minTasks: 12
        },
        {
          id: 'analytics',
          name: 'Analytics & Monitoring',
          emoji: '\u{1F4CA}',
          focus: 'Event tracking, logging, dashboards, alerts, performance monitoring, error tracking',
          docTypes: ['System Workflows', 'Technology Architecture'],
          minTasks: 8
        },
        {
          id: 'testing',
          name: 'Testing & Quality Assurance',
          emoji: '\u{1F9EA}',
          focus: 'Unit tests, integration tests, e2e tests, performance tests, security tests, test infrastructure',
          docTypes: ['ADRs', 'Technical Specifications'],
          minTasks: 10
        },
        {
          id: 'deployment',
          name: 'Deployment & DevOps',
          emoji: '\u{1F680}',
          focus: 'Staging, production environments, rollback strategies, containerization, scaling',
          docTypes: ['Technology Architecture', 'System Workflows'],
          minTasks: 8
        },
        {
          id: 'integrations',
          name: 'Third-Party Integrations',
          emoji: '\u{1F517}',
          focus: 'External APIs, webhooks, payment gateways, email services, cloud services, sync jobs',
          docTypes: ['Integration Workflows', 'Technical Specifications'],
          minTasks: 10
        },
        {
          id: 'documentation',
          name: 'Documentation & Onboarding',
          emoji: '\u{1F4D6}',
          focus: 'API documentation, user guides, developer onboarding, README files, architecture docs',
          docTypes: ['All Documents'],
          minTasks: 6
        }
      ];

      const generateCategoryPrompt = (category: typeof epicCategories[0], context: string) => `
You are a Senior Product Manager creating a DETAILED epic for: ${category.emoji} ${category.name}

PRODUCT CONTEXT:
Product: ${productName}
Vision: ${refinedVision.substring(0, 3000)}

RELEVANT DOCUMENTATION:
${context.substring(0, 40000)}

YOUR TASK:
Generate 2-3 comprehensive epics focused ONLY on "${category.name}" covering: ${category.focus}

REQUIREMENTS:
- Each epic MUST have ${category.minTasks}-15 granular, actionable tasks
- Tasks should be atomic - one clear action per task
- Include implementation details in descriptions

TASK DESCRIPTION FORMAT (use HTML):
<p>
  <strong>📋 User Story:</strong> As a [role], I want [feature] so that [benefit].<br/><br/>
  <strong>📄 Source:</strong> ${category.docTypes.join('/')}<br/><br/>
  <strong>🔧 Implementation:</strong>
  <ul>
    <li>File paths to create/modify</li>
    <li>Libraries to use</li>
    <li>Key code patterns</li>
  </ul>
  <strong>✅ Acceptance Criteria:</strong>
  <ul>
    <li>Testable condition 1</li>
    <li>Testable condition 2</li>
  </ul>
</p>

TASK TYPES: 'story' (user-facing), 'task' (technical), 'feature' (new capability), 'bug' (fix)
STORY POINTS: 1 (tiny), 2 (small), 3 (medium), 5 (large), 8 (very large)
ROLES: "Frontend", "Backend", "Full-Stack", "DevOps", "QA", "Design"

OUTPUT FORMAT (STRICT JSON ONLY - NO MARKDOWN):
{
  "epics": [
    {
      "title": "${category.emoji} Epic Title",
      "description": "2-3 sentence description of business value",
      "tasks": [
        {
          "title": "Specific actionable task",
          "description": "<p>...</p>",
          "type": "task",
          "points": 3,
          "role": "Full-Stack"
        }
      ]
    }
  ]
}

Generate comprehensive, production-ready tasks. A real team will build from this plan.`;

      const parseEpicsFromResponse = (responseText: string): any[] => {
        try {
          const text = cleanJson(responseText || '[]');
          const parsed = JSON.parse(text);

          if (parsed.epics && Array.isArray(parsed.epics)) {
            return parsed.epics;
          } else if (Array.isArray(parsed)) {
            return parsed;
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
            return findEpicsArray(parsed) || [];
          }
        } catch (e) {
          console.error("Failed to parse epics JSON", e);
        }
        return [];
      };

      try {
          setLoadingStatus('Generating comprehensive project plan (0/14 categories)...');

          let allEpics: any[] = [];
          let completedCategories = 0;
          const totalCategories = epicCategories.length;

          const batchSize = 3;
          for (let i = 0; i < epicCategories.length; i += batchSize) {
            const batch = epicCategories.slice(i, i + batchSize);

            const batchPromises = batch.map(async (category) => {
              try {
                const categoryPrompt = generateCategoryPrompt(category, contextToUse);
                const fallbackResult1 = await generateWithFallback({
                  model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
                  contents: [{ role: 'user', parts: [{ text: categoryPrompt }] }],
                  config: { responseMimeType: "application/json" }
                }, selectedProvider, 3, 3);

                if (fallbackResult1.hadFallback) {
                  showFallbackNotification('fallback',
                    fallbackResult1.attempts[0].provider.display_name,
                    fallbackResult1.providerUsed.display_name);
                }

                const response = fallbackResult1.response;

                const epics = parseEpicsFromResponse(response.text || '');
                console.log(`Category ${category.name}: generated ${epics.length} epics with ${epics.reduce((acc: number, e: any) => acc + (e.tasks?.length || 0), 0)} tasks`);

                completedCategories++;
                setLoadingStatus(`Generating comprehensive project plan (${completedCategories}/${totalCategories} categories)...`);

                return epics;
              } catch (error) {
                console.error(`Failed to generate epics for ${category.name}:`, error);
                completedCategories++;
                setLoadingStatus(`Generating comprehensive project plan (${completedCategories}/${totalCategories} categories)...`);
                return [];
              }
            });

            const batchResults = await Promise.all(batchPromises);
            batchResults.forEach(epics => {
              allEpics = [...allEpics, ...epics];
            });

            if (i + batchSize < epicCategories.length) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          setLoadingStatus('Processing and organizing project plan...');
          console.log('Total epics generated:', allEpics.length);
          console.log('Total tasks:', allEpics.reduce((acc, e) => acc + (e.tasks?.length || 0), 0));

          let rawEpics = allEpics;

          if (rawEpics.length < 5) {
              console.warn('Not enough epics generated. Running fallback generation...');
              setLoadingStatus('Running fallback generation for missing areas...');

              const fallbackPrompt = `You are a Senior Product Manager. Create a comprehensive project plan.

Product: ${productName}
Vision: ${refinedVision.substring(0, 5000)}

Generate 10-15 epics covering ALL aspects of building this product:
- Infrastructure & Setup
- Database & Data Layer
- Authentication & Security
- User Management
- Core Features (multiple epics)
- API Development
- UI/UX Implementation
- Testing & QA
- Deployment
- Integrations
- Documentation

Each epic needs 8-12 detailed tasks with descriptions including user story, implementation steps, and acceptance criteria.

OUTPUT ONLY VALID JSON:
{"epics":[{"title":"Epic","description":"Description","tasks":[{"title":"Task","description":"<p>Details...</p>","type":"task","points":3,"role":"Full-Stack"}]}]}`;

              const fallbackResult2 = await generateWithFallback({
                  model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
                  contents: [{ role: 'user', parts: [{ text: fallbackPrompt }] }],
                  config: { responseMimeType: "application/json" }
              }, selectedProvider, 3, 3);

              if (fallbackResult2.hadFallback) {
                showFallbackNotification('fallback',
                  fallbackResult2.attempts[0].provider.display_name,
                  fallbackResult2.providerUsed.display_name);
              }

              const fallbackResponse = fallbackResult2.response;

              const fallbackEpics = parseEpicsFromResponse(fallbackResponse.text || '');
              if (fallbackEpics.length > 0) {
                rawEpics = [...rawEpics, ...fallbackEpics];
              }
          }

          if (rawEpics.length === 0) {
              throw new Error('Failed to generate project plan. Please try again.');
          }

          setLoadingStatus(`Building ${rawEpics.length} epics and assigning tasks...`);

          const projectStart = startDate ? new Date(startDate) : new Date();
          const hydratedEpics: GeneratedEpic[] = rawEpics.map((epic: any, eIdx: number) => ({
              id: `epic-${eIdx}`,
              title: epic.title || 'Untitled Epic',
              description: epic.description || '',
              tasks: Array.isArray(epic.tasks) ? epic.tasks.map((task: any, tIdx: number) => {
                  const assignedUser = getUserForRole(task.role, users);
                  const dueDate = new Date(projectStart);
                  dueDate.setDate(projectStart.getDate() + 3 + (eIdx * 2));

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

      } catch (error: any) {
          console.error('[Epic Generation] Failed to generate plan:', error);
          handleStepChange('prd_view', 'backward');
          const errorMessage = error.message || 'Unknown error occurred';
          const detailedMessage = `Failed to generate project plan: ${errorMessage}.

Possible causes:
\u2022 AI service connection issue
\u2022 Invalid response from AI model
\u2022 API rate limiting

Please check the browser console for detailed logs and try again.`;
          showError('Planning Failed', detailedMessage);
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

          const fallbackResult3 = await generateWithFallback({
              model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: { responseMimeType: 'application/json' }
          }, selectedProvider, 3, 3);

          if (fallbackResult3.hadFallback) {
            showFallbackNotification('fallback',
              fallbackResult3.attempts[0].provider.display_name,
              fallbackResult3.providerUsed.display_name);
          }

          const response = fallbackResult3.response;

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
                      const assignedUser = getUserForRole(t.role, users);
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
          ownerIds,
          ownerId: ownerIds[0] || '',
          imageUrl: productImage
      };

      try {
          if (onCreate) {
              await onCreate(projectData);
          } else {
              setTimeout(onClose, 2000);
          }

          clearInterval(progressInterval);
          setCreationProgress(100);
      } catch (err: any) {
          clearInterval(progressInterval);
          console.error('Failed to create project:', err);
          showError(err?.message || 'Failed to create project. Please try again.');
          setStep('planning');
      }
  };

  const handleSaveDraft = async (): Promise<boolean> => {
      if (!onSaveDraft) return false;

      setIsSavingDraft(true);

      try {
          const stepMap = {
              'input': 1,
              'review': 2,
              'prd_view': 3,
              'planning': 4
          };

          const draftData = {
              productName,
              description,
              tags,
              startDate,
              targetDate,
              ownerIds,
              selectedTeam,
              refinedVision,
              suggestions,
              generatedDocs,
              generatedEpics,
              inputMode,
              fileText,
              productImage
          };

          const savedDraftId = await onSaveDraft({
              id: draftProjectId,
              name: productName || 'Untitled Product',
              description,
              status: 'draft',
              draft_step: stepMap[step as keyof typeof stepMap] || 1,
              draft_data: draftData,
              vision: refinedVision,
              docs: generatedDocs
          });

          if (savedDraftId && typeof savedDraftId === 'string') {
              setDraftProjectId(savedDraftId);
          }

          if (step === 'prd_view' && savedDraftId) {
              const incompleteDocs = docNavItems.filter(doc => !generatedDocs[doc.id]);
              if (incompleteDocs.length > 0) {
                  info('Draft saved! Documents are being generated in the background...');
                  generateDocsInBackground(savedDraftId as string, incompleteDocs);
              } else {
                  success('Draft saved successfully! You can resume from where you left off.');
              }
          } else {
              success('Draft saved successfully! You can resume from where you left off.');
          }
          return true;
      } catch (error) {
          console.error('Failed to save draft:', error);
          showError('Failed to save draft. Please try again.');
          return false;
      } finally {
          setIsSavingDraft(false);
      }
  };

  const generateDocsInBackground = async (draftId: string, incompleteDocs: Array<{id: string; label: string}>) => {
      try {
          const context = `
            Product: ${productName}
            Description: ${description}
            Refined Vision: ${refinedVision}
            Tags: ${tags}
            ${fileText ? `\nOriginal Document Context:\n${fileText.substring(0, 150000)}` : ''}
          `;

          let accumulatedDocs = { ...generatedDocs };

          for (const doc of incompleteDocs) {
              try {
                  const docPrompt = `
                    Role: Chief Product Architect.
                    Task: Generate the "${doc.label}" document.
                    Context Summary: ${context}

                    **Style Guide:**
                    - Use 'bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#2D2F36] p-6 mb-6' for main containers.
                    - Use <h2> for section headers (text-xl font-bold mb-4).
                    - Use tables for structured data.
                    - Make it look professional, spacious, and easy to read.

                    Output strictly valid HTML using Tailwind CSS classes. No markdown.
                  `;

                  const bgFallbackResult = await generateWithFallback({
                      model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
                      contents: [{ role: 'user', parts: [{ text: docPrompt }] }]
                  }, selectedProvider, 3, 3);

                  if (bgFallbackResult.hadFallback) {
                      showFallbackNotification('fallback',
                          bgFallbackResult.attempts[0].provider.display_name,
                          bgFallbackResult.providerUsed.display_name);
                  }

                  const res = bgFallbackResult.response;
                  if (res.text && onSaveDraft) {
                      const newDoc = cleanHtml(res.text);
                      accumulatedDocs = { ...accumulatedDocs, [doc.id]: newDoc };

                      await onSaveDraft({
                          id: draftId,
                          name: productName || 'Untitled Product',
                          description,
                          status: 'draft',
                          draft_step: 3,
                          draft_data: {
                              productName,
                              description,
                              tags,
                              startDate,
                              targetDate,
                              ownerIds,
                              selectedTeam,
                              refinedVision,
                              suggestions,
                              generatedDocs: accumulatedDocs,
                              generatedEpics,
                              inputMode,
                              fileText,
                              productImage
                          },
                          vision: refinedVision,
                          docs: accumulatedDocs
                      });
                  }
              } catch (error) {
                  console.error(`Failed to generate ${doc.label}:`, error);
              }
          }
      } catch (error) {
          console.error('Background doc generation failed:', error);
      }
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
              const reviewFallbackResult = await generateWithFallback({
                  model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
                  contents: [{ role: 'user', parts: [{ text: prompt }] }]
              }, selectedProvider, 3, 3);

              if (reviewFallbackResult.hadFallback) {
                  showFallbackNotification('fallback',
                      reviewFallbackResult.attempts[0].provider.display_name,
                      reviewFallbackResult.providerUsed.display_name);
              }

              const res = reviewFallbackResult.response;
              setRefinedVision(res.text || refinedVision);
              setMessages(prev => [...prev, { role: 'ai', text: "Vision updated." }]);
          }
          else if (step === 'prd_view') {
              const currentContent = generatedDocs[activeDocSection] || '';
              const sectionName = docNavItems.find(d => d.id === activeDocSection)?.label || 'Document';
              const prompt = `
                You are editing the "${sectionName}" section of a PRD.
                Current Content (HTML): ${currentContent}
                User Request: "${userMsg}"

                Return the FULL updated HTML for this section based on the request. Do not wrap in markdown.
              `;
              const prdEditFallbackResult = await generateWithFallback({
                  model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
                  contents: [{ role: 'user', parts: [{ text: prompt }] }]
              }, selectedProvider, 3, 3);

              if (prdEditFallbackResult.hadFallback) {
                  showFallbackNotification('fallback',
                      prdEditFallbackResult.attempts[0].provider.display_name,
                      prdEditFallbackResult.providerUsed.display_name);
              }

              const res = prdEditFallbackResult.response;
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
              const planningFallbackResult = await generateWithFallback({
                  model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
                  contents: [{ role: 'user', parts: [{ text: prompt }] }],
                  config: { responseMimeType: 'application/json' }
              }, selectedProvider, 3, 3);

              if (planningFallbackResult.hadFallback) {
                  showFallbackNotification('fallback',
                      planningFallbackResult.attempts[0].provider.display_name,
                      planningFallbackResult.providerUsed.display_name);
              }

              const res = planningFallbackResult.response;
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

  // Enhanced Document Chat Handler
  const handleDocChatSubmit = async () => {
      if (!docChatInput.trim() || isDocChatLoading) return;

      const userMessage = docChatInput.trim();
      setDocChatInput('');

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
          const sectionName = docNavItems.find(d => d.id === activeDocSection)?.label || 'Document';

          const allDocsContext = Object.entries(generatedDocs)
              .filter(([_, content]) => content)
              .map(([id, content]) => {
                  const docName = docNavItems.find(d => d.id === id)?.label || id;
                  const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                  return `=== ${docName.toUpperCase()} ===\n${textContent}`;
              })
              .join('\n\n---\n\n');

          if (isEditRequest) {
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

              const editFallbackResult = await generateWithFallback({
                  model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
                  contents: [{ role: 'user', parts: [{ text: prompt }] }]
              }, selectedProvider, 3, 3);

              if (editFallbackResult.hadFallback) {
                  showFallbackNotification('fallback',
                      editFallbackResult.attempts[0].provider.display_name,
                      editFallbackResult.providerUsed.display_name);
              }

              const res = editFallbackResult.response;
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

              const qnaFallbackResult = await generateWithFallback({
                  model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
                  contents: [{ role: 'user', parts: [{ text: prompt }] }]
              }, selectedProvider, 3, 3);

              if (qnaFallbackResult.hadFallback) {
                  showFallbackNotification('fallback',
                      qnaFallbackResult.attempts[0].provider.display_name,
                      qnaFallbackResult.providerUsed.display_name);
              }

              const res = qnaFallbackResult.response;
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

  // Stepper Component
  const StepIndicator = () => {
    const progressPercent = (currentStepIndex / (STEPS.length - 1)) * 100;

    return (
      <div className="border-b border-gray-100 dark:border-[#1F2128] bg-gray-50/50 dark:bg-[#0B0C0E]/50">
        {/* Desktop Stepper */}
        <div className="hidden md:flex items-center justify-center gap-2 py-4 px-6 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {STEPS.map((s, idx) => {
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            const Icon = STEP_ICONS[s.id as keyof typeof STEP_ICONS];
            const canNavigate = isCompleted && !isTransitioning;
            const targetStep = s.id as WizardStep;

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

        {/* Mobile Stepper */}
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

  // Step Summary Component
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
    <div className="fixed inset-0 z-50 bg-white dark:bg-[#0A0B0D] animate-in fade-in duration-200">
        <div className="h-full w-full flex flex-col overflow-hidden">

            {/* Header */}
            {step !== 'creating_project' && (
            <div className="px-6 py-3 border-b border-gray-200 dark:border-[#1F2128] flex justify-between items-center bg-white dark:bg-[#0A0B0D] z-10 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-[#172B4D] dark:text-white">Product Architect</h2>
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

            {/* Step Indicator */}
            {(step === 'review' || step === 'prd_view' || step === 'planning') && <StepIndicator />}

            {/* Content Body */}
            <div className="flex-1 overflow-hidden relative flex flex-col">

                {/* Step 1: Input & Metadata */}
                {step === 'input' && (
                    <InputStep
                        inputMode={inputMode}
                        setInputMode={setInputMode}
                        productName={productName}
                        setProductName={setProductName}
                        description={description}
                        setDescription={setDescription}
                        tags={tags}
                        setTags={setTags}
                        startDate={startDate}
                        setStartDate={setStartDate}
                        targetDate={targetDate}
                        setTargetDate={setTargetDate}
                        ownerIds={ownerIds}
                        toggleOwner={(userId: string) => setOwnerIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId])}
                        selectedTeam={selectedTeam}
                        toggleTeamMember={toggleTeamMember}
                        users={users}
                        productImage={productImage}
                        uploadedFile={uploadedFile}
                        isExtracting={isExtracting}
                        fileInputRef={fileInputRef}
                        productImageInputRef={productImageInputRef}
                        handleFileUpload={handleFileUpload}
                        handleProductImageUpload={handleProductImageUpload}
                        handleGenerate={handleGenerate}
                        handleSaveDraft={handleSaveDraft}
                        isSavingDraft={isSavingDraft}
                        isTransitioning={isTransitioning}
                        transitionDirection={transitionDirection}
                        availableProviders={availableProviders}
                        selectedProvider={selectedProvider}
                        onProviderChange={handleProviderChange}
                        isLoadingProviders={isLoadingProviders}
                    />
                )}

                {/* Loading States */}
                {(step === 'processing' || step === 'generating_docs') && (
                    <ProcessingOverlay
                        step={step}
                        progress={progress}
                        loadingStatus={loadingStatus}
                        docNavItems={docNavItems}
                        docGenerationProgress={docGenerationProgress}
                        currentGeneratingDoc={currentGeneratingDoc}
                        generatedDocs={generatedDocs}
                    />
                )}

                {/* Creating Project State */}
                {step === 'creating_project' && (
                    <CreatingProjectOverlay creationProgress={creationProgress} />
                )}

                {/* Review, PRD View, Planning Steps */}
                {(step === 'review' || step === 'prd_view' || step === 'planning') && (
                     <div className="flex-1 flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-300">
                        {/* Main Content Area */}
                        <div className="flex-1 flex min-h-0 overflow-hidden">

                                {/* Review Step */}
                                {step === 'review' && (
                                    <ReviewStep
                                        isTransitioning={isTransitioning}
                                        transitionDirection={transitionDirection}
                                        productName={productName}
                                        productImage={productImage}
                                        description={description}
                                        tags={tags}
                                        refinedVision={refinedVision}
                                        setRefinedVision={setRefinedVision}
                                        suggestions={suggestions}
                                        toggleSuggestion={toggleSuggestion}
                                        handleMoreSuggestions={handleMoreSuggestions}
                                        isAiLoading={isAiLoading}
                                        handleStepChange={handleStepChange}
                                        StepSummary={StepSummary}
                                    />
                                )}

                                {/* PRD View Step */}
                                {step === 'prd_view' && (
                                    <DocumentsStep
                                        isTransitioning={isTransitioning}
                                        transitionDirection={transitionDirection}
                                        refinedVision={refinedVision}
                                        suggestions={suggestions}
                                        activeDocSection={activeDocSection}
                                        setActiveDocSection={setActiveDocSection}
                                        generatedDocs={generatedDocs}
                                        docGenerationProgress={docGenerationProgress}
                                        currentGeneratingDoc={currentGeneratingDoc}
                                        docNavItems={docNavItems}
                                        docContentRef={docContentRef}
                                        handleDocBlur={handleDocBlur}
                                        handleRetryDocument={handleRetryDocument}
                                        isChatPanelOpen={isChatPanelOpen}
                                        setIsChatPanelOpen={setIsChatPanelOpen}
                                        docChatMessages={docChatMessages}
                                        docChatInput={docChatInput}
                                        setDocChatInput={setDocChatInput}
                                        isDocChatLoading={isDocChatLoading}
                                        handleDocChatSubmit={handleDocChatSubmit}
                                        docChatEndRef={docChatEndRef}
                                        handleStepChange={handleStepChange}
                                        StepSummary={StepSummary}
                                    />
                                )}

                                {/* Planning Step */}
                                {step === 'planning' && (
                                    <PlanningStep
                                        isTransitioning={isTransitioning}
                                        transitionDirection={transitionDirection}
                                        generatedEpics={generatedEpics}
                                        generatedDocs={generatedDocs}
                                        users={users}
                                        aiPromptEpicId={aiPromptEpicId}
                                        setAiPromptEpicId={setAiPromptEpicId}
                                        aiTaskPrompt={aiTaskPrompt}
                                        setAiTaskPrompt={setAiTaskPrompt}
                                        isGeneratingTasks={isGeneratingTasks}
                                        handleEpicChange={handleEpicChange}
                                        handleTaskChange={handleTaskChange}
                                        handleDeleteTask={handleDeleteTask}
                                        handleDeleteEpic={handleDeleteEpic}
                                        handleAddTask={handleAddTask}
                                        handleAiAddTasks={handleAiAddTasks}
                                        handleOpenTaskDetail={handleOpenTaskDetail}
                                        setGeneratedEpics={setGeneratedEpics}
                                        handleStepChange={handleStepChange}
                                        StepSummary={StepSummary}
                                    />
                                )}

                        </div>

                            {/* Floating AI Chat - Fixed at bottom (only for review and planning) */}
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
                <div className="px-6 py-3 border-t border-gray-200 dark:border-[#1F2128] bg-white dark:bg-[#0A0B0D] flex justify-between items-center z-10 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleStepChange(getPreviousStep(), 'backward')}
                            disabled={isTransitioning}
                            className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            <ArrowLeft size={14} /> Back
                        </button>

                        <button
                            onClick={handleSaveDraft}
                            disabled={isSavingDraft || !productName}
                            className="px-4 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-[#2D2F36] rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!productName ? 'Product name is required to save draft' : 'Save progress and continue later'}
                        >
                            {isSavingDraft ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FileIcon size={14} />
                                    Save as Draft
                                </>
                            )}
                        </button>
                    </div>

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
                        {step === 'prd_view' && (() => {
                            const allDocsComplete = docNavItems.every(doc =>
                                docGenerationProgress[doc.id] === 'completed' || generatedDocs[doc.id]
                            );
                            const pendingDocs = docNavItems.filter(doc =>
                                !generatedDocs[doc.id] && docGenerationProgress[doc.id] !== 'completed'
                            );
                            const isGenerating = Object.values(docGenerationProgress).some(s => s === 'generating');

                            return (
                                <div className="flex items-center gap-2">
                                    {!allDocsComplete && (
                                        <span className="text-xs text-amber-400">
                                            {isGenerating ? 'Generating docs...' : `${pendingDocs.length} docs pending`}
                                        </span>
                                    )}
                                    <button
                                        onClick={handleGeneratePlan}
                                        disabled={!allDocsComplete || isGenerating}
                                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={!allDocsComplete ? 'All documentation must be generated before creating the plan' : ''}
                                    >
                                        <Layout size={14} /> Generate Plan
                                    </button>
                                </div>
                            );
                        })()}
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
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={handleCancelExit}
                />
                <div className="relative bg-white dark:bg-[#1A1D26] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2D2F36] w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 fade-in duration-200">
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

                    <div className="px-6 pb-6 flex gap-3">
                        <button
                            onClick={handleCancelExit}
                            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#1F2128] hover:bg-gray-200 dark:hover:bg-[#2D2F36] rounded-xl transition-colors"
                        >
                            Continue Editing
                        </button>
                        <button
                            onClick={handleSaveDraftAndExit}
                            disabled={isSavingDraft || !productName}
                            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!productName ? 'Product name is required to save draft' : 'Save progress and exit'}
                        >
                            {isSavingDraft ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FileIcon size={14} />
                                    Save as Draft
                                </>
                            )}
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

        {/* Fallback Notification */}
        <FallbackNotification
            show={notification.show}
            type={notification.type}
            primaryProvider={notification.primaryProvider}
            fallbackProvider={notification.fallbackProvider}
            onClose={hideNotification}
        />
    </div>
  );
};

export default ProductGeneratorModal;
