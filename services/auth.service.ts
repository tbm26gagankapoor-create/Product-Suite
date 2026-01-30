
import { supabase } from '../lib/supabase';
import { AuthChangeEvent, Session, AuthError } from '@supabase/supabase-js';
import { User } from '../types/database.types';
import { organizationsService } from './organizations.service';
import { invitesService } from './invites.service';

export interface AuthResult {
  data: { user: any | null; session: Session | null };
  error: AuthError | null;
}

export class AuthService {
  // Sign up with email/password
  async signUp(email: string, password: string, fullName: string, avatarUrl?: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          avatar_url: avatarUrl,
        }
      }
    });

    // If signup is successful (and triggers aren't used), ensure public profile exists
    if (data.user && !error) {
      // Check if user was invited to an organization
      const pendingInvite = await invitesService.getPendingByEmail(email);

      const { data: profile, error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        auth_user_id: data.user.id,
        name: fullName,
        email: email,
        role: 'Member',
        avatar_url: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`,
        is_admin: pendingInvite ? false : true, // New org creator is admin
        organization_id: null // Will be set after org creation
      }).select().single();

      if (profileError) {
        console.warn('Error creating user profile manually (check if DB triggers handled it):', profileError);
      } else if (profile) {
        // Handle organization setup
        if (pendingInvite) {
          // User was invited - accept the invitation
          try {
            await invitesService.accept(pendingInvite.id, profile.id);
          } catch (e) {
            console.error('Error accepting invitation:', e);
          }
        } else {
          // New user - create their organization
          try {
            const orgName = `${fullName}'s Organization`;
            await organizationsService.createWithAdmin(orgName, profile.id);
          } catch (e) {
            console.error('Error creating organization:', e);
          }
        }
      }
    }

    return { data, error };
  }

  // Sign in with email/password
  async signIn(email: string, password: string): Promise<AuthResult> {
    return supabase.auth.signInWithPassword({ email, password });
  }

  // Sign in with OAuth provider
  async signInWithOAuth(provider: 'google' | 'github'): Promise<AuthResult> {
    return supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
  }

  // Sign out current user
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  // Get current session
  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error fetching session:', error);
      return null;
    }
    return data.session;
  }

  // Get current authenticated user profile
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    return profile;
  }

  // Reset password - send email
  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) throw error;
  }

  // Update password (for logged in user)
  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  // Verify OTP (for email confirmation)
  async verifyOtp(email: string, token: string, type: 'signup' | 'recovery' | 'invite' | 'magiclink'): Promise<AuthResult> {
    return supabase.auth.verifyOtp({ email, token, type });
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return () => subscription.unsubscribe();
  }

  // Refresh session token
  async refreshSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Error refreshing session:', error);
      return null;
    }
    return data.session;
  }
}

export const authService = new AuthService();
