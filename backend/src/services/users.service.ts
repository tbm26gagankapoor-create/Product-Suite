import database, { generateUUID, now } from '../lib/database.js';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  avatar_url?: string;
  role?: string;
}

export const usersService = {
  getAll(): Omit<User, 'password_hash'>[] {
    return database.getAll<User>('users').map(({ password_hash, ...user }) => user);
  },

  getById(id: string): Omit<User, 'password_hash'> | null {
    const user = database.findById<User>('users', id);
    if (!user) return null;
    const { password_hash, ...rest } = user;
    return rest;
  },

  getByEmail(email: string): User | null {
    return database.findOne<User>('users', u => u.email === email) || null;
  },

  create(input: CreateUserInput): Omit<User, 'password_hash'> {
    if (this.getByEmail(input.email)) {
      throw new Error('UNIQUE constraint failed: email already exists');
    }

    const user: User = {
      id: generateUUID(),
      name: input.name,
      email: input.email,
      password_hash: bcrypt.hashSync(input.password, 10),
      avatar_url: input.avatar_url || null,
      role: input.role || null,
      created_at: now(),
      updated_at: now(),
    };

    database.insert('users', user);
    const { password_hash, ...rest } = user;
    return rest;
  },

  update(id: string, input: Partial<Omit<CreateUserInput, 'password'>>): Omit<User, 'password_hash'> | null {
    const existing = database.findById<User>('users', id);
    if (!existing) return null;

    const updated = database.update<User>('users', id, {
      ...input,
      updated_at: now(),
    });

    if (!updated) return null;
    const { password_hash, ...rest } = updated;
    return rest;
  },

  delete(id: string): boolean {
    return database.delete('users', id);
  },

  validatePassword(user: User, password: string): boolean {
    return bcrypt.compareSync(password, user.password_hash || '');
  },
};
