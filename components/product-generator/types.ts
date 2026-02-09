// Types for ProductGeneratorModal wizard

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: 'feature' | 'monetization' | 'market' | 'ux';
  selected: boolean;
}

export interface ProductGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate?: (productData: any) => Promise<void> | void;
  onSaveDraft?: (draftData: any) => Promise<string | void> | string | void; // Returns draft project ID
  draftProject?: any; // For resuming from draft
}

export interface DocSection {
  title: string;
  content: string;
}

export interface GeneratedTask {
    id: string;
    title: string;
    description?: string;
    type: 'task' | 'bug' | 'story' | 'feature';
    points: number;
    assigneeId: string;
    dueDate: string;
}

export interface GeneratedEpic {
    id: string;
    title: string;
    description: string;
    tasks: GeneratedTask[];
}

// Chat message types for Claude-style assistant
export interface DocChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    type: 'question' | 'edit' | 'response';
    timestamp: Date;
    editApplied?: boolean;
    editPreview?: string;
}

export type WizardStep = 'input' | 'processing' | 'review' | 'generating_docs' | 'prd_view' | 'planning' | 'creating_project';

// Step Configuration
export const STEPS = [
  { id: 'input', label: 'Define' },
  { id: 'review', label: 'Vision' },
  { id: 'prd_view', label: 'Documents' },
  { id: 'planning', label: 'Plan' },
] as const;
