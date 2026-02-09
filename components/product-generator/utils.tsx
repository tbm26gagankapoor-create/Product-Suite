import React from 'react';
import {
  DollarSign,
  TrendingUp,
  MousePointer2,
  Zap,
  Target,
  Lightbulb,
  FileText,
  Layout,
} from 'lucide-react';
import { aiClient } from '../../lib/ai';

// Markdown to HTML converter for better readability
export const renderMarkdown = (markdown: string): string => {
  if (!markdown) return '';

  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-[#172B4D] dark:text-white mt-6 mb-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-[#172B4D] dark:text-white mt-8 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold text-[#172B4D] dark:text-white mt-8 mb-4">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-[#172B4D] dark:text-white">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
    // Bullet lists
    .replace(/^\s*[-*]\s+(.+)$/gim, '<li class="ml-4 mb-2 text-[#172B4D] dark:text-gray-200">$1</li>')
    // Wrap consecutive list items
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc ml-4 mb-4 space-y-1">$&</ul>')
    // Line breaks
    .replace(/\n\n/g, '<br/><br/>');

  return `<div class="prose dark:prose-invert max-w-none">${html}</div>`;
};

// Clean JSON response from AI
export const cleanJson = (text: string) => {
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

// Clean HTML response from AI
export const cleanHtml = (text: string) => {
    if (!text) return '';
    return text.replace(/```(?:html)?\n?([\s\S]*?)\n?```/gi, '$1').trim();
};

// Helper for exponential backoff retry
export const generateWithRetry = async (params: any, retries = 5, delay = 2000): Promise<any> => {
  try {
    console.log('[AI] Calling model:', params.model || 'default');
    const result = await aiClient.models.generateContent(params);
    console.log('[AI] Response received, length:', result.text?.length || 0);
    return result;
  } catch (error: any) {
    console.error('[AI] Generation error:', {
      message: error.message,
      status: error.status,
      model: params.model,
      retries: retries
    });

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

    // Enhanced error message for debugging
    const errorDetails = `${error.message || 'Unknown error'}${error.status ? ` (Status: ${error.status})` : ''}`;
    throw new Error(`AI API Error: ${errorDetails}`);
  }
};

// Get suggestion icon based on type
export const getSuggestionIcon = (type: string) => {
    switch(type) {
        case 'monetization': return <DollarSign size={14} className="text-emerald-500" />;
        case 'market': return <TrendingUp size={14} className="text-blue-500" />;
        case 'ux': return <MousePointer2 size={14} className="text-pink-500" />;
        default: return <Zap size={14} className="text-amber-500" />;
    }
};

// Get suggestion color based on type
export const getSuggestionColor = (type: string) => {
    switch(type) {
        case 'monetization': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
        case 'market': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
        case 'ux': return 'bg-pink-500/10 text-pink-600 dark:text-pink-400';
        default: return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    }
};

// Shared helper: assign user based on role string from AI
export const getUserForRole = (roleStr: string, users: any[]) => {
    if (!users || users.length === 0) {
        return { id: 'unassigned', name: 'Unassigned', avatarUrl: '', email: '' } as any;
    }
    const roleLower = (roleStr || '').toLowerCase();
    if (roleLower.includes('front') || roleLower.includes('ui')) return users.find(u => u.role?.toLowerCase().includes('front')) || users[0];
    if (roleLower.includes('back') || roleLower.includes('api')) return users.find(u => u.role?.toLowerCase().includes('back')) || users[0];
    if (roleLower.includes('design')) return users.find(u => u.role?.toLowerCase().includes('design')) || users[0];
    return users[0];
};

// Step icon mapping used by StepIndicator
export const STEP_ICONS = {
  input: Target,
  review: Lightbulb,
  prd_view: FileText,
  planning: Layout,
} as const;
