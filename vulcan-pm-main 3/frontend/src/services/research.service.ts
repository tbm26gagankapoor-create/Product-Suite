/**
 * Research Service - Frontend API client for competitive research
 */

const API_BASE = '/api/v1';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('infinia_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
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

export interface ResearchInput {
  productName: string;
  description?: string;
  tags?: string;
}

export const researchService = {
  /**
   * Check if research service is available (search provider configured)
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/research/status`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) return false;

      const data = await response.json();
      return data.success && data.data?.available;
    } catch {
      return false;
    }
  },

  /**
   * Conduct competitive research for a product concept
   */
  async conductResearch(input: ResearchInput): Promise<ResearchReport> {
    const response = await fetch(`${API_BASE}/research`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to conduct research');
    }

    return data.data;
  },
};

export default researchService;
