/**
 * Auth Service - Uses Centralized HTTP Client
 */

import { httpClient, setToken, clearToken, getToken } from '../lib/httpClient';
import { mapUser } from '../lib/mappers';

export interface AuthResult {
  data: { user: any | null; session: any | null };
  error: Error | null;
}

export class AuthService {
  // Sign up with email/password
  async signUp(email: string, password: string, fullName: string, avatarUrl?: string): Promise<AuthResult> {
    try {
      const response = await httpClient.post<any>('/auth/register', {
        email,
        password,
        name: fullName,
      }, { skipAuth: true });

      // Store token
      if (response.token) {
        setToken(response.token);
        localStorage.setItem('vulcan_user', JSON.stringify(response.user));
      }

      return { data: { user: response.user, session: null }, error: null };
    } catch (error) {
      return { data: { user: null, session: null }, error: error as Error };
    }
  }

  // Sign in with email/password
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const response = await httpClient.post<any>('/auth/login', {
        email,
        password,
      }, { skipAuth: true });

      // Store token
      if (response.token) {
        setToken(response.token);
        localStorage.setItem('vulcan_user', JSON.stringify(response.user));
      }

      return {
        data: { user: response.user, session: { access_token: response.token } },
        error: null,
      };
    } catch (error) {
      return { data: { user: null, session: null }, error: error as Error };
    }
  }

  // Sign in with OAuth provider
  async signInWithOAuth(provider: 'microsoft' | 'google' | 'github'): Promise<AuthResult> {
    if (provider === 'microsoft') {
      // Redirect to backend OAuth endpoint - this will navigate away from the page
      window.location.href = '/api/v1/auth/microsoft';
      // This won't actually return since we're redirecting
      return { data: { user: null, session: null }, error: null };
    }

    if (provider === 'google') {
      window.location.href = '/api/v1/auth/google';
      return { data: { user: null, session: null }, error: null };
    }

    // Other providers not yet implemented
    console.warn(`OAuth sign-in for ${provider} is not yet supported`);
    return { data: { user: null, session: null }, error: new Error(`${provider} OAuth not supported`) };
  }

  // Sign out current user
  async signOut(): Promise<void> {
    clearToken();
    localStorage.removeItem('vulcan_user');
    localStorage.removeItem('vulcan_session_user');
  }

  // Get current session
  async getSession(): Promise<any | null> {
    const token = getToken();
    const userStr = localStorage.getItem('vulcan_user');

    if (!token || !userStr) {
      return null;
    }

    try {
      const user = JSON.parse(userStr);
      return { access_token: token, user };
    } catch {
      return null;
    }
  }

  // Get current authenticated user profile
  async getCurrentUser(): Promise<any | null> {
    const token = getToken();
    if (!token) return null;

    try {
      const response = await httpClient.get<any>('/auth/me');
      return mapUser(response);
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  }

  // Reset password - send email
  async resetPassword(email: string): Promise<void> {
    await httpClient.post('/auth/reset-password', { email }, { skipAuth: true });
  }

  // Update password (for logged in user)
  async updatePassword(newPassword: string, resetToken?: string): Promise<void> {
    const payload: Record<string, string> = { password: newPassword };
    if (resetToken) {
      payload.token = resetToken;
    }
    await httpClient.post('/auth/update-password', payload, resetToken ? { skipAuth: true } : undefined);
  }

  // Verify OTP (not supported in local backend)
  async verifyOtp(
    email: string,
    token: string,
    type: 'signup' | 'recovery' | 'invite' | 'magiclink'
  ): Promise<AuthResult> {
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
