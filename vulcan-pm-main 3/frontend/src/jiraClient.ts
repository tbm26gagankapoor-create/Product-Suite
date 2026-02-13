
export interface JiraProject {
  id: string;
  key: string;
  name: string;
  avatarUrls: {
    '48x48': string;
  };
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: any; // ADF format or string
    status: {
      name: string;
      statusCategory: {
        key: string; // 'new', 'indeterminate', 'done'
      }
    };
    priority?: {
      name: string;
    };
    issuetype: {
      name: string;
      iconUrl: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
      avatarUrls: {
        '48x48': string;
      };
    };
    created: string;
  };
}

export class JiraClient {
  private domain: string;
  private authHeader: string;
  private corsProxy: string;

  constructor(domain: string, email: string, token: string, corsProxy: string = '') {
    // Ensure domain doesn't have protocol
    this.domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.authHeader = `Basic ${btoa(`${email}:${token}`)}`;
    this.corsProxy = corsProxy;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const apiPath = `/rest/api/3${endpoint}`;
    const targetUrl = `https://${this.domain}${apiPath}`;
    
    // If proxy is set, prepend it. e.g. https://corsproxy.io/?https://myjira...
    const url = this.corsProxy ? `${this.corsProxy}${encodeURIComponent(targetUrl)}` : targetUrl;
    
    console.log(`[JiraClient] Requesting: ${url}`);

    const headers: Record<string, string> = {
      'Authorization': this.authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Atlassian-Token': 'no-check',
      ...options.headers as Record<string, string>,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // Try to read error body
        const errorText = await response.text().catch(() => response.statusText);
        console.error(`[JiraClient] API Error ${response.status}:`, errorText);

        if (response.status === 401) throw new Error('Invalid credentials or API token.');
        if (response.status === 403) throw new Error('Access denied. Check API permissions.');
        if (response.status === 404) throw new Error('Resource not found. Check domain.');
        
        throw new Error(`Jira API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error: any) {
      console.error(`[JiraClient] Network/System Error:`, error);
      
      if (error.message === 'Failed to fetch') {
        throw new Error('Network error: Failed to fetch. This is usually due to CORS. Try enabling the CORS Proxy option.');
      }
      
      throw error;
    }
  }

  async getCurrentUser() {
    return this.request('/myself');
  }

  async getProjects(): Promise<JiraProject[]> {
    // Get recent projects or all
    const result = await this.request<any>('/project/search?maxResults=50');
    return result['values'] || result; 
  }

  async getIssuesForProject(projectKey: string): Promise<JiraIssue[]> {
    const jql = `project = "${projectKey}" ORDER BY created DESC`;
    
    // Switch to GET to avoid XSRF issues with POST in client-side calls
    const params = new URLSearchParams({
        jql,
        maxResults: '100',
        fields: 'summary,status,priority,issuetype,assignee,created,description'
    });

    const result = await this.request<any>(`/search?${params.toString()}`, {
      method: 'GET'
    });

    return result.issues || [];
  }
}
