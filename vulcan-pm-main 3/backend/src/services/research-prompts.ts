/**
 * Research Prompts - AI prompts for competitive research pipeline
 * Used by research.service.ts to generate search queries and synthesize reports
 */

export function generateSearchQueriesPrompt(
  productName: string,
  description: string,
  tags: string
): string {
  return `You are a market research analyst. Given a product concept, generate exactly 4 targeted search queries to research the competitive landscape.

Product Name: ${productName}
Description: ${description || 'Not provided'}
Tags: ${tags || 'Not provided'}

Generate 4 search queries, one for each category:
1. **Competitive**: Find direct and indirect competitors
2. **Trends**: Current market trends and industry direction
3. **Users**: Target audience pain points and needs
4. **Technical**: Technical approaches and architecture patterns used by similar products

Return strictly valid JSON:
{
  "queries": [
    { "category": "competitive", "query": "..." },
    { "category": "trends", "query": "..." },
    { "category": "users", "query": "..." },
    { "category": "technical", "query": "..." }
  ]
}

IMPORTANT: Make queries specific and actionable. Include the product domain/industry in each query.
Do NOT wrap in markdown code blocks. Return only the JSON object.`;
}

export function synthesizeResearchReportPrompt(
  productName: string,
  description: string,
  searchResults: { query: string; results: { title: string; url: string; content: string }[] }[]
): string {
  const formattedResults = searchResults
    .map(sr => {
      const resultsText = sr.results
        .map(r => `- [${r.title}](${r.url}): ${r.content}`)
        .join('\n');
      return `### Query: "${sr.query}"\n${resultsText || 'No results found.'}`;
    })
    .join('\n\n');

  return `You are a senior market research analyst. Synthesize the following web search results into a structured research report for: "${productName}".

Product Description: ${description || 'Not provided'}

## RAW SEARCH RESULTS:
${formattedResults}

## INSTRUCTIONS:
Analyze all search results and produce a comprehensive research report. Extract key insights, identify patterns, and provide actionable intelligence.

Return strictly valid JSON:
{
  "competitiveLandscape": "2-3 paragraphs analyzing competitors, their strengths, weaknesses, and market positioning",
  "marketTrends": "2-3 paragraphs on current market trends, growth areas, and industry direction",
  "userInsights": "2-3 paragraphs on target user needs, pain points, and expectations",
  "technicalContext": "2-3 paragraphs on technical approaches, common architectures, and technology choices",
  "keyFindings": [
    "Finding 1: concise insight",
    "Finding 2: concise insight",
    "Finding 3: concise insight",
    "Finding 4: concise insight",
    "Finding 5: concise insight"
  ],
  "sources": [
    { "title": "Source title", "url": "https://..." },
    { "title": "Source title", "url": "https://..." }
  ]
}

IMPORTANT: Base your analysis strictly on the provided search results. Cite specific sources.
Do NOT wrap in markdown code blocks. Return only the JSON object.`;
}
