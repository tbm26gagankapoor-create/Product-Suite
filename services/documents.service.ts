
import { supabase } from '../lib/supabase';
import { 
  ProjectDocument, 
  DocumentVersion, 
  DocumentVersionWithUser 
} from '../types/database.types';

export class DocumentsService {
  // Document section IDs
  static SECTIONS = [
    'prd', 'roadmap', 'business', 'data', 'app', 
    'tech', 'design', 'adrs', 'specs', 
    'biz-flow', 'sys-flow', 'integrations'
  ];

  // Get all documents for project
  async getAll(projectId: string): Promise<ProjectDocument[]> {
    const { data, error } = await supabase
      .from('project_documents')
      .select('*')
      .eq('project_id', projectId);
    
    if (error) throw error;
    return data || [];
  }

  // Get specific document section
  async getSection(projectId: string, sectionId: string): Promise<ProjectDocument | null> {
    const { data, error } = await supabase
      .from('project_documents')
      .select('*')
      .match({ project_id: projectId, section_id: sectionId })
      .single();
    
    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    return data;
  }

  // Create or update document section & auto-create version history
  async saveSection(projectId: string, sectionId: string, content: string, summary?: string): Promise<ProjectDocument> {
    // 1. Upsert current document
    const { data: doc, error: docError } = await supabase
      .from('project_documents')
      .upsert(
        { project_id: projectId, section_id: sectionId, content },
        { onConflict: 'project_id,section_id' }
      )
      .select()
      .single();

    if (docError) throw docError;

    // 2. Create history entry
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // Resolve auth_user_id to public user id
        const { data: profile } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();
        const userId = profile?.id;

        if (userId) {
            const { error: versionError } = await supabase.from('document_versions').insert({
                project_id: projectId,
                section_id: sectionId,
                content,
                summary: summary || 'Updated document',
                user_id: userId
            });
            if (versionError) console.warn('Failed to save document version:', versionError);
        }
    }

    return doc;
  }

  // Delete document section
  async deleteSection(projectId: string, sectionId: string): Promise<void> {
    const { error } = await supabase
      .from('project_documents')
      .delete()
      .match({ project_id: projectId, section_id: sectionId });
    
    if (error) throw error;
  }

  // Get version history for a section
  async getVersionHistory(projectId: string, sectionId: string): Promise<DocumentVersionWithUser[]> {
    const { data, error } = await supabase
      .from('document_versions')
      .select('*, user:users(*)')
      .match({ project_id: projectId, section_id: sectionId })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as DocumentVersionWithUser[];
  }

  // Get specific version
  async getVersion(versionId: string): Promise<DocumentVersionWithUser | null> {
    const { data, error } = await supabase
      .from('document_versions')
      .select('*, user:users(*)')
      .eq('id', versionId)
      .single();
    
    if (error) return null;
    return data as unknown as DocumentVersionWithUser;
  }

  // Restore version (copy old version content to current)
  async restoreVersion(versionId: string): Promise<ProjectDocument> {
    const version = await this.getVersion(versionId);
    if (!version) throw new Error('Version not found');

    // Restore by saving as new current state
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
