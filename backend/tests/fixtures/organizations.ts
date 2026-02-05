/**
 * Organization Test Fixtures
 */

import { faker } from '@faker-js/faker';
import database, { generateUUID, now } from '../../src/lib/database.js';

export const testOrganizations = {
  acmeCorp: {
    name: 'ACME Corporation',
    slug: 'acme-corp',
    domain: 'acme.com'
  },
  techStartup: {
    name: 'Tech Startup',
    slug: 'tech-startup',
    domain: 'techstartup.io'
  }
};

/**
 * Generate a random organization (without database insertion)
 */
export function createTestOrganization(overrides: Record<string, any> = {}) {
  const name = faker.company.name();
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);

  return {
    name,
    slug,
    domain: faker.internet.domainName(),
    logo_url: faker.image.url(),
    settings: {
      allowDomainJoin: true,
      requireApproval: true,
      defaultRole: 'member'
    },
    ...overrides
  };
}

/**
 * Create an organization document and insert it into the database
 */
export async function createOrganizationDocument(ownerId: string, overrides: Record<string, any> = {}) {
  const id = generateUUID();
  const name = overrides.name || faker.company.name();
  const slug = overrides.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);

  const organization = {
    id,
    name,
    slug,
    domain: overrides.domain || null,
    logo_url: overrides.logo_url || null,
    owner_id: ownerId,
    settings: overrides.settings || {
      allowDomainJoin: true,
      requireApproval: true,
      defaultRole: 'member'
    },
    created_at: now(),
    updated_at: now(),
  };

  await database.insert('organizations', organization);
  return organization;
}

/**
 * Create an organization member document and insert it into the database
 */
export async function createOrgMemberDocument(
  organizationId: string,
  userId: string,
  role: 'owner' | 'admin' | 'member' | 'viewer' = 'member'
) {
  const id = generateUUID();

  const member = {
    id,
    organization_id: organizationId,
    user_id: userId,
    role,
    joined_at: now(),
    created_at: now(),
    updated_at: now(),
  };

  await database.insert('organization_members', member);
  return member;
}
