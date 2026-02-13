import { GitClient } from './types.js';
import { githubClient } from './github.client.js';
import { gitlabClient } from './gitlab.client.js';
import { bitbucketClient } from './bitbucket.client.js';

export * from './types.js';
export { githubClient } from './github.client.js';
export { gitlabClient } from './gitlab.client.js';
export { bitbucketClient } from './bitbucket.client.js';

/**
 * Get the appropriate Git client for a provider type
 */
export function getGitClient(providerType: 'github' | 'gitlab' | 'bitbucket'): GitClient {
  switch (providerType) {
    case 'github':
      return githubClient;
    case 'gitlab':
      return gitlabClient;
    case 'bitbucket':
      return bitbucketClient;
    default:
      throw new Error(`Unknown Git provider type: ${providerType}`);
  }
}

/**
 * Check if a provider type is supported
 */
export function isSupportedProvider(providerType: string): providerType is 'github' | 'gitlab' | 'bitbucket' {
  return ['github', 'gitlab', 'bitbucket'].includes(providerType);
}
