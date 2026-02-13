/**
 * Research Service - Agentic orchestrator for competitive research
 * Composes AI service + web search service to conduct automated research
 */

import { aiService } from './ai.service.js';
import { webSearchService, SearchResult } from './web-search.service.js';
import { promptTemplateService } from './prompt-template.service.js';

export interface ResearchInput {
  productName: string;
  description?: string;
  tags?: string;
}

export interface ResearchSource {
  title: string;
  url: string;
}

export interface ResearchReport {
  competitiveLandscape: string;
  marketTrends: string;
  userInsights: string;
  technicalContext: string;
  keyFindings: string[];
  sources: ResearchSource[];
}

class ResearchService {
  async isAvailable(): Promise<boolean> {
    const [aiReady, searchReady] = await Promise.all([
      aiService.isAvailable(),
      webSearchService.isAvailable(),
    ]);
    return aiReady && searchReady;
  }

  async conductResearch(input: ResearchInput): Promise<ResearchReport> {
    const { productName, description, tags } = input;

    // Step 1: AI generates search queries
    console.log('[Research] Generating search queries for:', productName);
    const queryResolved = await promptTemplateService.resolve('generate_search_queries', {
      productName,
      description: description || 'Not provided',
      tags: tags || 'Not provided',
    });

    const queryResponse = await aiService.generate({
      messages: [{ role: 'user', content: queryResolved.resolvedText }],
      responseFormat: 'json',
      temperature: 0.3,
    });

    let queries: string[];
    try {
      const parsed = JSON.parse(queryResponse.text);
      queries = (parsed.queries || []).map((q: any) => q.query || q);
      if (queries.length === 0) {
        throw new Error('No queries generated');
      }
    } catch (e) {
      console.warn('[Research] Failed to parse AI queries, using fallback queries');
      queries = [
        `${productName} competitors alternatives ${new Date().getFullYear()}`,
        `${productName} market trends ${tags || ''}`,
        `${productName} user pain points target audience`,
        `${productName} technical architecture approach`,
      ];
    }

    console.log('[Research] Executing', queries.length, 'search queries in parallel');

    // Step 2: Execute searches in parallel
    const searchResults = await webSearchService.searchMultiple(queries);

    const totalResults = searchResults.reduce((sum, sr) => sum + sr.results.length, 0);
    console.log('[Research] Got', totalResults, 'total search results');

    if (totalResults === 0) {
      return {
        competitiveLandscape: 'No competitive data found. The search did not return relevant results.',
        marketTrends: 'No market trend data found.',
        userInsights: 'No user insight data found.',
        technicalContext: 'No technical context data found.',
        keyFindings: ['Web search returned no results. Consider checking your search provider configuration.'],
        sources: [],
      };
    }

    // Step 3: AI synthesizes results into report
    console.log('[Research] Synthesizing research report');
    const formattedResults = searchResults
      .map(sr => {
        const resultsText = sr.results
          .map((r: any) => `- [${r.title}](${r.url}): ${r.content}`)
          .join('\n');
        return `### Query: "${sr.query}"\n${resultsText || 'No results found.'}`;
      })
      .join('\n\n');

    const synthesisResolved = await promptTemplateService.resolve('synthesize_research_report', {
      productName,
      description: description || 'Not provided',
      formattedResults,
    });

    const synthesisResponse = await aiService.generate({
      messages: [{ role: 'user', content: synthesisResolved.resolvedText }],
      responseFormat: 'json',
      temperature: 0.4,
      maxTokens: 4096,
    });

    try {
      const report = JSON.parse(synthesisResponse.text);
      return {
        competitiveLandscape: report.competitiveLandscape || '',
        marketTrends: report.marketTrends || '',
        userInsights: report.userInsights || '',
        technicalContext: report.technicalContext || '',
        keyFindings: Array.isArray(report.keyFindings) ? report.keyFindings : [],
        sources: Array.isArray(report.sources) ? report.sources : [],
      };
    } catch (e) {
      console.error('[Research] Failed to parse synthesis response:', e);
      // Return raw text as competitive landscape if JSON parsing fails
      return {
        competitiveLandscape: synthesisResponse.text.substring(0, 2000),
        marketTrends: '',
        userInsights: '',
        technicalContext: '',
        keyFindings: ['Research synthesis completed but output was not structured. See competitive landscape for raw analysis.'],
        sources: [],
      };
    }
  }
}

export const researchService = new ResearchService();
export default researchService;
