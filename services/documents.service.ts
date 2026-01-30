/**
 * Documents Service - Uses Local Backend
 * All Supabase calls have been replaced with local backend API calls
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

export interface ProjectDocument {
  id: string;
  project_id: string;
  section_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  project_id: string;
  section_id: string;
  content: string;
  summary?: string;
  user_id?: string;
  created_at: string;
}

export class DocumentsService {
  // Document section IDs
  static SECTIONS = [
    'prd', 'roadmap', 'business', 'data', 'app',
    'tech', 'design', 'adrs', 'specs',
    'biz-flow', 'sys-flow', 'integrations'
  ];

  // Get all documents for project
  async getAll(projectId: string): Promise<ProjectDocument[]> {
    const response = await fetch(`${API_BASE}/documents?project_id=${projectId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data || [] : [];
  }

  // Get specific document section
  async getSection(projectId: string, sectionId: string): Promise<ProjectDocument | null> {
    const response = await fetch(`${API_BASE}/documents?project_id=${projectId}&section_id=${sectionId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success && data.data?.length > 0 ? data.data[0] : null;
  }

  // Create or update document section
  async saveSection(projectId: string, sectionId: string, content: string, summary?: string): Promise<ProjectDocument> {
    const response = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        project_id: projectId,
        section_id: sectionId,
        content,
        summary: summary || 'Updated document',
      }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to save document');
    return data.data;
  }

  // Delete document section
  async deleteSection(projectId: string, sectionId: string): Promise<void> {
    await fetch(`${API_BASE}/documents?project_id=${projectId}&section_id=${sectionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  }

  // Get version history for a section
  async getVersionHistory(projectId: string, sectionId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE}/documents/versions?project_id=${projectId}&section_id=${sectionId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data || [] : [];
  }

  // Get specific version
  async getVersion(versionId: string): Promise<DocumentVersion | null> {
    const response = await fetch(`${API_BASE}/documents/versions/${versionId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    return data.success ? data.data : null;
  }

  // Restore version
  async restoreVersion(versionId: string): Promise<ProjectDocument> {
    const version = await this.getVersion(versionId);
    if (!version) throw new Error('Version not found');

    return this.saveSection(
      version.project_id,
      version.section_id,
      version.content,
      `Restored from version ${new Date(version.created_at).toLocaleString()}`
    );
  }

  // Compare two versions
  async compareVersions(versionId1: string, versionId2: string): Promise<{
    version1: DocumentVersion;
    version2: DocumentVersion;
  }> {
    const [v1, v2] = await Promise.all([
      this.getVersion(versionId1),
      this.getVersion(versionId2)
    ]);

    if (!v1 || !v2) throw new Error('One or both versions not found');

    return { version1: v1, version2: v2 };
  }

  // Get all documents with content for export
  async exportAll(projectId: string): Promise<Record<string, string>> {
    const docs = await this.getAll(projectId);
    const result: Record<string, string> = {};
    docs.forEach(doc => {
      result[doc.section_id] = doc.content || '';
    });
    return result;
  }
}

export const documentsService = new DocumentsService();
