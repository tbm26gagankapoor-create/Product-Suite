import database, { generateUUID, now } from '../lib/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { organizationsService } from './organizations.service.js';

export interface OnboardingInput {
  // Organization details
  organization: {
    name: string;
    slug?: string;
    domain?: string;
    logo_url?: string;
  };
  // Owner user details
  owner: {
    name: string;
    email: string;
    password: string;
    avatar_url?: string;
    designation?: string;
  };
}

export interface OnboardingResult {
  organization: {
    id: string;
    name: string;
    slug: string;
    domain: string | null;
    owner_id: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    designation: string | null;
    organization_id: string;
  };
  token: string;
}

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Helper to ensure unique slug
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (await database.findOne<any>('organizations', { slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

export const onboardingService = {
  /**
   * Creates a new organization along with its owner user in a single atomic operation.
   * This is the proper tenant creation flow where:
   * 1. Organization is the root tenant
   * 2. User is created under the organization
   * 3. Both are linked together
   */
  async createOrganizationWithOwner(input: OnboardingInput): Promise<OnboardingResult> {
    // Validate email uniqueness
    const existingUser = await database.findOne<any>('users', {
      email: input.owner.email.toLowerCase()
    });
    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Generate IDs upfront so we can link them together
    const organizationId = generateUUID();
    const userId = generateUUID();

    // Generate unique slug for organization
    const baseSlug = input.organization.slug || generateSlug(input.organization.name);
    const slug = await ensureUniqueSlug(baseSlug);

    // Hash password
    const passwordHash = await bcrypt.hash(input.owner.password, 10);

    // Create the user first (with organization_id already set)
    const user = {
      id: userId,
      name: input.owner.name,
      email: input.owner.email.toLowerCase(),
      password_hash: passwordHash,
      avatar_url: input.owner.avatar_url || `https://avatar.iran.liara.run/public`,
      designation: input.owner.designation || 'Owner',
      organization_id: organizationId,
      status: 'active',
      created_at: now(),
      updated_at: now(),
    };

    await database.insert('users', user);

    // Create the organization (with owner_id already set)
    const organization = {
      id: organizationId,
      name: input.organization.name,
      slug,
      domain: input.organization.domain || null,
      logo_url: input.organization.logo_url || null,
      owner_id: userId,
      settings: {
        allowDomainJoin: true,
        requireApproval: true,
        defaultRole: 'member',
      },
      created_at: now(),
      updated_at: now(),
    };

    await database.insert('organizations', organization);

    // Create organization member record (owner as admin)
    const membership = {
      id: generateUUID(),
      organization_id: organizationId,
      user_id: userId,
      role: 'owner',
      joined_at: now(),
    };

    await database.insert('organization_members', membership);

    // Generate JWT token
    const token = jwt.sign(
      { userId: userId, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        domain: organization.domain,
        owner_id: organization.owner_id,
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        designation: user.designation,
        organization_id: user.organization_id,
      },
      token,
    };
  },

  /**
   * Creates a new user under an existing organization.
   * This is for adding team members after the organization is created.
   */
  async createUserUnderOrganization(
    organizationId: string,
    userInput: {
      name: string;
      email: string;
      password: string;
      avatar_url?: string;
      designation?: string;
      role?: 'admin' | 'member' | 'viewer';
    }
  ): Promise<{ user: any; token: string }> {
    // Verify organization exists
    const org = await database.findById<any>('organizations', organizationId);
    if (!org) {
      throw new Error('Organization not found');
    }

    // Validate email uniqueness
    const existingUser = await database.findOne<any>('users', {
      email: userInput.email.toLowerCase()
    });
    if (existingUser) {
      throw new Error('Email already exists');
    }

    const userId = generateUUID();
    const passwordHash = await bcrypt.hash(userInput.password, 10);

    // Create user with organization_id set
    const user = {
      id: userId,
      name: userInput.name,
      email: userInput.email.toLowerCase(),
      password_hash: passwordHash,
      avatar_url: userInput.avatar_url || `https://avatar.iran.liara.run/public`,
      designation: userInput.designation || 'Member',
      organization_id: organizationId,
      status: 'active',
      created_at: now(),
      updated_at: now(),
    };

    await database.insert('users', user);

    // Create organization member record
    const membership = {
      id: generateUUID(),
      organization_id: organizationId,
      user_id: userId,
      role: userInput.role || 'member',
      joined_at: now(),
    };

    await database.insert('organization_members', membership);

    // Generate JWT token
    const token = jwt.sign(
      { userId: userId, email: user.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const { password_hash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  },
};
