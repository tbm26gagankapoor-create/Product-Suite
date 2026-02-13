import { Collection } from 'mongodb';
import { getCollection, generateId } from '../client.js';

export interface DraftGitSettings {
  provider_id: string;
  repo_owner: string;
  repo_name: string;
  docs_path: string;
  default_branch: string;
}

export interface DraftSection {
  content: string;
  synced_to_git: boolean;
  updated_at: Date;
}

export interface DraftSession {
  id: string;
  user_id: string;
  product_name: string;
  git?: DraftGitSettings;
  sections: Record<string, DraftSection>;
  created_at: Date;
  expires_at: Date;
  step?: string;
  vision?: string;
  description?: string;
  epics?: any[];
  suggestions?: any[];
  research_report?: any;
  input_mode?: string;
  tags?: string;
  repo_mode?: string | null;
}

const COLLECTION_NAME = 'draft_sessions';
const TTL_HOURS = 24;

function getDraftSessionsCollection(): Collection<DraftSession> {
  return getCollection<DraftSession>(COLLECTION_NAME);
}

export const draftSessionsRepository = {
  async create(userId: string, productName: string, git?: DraftGitSettings): Promise<DraftSession> {
    const now = new Date();
    const session: DraftSession = {
      id: generateId(),
      user_id: userId,
      product_name: productName,
      git,
      sections: {},
      created_at: now,
      expires_at: new Date(now.getTime() + TTL_HOURS * 60 * 60 * 1000),
    };

    await getDraftSessionsCollection().insertOne(session);
    return session;
  },

  async upsertSection(sessionId: string, sectionId: string, content: string): Promise<void> {
    await getDraftSessionsCollection().updateOne(
      { id: sessionId },
      {
        $set: {
          [`sections.${sectionId}`]: {
            content,
            synced_to_git: false,
            updated_at: new Date(),
          } satisfies DraftSection,
        },
      }
    );
  },

  async markSectionSynced(sessionId: string, sectionId: string): Promise<void> {
    await getDraftSessionsCollection().updateOne(
      { id: sessionId },
      { $set: { [`sections.${sectionId}.synced_to_git`]: true } }
    );
  },

  async updateGitSettings(sessionId: string, git: DraftGitSettings): Promise<void> {
    await getDraftSessionsCollection().updateOne(
      { id: sessionId },
      { $set: { git } }
    );
  },

  async getById(sessionId: string): Promise<DraftSession | null> {
    return getDraftSessionsCollection().findOne({ id: sessionId });
  },

  async delete(sessionId: string): Promise<void> {
    await getDraftSessionsCollection().deleteOne({ id: sessionId });
  },

  async listByUser(userId: string): Promise<DraftSession[]> {
    return getDraftSessionsCollection()
      .find({ user_id: userId, expires_at: { $gt: new Date() } })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();
  },

  async updateMeta(sessionId: string, meta: Partial<Omit<DraftSession, 'id' | 'user_id' | 'created_at' | 'expires_at'>>): Promise<void> {
    await getDraftSessionsCollection().updateOne(
      { id: sessionId },
      { $set: meta }
    );
  },
};

export default draftSessionsRepository;
