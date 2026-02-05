/**
 * Organizations Service Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { organizationsService } from '../../../src/services/organizations.service.js';
import database from '../../../src/lib/database.js';
import { createUserDocument } from '../../fixtures/users.js';
import { generateObjectId } from '../../utils/test-helpers.js';

describe('OrganizationsService', () => {
  // Helper to create an org with owner (required by Mongoose schema)
  async function createTestOrg(name: string, overrides: Record<string, any> = {}) {
    const owner = await createUserDocument();
    return organizationsService.create({ name, owner_id: owner.id, ...overrides });
  }

  describe('create', () => {
    it('should create organization with required fields', async () => {
      const owner = await createUserDocument();
      const input = {
        name: 'Test Organization',
        owner_id: owner.id,
      };

      const org = await organizationsService.create(input);

      expect(org.id).toBeDefined();
      expect(org.name).toBe('Test Organization');
      expect(org.slug).toBe('test-organization');
      expect(org.settings.allowDomainJoin).toBe(true);
      expect(org.settings.requireApproval).toBe(true);
      expect(org.memberCount).toBe(1); // Owner is auto-added as member
      expect(org.projectCount).toBe(0);
    });

    it('should create organization with custom slug', async () => {
      const owner = await createUserDocument();
      const input = {
        name: 'Test Organization',
        slug: 'custom-slug',
        owner_id: owner.id,
      };

      const org = await organizationsService.create(input);

      expect(org.slug).toBe('custom-slug');
    });

    it('should create unique slug when duplicate exists', async () => {
      const owner1 = await createUserDocument();
      const owner2 = await createUserDocument({ email: 'owner2@test.com' });

      // Create first org
      await organizationsService.create({ name: 'Test Org', owner_id: owner1.id });

      // Create second org with same name
      const org2 = await organizationsService.create({ name: 'Test Org', owner_id: owner2.id });

      expect(org2.slug).toBe('test-org-1');
    });

    it('should create organization with owner and add owner as admin member', async () => {
      // Create owner user
      const user = await createUserDocument();

      const input = {
        name: 'Owned Organization',
        owner_id: user.id,
      };

      const org = await organizationsService.create(input);

      expect(org.owner_id).toBe(user.id);
      expect(org.memberCount).toBe(1);

      // Verify owner is added as admin member
      const member = await organizationsService.getMember(org.id, user.id);
      expect(member).not.toBeNull();
      expect(member?.role).toBe('admin');

      // Verify user's organization_id is updated
      const updatedUser = await database.findById<any>('users', user.id);
      expect(updatedUser?.organization_id).toBe(org.id);
    });

    it('should create organization with domain', async () => {
      const owner = await createUserDocument();
      const input = {
        name: 'Domain Org',
        domain: 'example.com',
        owner_id: owner.id,
      };

      const org = await organizationsService.create(input);

      expect(org.domain).toBe('example.com');
    });

    it('should generate slug from name with special characters', async () => {
      const owner = await createUserDocument();
      const input = {
        name: 'Test & Special @Org!',
        owner_id: owner.id,
      };

      const org = await organizationsService.create(input);

      expect(org.slug).toBe('test-special-org');
    });
  });

  describe('getById', () => {
    it('should return organization by id', async () => {
      const created = await createTestOrg('Get By ID Test');

      const org = await organizationsService.getById(created.id);

      expect(org).not.toBeNull();
      expect(org?.id).toBe(created.id);
      expect(org?.name).toBe('Get By ID Test');
    });

    it('should return null for non-existent id', async () => {
      const org = await organizationsService.getById(generateObjectId());

      expect(org).toBeNull();
    });

    it('should include member and project counts', async () => {
      const user = await createUserDocument();
      const created = await organizationsService.create({ name: 'Stats Test', owner_id: user.id });

      const org = await organizationsService.getById(created.id);

      expect(org?.memberCount).toBe(1); // Owner is a member
      expect(org?.projectCount).toBe(0);
    });
  });

  describe('getBySlug', () => {
    it('should return organization by slug', async () => {
      await createTestOrg('Slug Test Org');

      const org = await organizationsService.getBySlug('slug-test-org');

      expect(org).not.toBeNull();
      expect(org?.slug).toBe('slug-test-org');
    });

    it('should return null for non-existent slug', async () => {
      const org = await organizationsService.getBySlug('non-existent-slug');

      expect(org).toBeNull();
    });
  });

  describe('getByDomain', () => {
    it('should return organizations by domain', async () => {
      await createTestOrg('Domain Org 1', { domain: 'testdomain.com' });
      await createTestOrg('Domain Org 2', { domain: 'testdomain.com' });
      await createTestOrg('Other Domain Org', { domain: 'other.com' });

      const orgs = await organizationsService.getByDomain('testdomain.com');

      expect(orgs.length).toBe(2);
      expect(orgs.every(o => o.domain === 'testdomain.com')).toBe(true);
    });

    it('should return empty array for non-existent domain', async () => {
      const orgs = await organizationsService.getByDomain('nonexistent.com');

      expect(orgs).toEqual([]);
    });
  });

  describe('getAll', () => {
    it('should return all organizations', async () => {
      await createTestOrg('Org 1');
      await createTestOrg('Org 2');
      await createTestOrg('Org 3');

      const orgs = await organizationsService.getAll();

      expect(orgs.length).toBe(3);
    });

    it('should return empty array when no organizations exist', async () => {
      const orgs = await organizationsService.getAll();

      expect(orgs).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update organization name', async () => {
      const created = await createTestOrg('Original Name');

      const updated = await organizationsService.update(created.id, { name: 'Updated Name' });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.slug).toBe('original-name'); // Slug should not change
    });

    it('should update organization slug if provided', async () => {
      const created = await createTestOrg('Slug Update Test');

      const updated = await organizationsService.update(created.id, { slug: 'new-slug' });

      expect(updated?.slug).toBe('new-slug');
    });

    it('should update organization domain', async () => {
      const created = await createTestOrg('Domain Update Test');

      const updated = await organizationsService.update(created.id, { domain: 'newdomain.com' });

      expect(updated?.domain).toBe('newdomain.com');
    });

    it('should update organization settings', async () => {
      const created = await createTestOrg('Settings Update Test');

      const updated = await organizationsService.update(created.id, {
        settings: {
          allowDomainJoin: false,
          requireApproval: false,
          defaultRole: 'viewer',
        },
      });

      expect(updated?.settings.allowDomainJoin).toBe(false);
      expect(updated?.settings.requireApproval).toBe(false);
      expect(updated?.settings.defaultRole).toBe('viewer');
    });

    it('should return null for non-existent organization', async () => {
      const updated = await organizationsService.update(generateObjectId(), { name: 'Test' });

      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete organization and all related data', async () => {
      const user = await createUserDocument();
      const created = await organizationsService.create({ name: 'Delete Test', owner_id: user.id });

      // Add join request
      const otherUser = await createUserDocument({ email: 'other@test.com' });
      await organizationsService.createJoinRequest(created.id, otherUser.id);

      const deleted = await organizationsService.delete(created.id);

      expect(deleted).toBe(true);

      // Verify organization is deleted
      const org = await organizationsService.getById(created.id);
      expect(org).toBeNull();

      // Verify members are deleted
      const members = await organizationsService.getMembers(created.id);
      expect(members.length).toBe(0);

      // Verify join requests are deleted
      const requests = await organizationsService.getJoinRequests(created.id);
      expect(requests.length).toBe(0);
    });

    it('should return false for non-existent organization', async () => {
      const deleted = await organizationsService.delete(generateObjectId());

      expect(deleted).toBe(false);
    });
  });

  describe('addMember', () => {
    it('should add member to organization', async () => {
      const created = await createTestOrg('Member Test');
      const user = await createUserDocument({ email: 'newmember@test.com' });

      const member = await organizationsService.addMember(created.id, user.id, 'member');

      expect(member).not.toBeNull();
      expect(member?.organization_id).toBe(created.id);
      expect(member?.user_id).toBe(user.id);
      expect(member?.role).toBe('member');
      expect(member?.joined_at).toBeDefined();
    });

    it('should default role to member if not specified', async () => {
      const created = await createTestOrg('Default Role Test');
      const user = await createUserDocument({ email: 'defaultrole@test.com' });

      const member = await organizationsService.addMember(created.id, user.id);

      expect(member?.role).toBe('member');
    });

    it('should return existing member if already a member', async () => {
      const created = await createTestOrg('Existing Member Test');
      const user = await createUserDocument({ email: 'existing@test.com' });

      const member1 = await organizationsService.addMember(created.id, user.id, 'member');
      const member2 = await organizationsService.addMember(created.id, user.id, 'admin');

      expect(member1?.id).toBe(member2?.id);
      expect(member2?.role).toBe('member'); // Role should not change
    });

    it('should return null for non-existent organization', async () => {
      const user = await createUserDocument();

      const member = await organizationsService.addMember(generateObjectId(), user.id);

      expect(member).toBeNull();
    });

    it('should set user organization_id if not already set', async () => {
      const created = await createTestOrg('First Org Test');
      const user = await createUserDocument({ email: 'firstorg@test.com' });

      await organizationsService.addMember(created.id, user.id);

      const updatedUser = await database.findById<any>('users', user.id);
      expect(updatedUser?.organization_id).toBe(created.id);
    });

    it('should not change user organization_id if already set', async () => {
      const org1 = await createTestOrg('First Org');
      const org2 = await createTestOrg('Second Org');
      const user = await createUserDocument({ email: 'multiorg@test.com' });

      // Join first org
      await organizationsService.addMember(org1.id, user.id);

      // Join second org
      await organizationsService.addMember(org2.id, user.id);

      // User should still have first org as active
      const updatedUser = await database.findById<any>('users', user.id);
      expect(updatedUser?.organization_id).toBe(org1.id);
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', async () => {
      const created = await createTestOrg('Role Update Test');
      const user = await createUserDocument({ email: 'roleupdate@test.com' });
      await organizationsService.addMember(created.id, user.id, 'member');

      const updated = await organizationsService.updateMemberRole(created.id, user.id, 'admin');

      expect(updated?.role).toBe('admin');
    });

    it('should return null if member does not exist', async () => {
      const created = await createTestOrg('No Member Test');

      const updated = await organizationsService.updateMemberRole(created.id, generateObjectId(), 'admin');

      expect(updated).toBeNull();
    });
  });

  describe('removeMember', () => {
    it('should remove member from organization', async () => {
      const created = await createTestOrg('Remove Member Test');
      const user = await createUserDocument({ email: 'removemember@test.com' });
      await organizationsService.addMember(created.id, user.id);

      const removed = await organizationsService.removeMember(created.id, user.id);

      expect(removed).toBe(true);

      const member = await organizationsService.getMember(created.id, user.id);
      expect(member).toBeNull();
    });

    it('should clear user organization_id when removed', async () => {
      const created = await createTestOrg('Clear Org Test');
      const user = await createUserDocument({ email: 'clearorg@test.com' });
      await organizationsService.addMember(created.id, user.id);

      await organizationsService.removeMember(created.id, user.id);

      const updatedUser = await database.findById<any>('users', user.id);
      expect(updatedUser?.organization_id).toBeNull();
    });

    it('should return false if member does not exist', async () => {
      const created = await createTestOrg('No Remove Test');

      const removed = await organizationsService.removeMember(created.id, generateObjectId());

      expect(removed).toBe(false);
    });
  });

  describe('createJoinRequest', () => {
    it('should create join request', async () => {
      const created = await createTestOrg('Join Request Test');
      const user = await createUserDocument({ email: 'joinrequest@test.com' });

      const request = await organizationsService.createJoinRequest(created.id, user.id);

      expect(request).not.toBeNull();
      expect(request?.organization_id).toBe(created.id);
      expect(request?.user_id).toBe(user.id);
      expect(request?.status).toBe('pending');
      expect(request?.requested_at).toBeDefined();
    });

    it('should return null for non-existent organization', async () => {
      const user = await createUserDocument();

      const request = await organizationsService.createJoinRequest(generateObjectId(), user.id);

      expect(request).toBeNull();
    });

    it('should return null if user is already a member', async () => {
      const user = await createUserDocument();
      const created = await organizationsService.create({ name: 'Already Member Test', owner_id: user.id });

      const request = await organizationsService.createJoinRequest(created.id, user.id);

      expect(request).toBeNull();
    });

    it('should return existing request if already pending', async () => {
      const created = await createTestOrg('Existing Request Test');
      const user = await createUserDocument({ email: 'pendinguser@test.com' });

      const request1 = await organizationsService.createJoinRequest(created.id, user.id);
      const request2 = await organizationsService.createJoinRequest(created.id, user.id);

      expect(request1?.id).toBe(request2?.id);
    });
  });

  describe('resolveJoinRequest', () => {
    it('should approve join request and add user as member', async () => {
      const created = await createTestOrg('Approve Request Test');
      const user = await createUserDocument({ email: 'toapprove@test.com' });
      const admin = await createUserDocument({ email: 'admin@test.com' });
      const request = await organizationsService.createJoinRequest(created.id, user.id);

      const resolved = await organizationsService.resolveJoinRequest(request!.id, true, admin.id);

      expect(resolved?.status).toBe('approved');
      expect(resolved?.resolved_at).toBeDefined();
      expect(resolved?.resolved_by).toBe(admin.id);

      // Verify user is now a member
      const member = await organizationsService.getMember(created.id, user.id);
      expect(member).not.toBeNull();
      expect(member?.role).toBe('member'); // Default role
    });

    it('should reject join request', async () => {
      const created = await createTestOrg('Reject Request Test');
      const user = await createUserDocument({ email: 'toreject@test.com' });
      const admin = await createUserDocument({ email: 'rejectadmin@test.com' });
      const request = await organizationsService.createJoinRequest(created.id, user.id);

      const resolved = await organizationsService.resolveJoinRequest(request!.id, false, admin.id);

      expect(resolved?.status).toBe('rejected');

      // Verify user is NOT a member
      const member = await organizationsService.getMember(created.id, user.id);
      expect(member).toBeNull();
    });

    it('should return null for non-existent request', async () => {
      const resolved = await organizationsService.resolveJoinRequest(generateObjectId(), true, generateObjectId());

      expect(resolved).toBeNull();
    });

    it('should return null for already resolved request', async () => {
      const created = await createTestOrg('Already Resolved Test');
      const user = await createUserDocument({ email: 'resolved@test.com' });
      const admin = await createUserDocument({ email: 'resolvedadmin@test.com' });
      const request = await organizationsService.createJoinRequest(created.id, user.id);

      await organizationsService.resolveJoinRequest(request!.id, true, admin.id);
      const resolved = await organizationsService.resolveJoinRequest(request!.id, false, admin.id);

      expect(resolved).toBeNull();
    });
  });

  describe('getUserOrganizations', () => {
    it('should return all organizations for a user', async () => {
      const user = await createUserDocument();
      const org1 = await createTestOrg('User Org 1');
      const org2 = await createTestOrg('User Org 2');

      await organizationsService.addMember(org1.id, user.id);
      await organizationsService.addMember(org2.id, user.id);

      const orgs = await organizationsService.getUserOrganizations(user.id);

      expect(orgs.length).toBe(2);
      expect(orgs.map(o => o.name)).toContain('User Org 1');
      expect(orgs.map(o => o.name)).toContain('User Org 2');
    });

    it('should return empty array if user has no organizations', async () => {
      const user = await createUserDocument();

      const orgs = await organizationsService.getUserOrganizations(user.id);

      expect(orgs).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return organization statistics', async () => {
      const owner = await createUserDocument();
      const member = await createUserDocument({ email: 'statsmember@test.com' });
      const created = await organizationsService.create({ name: 'Stats Test', owner_id: owner.id });
      await organizationsService.addMember(created.id, member.id);

      const stats = await organizationsService.getStats(created.id);

      expect(stats).not.toBeNull();
      expect(stats?.memberCount).toBe(2); // owner + member
      expect(stats?.adminCount).toBe(1); // owner is admin
      expect(stats?.projectCount).toBe(0);
      expect(stats?.taskCount).toBe(0);
    });

    it('should return null for non-existent organization', async () => {
      const stats = await organizationsService.getStats(generateObjectId());

      expect(stats).toBeNull();
    });
  });

  describe('getMembersWithUsers', () => {
    it('should return members with user data', async () => {
      const owner = await createUserDocument({ name: 'Owner User' });
      const member = await createUserDocument({ email: 'memberdata@test.com', name: 'Member User' });
      const created = await organizationsService.create({ name: 'Members With Users Test', owner_id: owner.id });
      await organizationsService.addMember(created.id, member.id);

      const membersWithUsers = await organizationsService.getMembersWithUsers(created.id);

      expect(membersWithUsers.length).toBe(2);

      const ownerMember = membersWithUsers.find(m => m.user_id === owner.id);
      expect(ownerMember?.user).not.toBeNull();
      expect(ownerMember?.user?.name).toBe('Owner User');

      const regularMember = membersWithUsers.find(m => m.user_id === member.id);
      expect(regularMember?.user).not.toBeNull();
      expect(regularMember?.user?.name).toBe('Member User');
    });

    it('should return empty array for organization with no members', async () => {
      // This test doesn't make sense with required owner_id - owner is always a member
      // Let's test a deleted org's members instead
      const owner = await createUserDocument();
      const created = await organizationsService.create({ name: 'No Members Test', owner_id: owner.id });

      // Delete the org and its members
      await organizationsService.delete(created.id);

      const membersWithUsers = await organizationsService.getMembersWithUsers(created.id);

      expect(membersWithUsers).toEqual([]);
    });
  });
});
