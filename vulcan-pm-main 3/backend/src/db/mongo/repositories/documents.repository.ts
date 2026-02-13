import { Collection } from 'mongodb';
import { getCollection, Collections, generateId } from '../client.js';

export interface DocumentRecord {
  id: string;
  project_id: string;
  section_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

function getDocumentsCollection(): Collection<DocumentRecord> {
  return getCollection<DocumentRecord>(Collections.DOCUMENTS);
}

export const documentsRepository = {
  async findByProject(projectId: string): Promise<DocumentRecord[]> {
    return getDocumentsCollection()
      .find({ project_id: projectId })
      .sort({ section_id: 1 })
      .toArray();
  },

  async findByProjectAndSection(projectId: string, sectionId: string): Promise<DocumentRecord | null> {
    return getDocumentsCollection().findOne({ project_id: projectId, section_id: sectionId });
  },

  async upsert(projectId: string, sectionId: string, content: string): Promise<DocumentRecord> {
    const now = new Date();
    const result = await getDocumentsCollection().findOneAndUpdate(
      { project_id: projectId, section_id: sectionId },
      {
        $set: { content, updated_at: now },
        $setOnInsert: { id: generateId(), project_id: projectId, section_id: sectionId, created_at: now },
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result!;
  },

  async deleteSection(projectId: string, sectionId: string): Promise<boolean> {
    const result = await getDocumentsCollection().deleteOne({ project_id: projectId, section_id: sectionId });
    return result.deletedCount > 0;
  },

  async deleteByProject(projectId: string): Promise<number> {
    const result = await getDocumentsCollection().deleteMany({ project_id: projectId });
    return result.deletedCount;
  },
};

export default documentsRepository;
