/**
 * Prompt Template Service
 * Handles template resolution with caching and a lightweight Handlebars-like engine.
 * No external template dependencies — uses regex-based substitution.
 */

import { promptTemplatesRepository, PromptTemplate } from '../db/postgres/repositories/prompt-templates.repository.js';

export interface ResolveResult {
  resolvedText: string;
  templateName: string;
  templateVersion: number;
  responseFormat: 'text' | 'json';
}

class PromptTemplateService {
  private cache: Map<string, PromptTemplate> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60000; // 60 seconds, matching ai.service.ts

  /**
   * Clear the template cache. Call after admin updates.
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry = 0;
  }

  /**
   * Ensure the cache is populated and fresh.
   */
  private async ensureCache(): Promise<void> {
    if (Date.now() < this.cacheExpiry && this.cache.size > 0) return;

    const templates = await promptTemplatesRepository.findAllActive();
    this.cache.clear();
    for (const t of templates) {
      this.cache.set(t.name, t);
    }
    this.cacheExpiry = Date.now() + this.CACHE_TTL;
  }

  /**
   * Resolve a prompt template by name with the given variables.
   *
   * Template syntax:
   * - {{variableName}} — simple substitution
   * - {{#if variableName}}...content...{{/if}} — conditional block (included when variable is truthy/non-empty)
   */
  async resolve(
    templateName: string,
    variables: Record<string, string>
  ): Promise<ResolveResult> {
    await this.ensureCache();

    const template = this.cache.get(templateName);
    if (!template) {
      throw new Error(`Prompt template '${templateName}' not found`);
    }
    if (!template.is_active) {
      throw new Error(`Prompt template '${templateName}' is disabled`);
    }

    // Validate required variables
    for (const v of template.variables) {
      if (v.required && (!variables[v.name] || variables[v.name].trim() === '')) {
        throw new Error(
          `Required variable '${v.name}' is missing for template '${templateName}'`
        );
      }
    }

    const resolvedText = this.resolveTemplate(template.template_body, variables);

    return {
      resolvedText: resolvedText.trim(),
      templateName: template.name,
      templateVersion: template.version,
      responseFormat:
        (template.metadata?.response_format as 'text' | 'json') || 'text',
    };
  }

  /**
   * Resolve a template body with variables (stateless — used for preview too).
   */
  resolveTemplate(
    templateBody: string,
    variables: Record<string, string>
  ): string {
    let resolved = templateBody;

    // Step 1: Process {{#if varName}}...{{/if}} conditional blocks
    resolved = resolved.replace(
      /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_match, varName: string, content: string) => {
        const val = variables[varName];
        if (val && val.trim() !== '' && val !== 'false') {
          // Also substitute any {{varName}} references inside the conditional block
          return content;
        }
        return '';
      }
    );

    // Step 2: Replace {{varName}} simple placeholders
    resolved = resolved.replace(
      /\{\{(\w+)\}\}/g,
      (_match, varName: string) => variables[varName] ?? ''
    );

    return resolved;
  }
}

export const promptTemplateService = new PromptTemplateService();
export default promptTemplateService;
