/**
 * Documents Service - Uses Centralized HTTP Client
 */

import { httpClient } from '../lib/httpClient';

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
    'prd',
    'roadmap',
    'modules',
    'business',
    'data',
    'app',
    'tech',
    'design-guidelines',
    'design',
    'adrs',
    'specs',
    'user-flows',
    'biz-flow',
    'sys-flow',
    'integrations',
  ];

  // Get all documents for project
  async getAll(projectId: string): Promise<ProjectDocument[]> {
    try {
      const response = await httpClient.get<ProjectDocument[]>(
        `/documents?project_id=${projectId}`
      );
      return response || [];
    } catch {
      return [];
    }
  }

  // Get specific document section
  async getSection(projectId: string, sectionId: string): Promise<ProjectDocument | null> {
    try {
      const response = await httpClient.get<ProjectDocument[]>(
        `/documents?project_id=${projectId}&section_id=${sectionId}`
      );
      return response && response.length > 0 ? response[0] : null;
    } catch {
      return null;
    }
  }

  // Create or update document section
  async saveSection(
    projectId: string,
    sectionId: string,
    content: string,
    summary?: string
  ): Promise<ProjectDocument> {
    return httpClient.post<ProjectDocument>('/documents', {
      project_id: projectId,
      section_id: sectionId,
      content,
      summary: summary || 'Updated document',
    });
  }

  // Delete document section
  async deleteSection(projectId: string, sectionId: string): Promise<void> {
    await httpClient.delete(`/documents?project_id=${projectId}&section_id=${sectionId}`);
  }

  // Get version history for a section
  async getVersionHistory(projectId: string, sectionId: string): Promise<DocumentVersion[]> {
    try {
      const response = await httpClient.get<DocumentVersion[]>(
        `/documents/versions?project_id=${projectId}&section_id=${sectionId}`
      );
      return response || [];
    } catch {
      return [];
    }
  }

  // Get specific version
  async getVersion(versionId: string): Promise<DocumentVersion | null> {
    try {
      const response = await httpClient.get<DocumentVersion>(`/documents/versions/${versionId}`);
      return response;
    } catch {
      return null;
    }
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
  async compareVersions(
    versionId1: string,
    versionId2: string
  ): Promise<{
    version1: DocumentVersion;
    version2: DocumentVersion;
  }> {
    const [v1, v2] = await Promise.all([
      this.getVersion(versionId1),
      this.getVersion(versionId2),
    ]);

    if (!v1 || !v2) throw new Error('One or both versions not found');

    return { version1: v1, version2: v2 };
  }

  // Get all documents with content for export
  async exportAll(projectId: string): Promise<Record<string, string>> {
    const docs = await this.getAll(projectId);
    const result: Record<string, string> = {};
    docs.forEach((doc) => {
      result[doc.section_id] = doc.content || '';
    });
    return result;
  }
}

export const documentsService = new DocumentsService();
