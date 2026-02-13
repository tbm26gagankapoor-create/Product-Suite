/**
 * Research Service
 * AI-powered competitive research and market intelligence
 * Uses web search + AI to synthesize insights for product generation
 */

import { webSearchService, SearchResult } from './web-search.service.js';
import { aiGenerationService } from './ai-client.service.js';

export interface ResearchQuery {
  product_name: string;
  industry?: string;
  target_market?: string;
  features?: string[];
}

export interface CompetitiveResearch {
  query: string;
  competitors: Array<{
    name: string;
    url: string;
    description: string;
  }>;
  marketTrends: string[];
  keyInsights: string[];
  recommendations: string[];
  sources: SearchResult[];
}

export const researchService = {
  /**
   * Perform competitive research for a product
   */
  async researchProduct(query: ResearchQuery): Promise<CompetitiveResearch> {
    console.log(`[Research] Starting research for: ${query.product_name}`);

    try {
      // Build search queries
      const searchQueries = this.buildSearchQueries(query);

      // Execute searches in parallel
      const searchResults = await Promise.all(
        searchQueries.map(q =>
          webSearchService.search(q, { maxResults: 5 })
            .catch(error => {
              console.warn(`[Research] Search failed for "${q}":`, error.message);
              return { query: q, results: [], totalResults: 0, provider: 'none' };
            })
        )
      );

      // Aggregate all search results
      const allResults = searchResults.flatMap(sr => sr.results);

      if (allResults.length === 0) {
        console.warn('[Research] No search results found');
        return this.createEmptyResearch(query.product_name);
      }

      // Use AI to synthesize research findings
      const synthesis = await this.synthesizeFindings(query, allResults);

      console.log(`[Research] Completed research with ${allResults.length} sources`);

      return {
        query: query.product_name,
        competitors: synthesis.competitors,
        marketTrends: synthesis.marketTrends,
        keyInsights: synthesis.keyInsights,
        recommendations: synthesis.recommendations,
        sources: allResults
      };

    } catch (error: any) {
      console.error('[Research] Error performing research:', error.message);
      throw new Error(`Research failed: ${error.message}`);
    }
  },

  /**
   * Build search queries for comprehensive research
   */
  buildSearchQueries(query: ResearchQuery): string[] {
    const { product_name, industry, target_market } = query;
    const queries: string[] = [];

    // Competitor research
    queries.push(`${product_name} competitors ${industry || ''}`);
    queries.push(`best ${product_name} alternatives 2026`);

    // Market trends
    if (industry) {
      queries.push(`${industry} market trends 2026`);
      queries.push(`future of ${industry} technology`);
    }

    // Target market insights
    if (target_market) {
      queries.push(`${target_market} ${product_name} needs`);
    }

    return queries.filter(q => q.trim().length > 0);
  },

  /**
   * Use AI to synthesize search results into structured insights
   */
  async synthesizeFindings(query: ResearchQuery, results: SearchResult[]): Promise<{
    competitors: Array<{ name: string; url: string; description: string }>;
    marketTrends: string[];
    keyInsights: string[];
    recommendations: string[];
  }> {
    // Format search results for AI
    const formattedResults = results
      .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`)
      .join('\n\n');

    const prompt = `You are a market research analyst. Analyze the following search results about "${query.product_name}" and provide structured insights.

SEARCH RESULTS:
${formattedResults}

PRODUCT CONTEXT:
- Name: ${query.product_name}
${query.industry ? `- Industry: ${query.industry}` : ''}
${query.target_market ? `- Target Market: ${query.target_market}` : ''}
${query.features ? `- Features: ${query.features.join(', ')}` : ''}

Provide a JSON response with the following structure:
{
  "competitors": [
    {
      "name": "Competitor Name",
      "url": "https://...",
      "description": "Brief description of what they offer"
    }
  ],
  "marketTrends": [
    "Key trend 1",
    "Key trend 2",
    "Key trend 3"
  ],
  "keyInsights": [
    "Important insight about the market",
    "User needs or pain points",
    "Opportunities for differentiation"
  ],
  "recommendations": [
    "Strategic recommendation 1",
    "Feature suggestion based on market",
    "Positioning advice"
  ]
}

Focus on:
1. Identifying 3-5 main competitors with their unique value propositions
2. Current market trends relevant to this product category
3. Gaps or opportunities in the market
4. Actionable recommendations for product development

Return ONLY valid JSON, no markdown formatting.`;

    try {
      // Use AI to analyze and synthesize
      const response = await aiGenerationService.generateText({
        prompt,
        max_tokens: 1500,
        temperature: 0.3 // Lower temperature for more factual analysis
      });

      // Parse AI response
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const synthesis = JSON.parse(cleaned);

      return {
        competitors: synthesis.competitors || [],
        marketTrends: synthesis.marketTrends || [],
        keyInsights: synthesis.keyInsights || [],
        recommendations: synthesis.recommendations || []
      };

    } catch (error: any) {
      console.error('[Research] AI synthesis failed:', error.message);

      // Fallback: simple extraction from search results
      return this.extractBasicInsights(results);
    }
  },

  /**
   * Extract basic insights from search results without AI
   */
  extractBasicInsights(results: SearchResult[]): {
    competitors: Array<{ name: string; url: string; description: string }>;
    marketTrends: string[];
    keyInsights: string[];
    recommendations: string[];
  } {
    // Extract potential competitors from titles and URLs
    const competitors = results.slice(0, 5).map(r => ({
      name: this.extractCompanyName(r.title, r.url),
      url: r.url,
      description: r.snippet
    }));

    return {
      competitors,
      marketTrends: [
        'Market research data unavailable - AI synthesis failed',
        'Consider manual research for market trends'
      ],
      keyInsights: [
        'Automated insight extraction unavailable',
        'Review search results manually for deeper insights'
      ],
      recommendations: [
        'Conduct additional market research',
        'Analyze top competitors manually'
      ]
    };
  },

  /**
   * Extract company name from title or URL
   */
  extractCompanyName(title: string, url: string): string {
    // Try to extract from URL domain
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      const parts = domain.split('.');
      if (parts.length > 1) {
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
    } catch (error) {
      // Invalid URL, fall back to title
    }

    // Extract first meaningful part of title (before dash or pipe)
    const titleParts = title.split(/[\-\|\–]/);
    return titleParts[0].trim();
  },

  /**
   * Create empty research object when no results found
   */
  createEmptyResearch(product_name: string): CompetitiveResearch {
    return {
      query: product_name,
      competitors: [],
      marketTrends: ['No market data available - search providers may not be configured'],
      keyInsights: ['Enable web search providers in admin portal to gather market intelligence'],
      recommendations: ['Configure Tavily, Serper, or Brave Search for competitive research'],
      sources: []
    };
  },

  /**
   * Format research for inclusion in PRD
   */
  formatForPRD(research: CompetitiveResearch): string {
    let formatted = `# Market Research\n\n`;

    // Competitors
    if (research.competitors.length > 0) {
      formatted += `## Competitive Landscape\n\n`;
      research.competitors.forEach(comp => {
        formatted += `### ${comp.name}\n`;
        formatted += `- **Website**: ${comp.url}\n`;
        formatted += `- **Description**: ${comp.description}\n\n`;
      });
    }

    // Market Trends
    if (research.marketTrends.length > 0) {
      formatted += `## Market Trends\n\n`;
      research.marketTrends.forEach(trend => {
        formatted += `- ${trend}\n`;
      });
      formatted += `\n`;
    }

    // Key Insights
    if (research.keyInsights.length > 0) {
      formatted += `## Key Insights\n\n`;
      research.keyInsights.forEach(insight => {
        formatted += `- ${insight}\n`;
      });
      formatted += `\n`;
    }

    // Recommendations
    if (research.recommendations.length > 0) {
      formatted += `## Strategic Recommendations\n\n`;
      research.recommendations.forEach(rec => {
        formatted += `- ${rec}\n`;
      });
      formatted += `\n`;
    }

    // Sources
    if (research.sources.length > 0) {
      formatted += `## Sources\n\n`;
      research.sources.slice(0, 10).forEach((source, i) => {
        formatted += `${i + 1}. [${source.title}](${source.url})\n`;
      });
    }

    return formatted;
  }
};
