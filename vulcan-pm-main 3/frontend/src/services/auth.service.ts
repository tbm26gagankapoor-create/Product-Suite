/**
 * Auth Service - Uses Local Backend
 * All Supabase calls have been replaced with local backend API calls
 */

import { api } from '../lib/api';

export interface AuthResult {
  data: { user: any | null; session: any | null };
  error: Error | null;
}

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

export class AuthService {
  // Sign up with email/password
  async signUp(email: string, password: string, fullName: string, avatarUrl?: string): Promise<AuthResult> {
    return api.auth.signUp(email, password, fullName);
  }

  // Sign in with email/password
  async signIn(email: string, password: string): Promise<AuthResult> {
    return api.auth.signIn(email, password);
  }

  // Sign in with OAuth provider (not supported in local backend)
  async signInWithOAuth(provider: 'google' | 'github'): Promise<AuthResult> {
    console.warn('OAuth sign-in is not supported with local backend');
    return { data: { user: null, session: null }, error: new Error('OAuth not supported') };
  }

  // Sign out current user
  async signOut(): Promise<void> {
    await api.auth.signOut();
  }

  // Get current session
  async getSession(): Promise<any | null> {
    const { data } = await api.auth.getSession();
    return data.session;
  }

  // Get current authenticated user profile
  async getCurrentUser(): Promise<any | null> {
    const token = localStorage.getItem('infinia_token');
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  }

  // Reset password - send email (needs backend implementation)
  async resetPassword(email: string): Promise<void> {
    const response = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to send password reset email');
    }
  }

  // Update password (for logged in user)
  async updatePassword(newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE}/auth/update-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password: newPassword }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to update password');
    }
  }

  // Verify OTP (not supported in local backend)
  async verifyOtp(email: string, token: string, type: 'signup' | 'recovery' | 'invite' | 'magiclink'): Promise<AuthResult> {
    console.warn('OTP verification is not supported with local backend');
    return { data: { user: null, session: null }, error: new Error('OTP not supported') };
  }

  // Listen to auth state changes (simplified for local backend)
  onAuthStateChange(callback: (event: string, session: any | null) => void): () => void {
    // In local backend, we don't have real-time auth state changes
    // Return a no-op cleanup function
    return () => {};
  }

  // Refresh session token (not needed for simple JWT)
  async refreshSession(): Promise<any | null> {
    return this.getSession();
  }
}

export const authService = new AuthService();
