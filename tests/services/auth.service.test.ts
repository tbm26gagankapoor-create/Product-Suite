/**
 * Auth Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../../services/auth.service';

// Mock the httpClient module
vi.mock('../../lib/httpClient', () => ({
  httpClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  setToken: vi.fn(),
  clearToken: vi.fn(),
  getToken: vi.fn(),
}));

// Import the mocked functions
import { httpClient, setToken, clearToken, getToken } from '../../lib/httpClient';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('signUp', () => {
    it('should sign up successfully and store token', async () => {
      const mockResponse = {
        token: 'test-token-123',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      vi.mocked(httpClient.post).mockResolvedValue(mockResponse);

      const result = await authService.signUp('test@example.com', 'password123', 'Test User');

      expect(httpClient.post).toHaveBeenCalledWith(
        '/auth/register',
        { email: 'test@example.com', password: 'password123', name: 'Test User' },
        { skipAuth: true }
      );
      expect(setToken).toHaveBeenCalledWith('test-token-123');
      expect(result.data.user).toEqual(mockResponse.user);
      expect(result.error).toBeNull();
    });

    it('should return error on signup failure', async () => {
      const mockError = new Error('Email already exists');
      vi.mocked(httpClient.post).mockRejectedValue(mockError);

      const result = await authService.signUp('existing@example.com', 'password123', 'Test User');

      expect(result.data.user).toBeNull();
      expect(result.error).toBe(mockError);
    });
  });

  describe('signIn', () => {
    it('should sign in successfully and store token', async () => {
      const mockResponse = {
        token: 'auth-token-456',
        user: {
          id: 'user-2',
          email: 'login@example.com',
          name: 'Login User',
        },
      };

      vi.mocked(httpClient.post).mockResolvedValue(mockResponse);

      const result = await authService.signIn('login@example.com', 'password123');

      expect(httpClient.post).toHaveBeenCalledWith(
        '/auth/login',
        { email: 'login@example.com', password: 'password123' },
        { skipAuth: true }
      );
      expect(setToken).toHaveBeenCalledWith('auth-token-456');
      expect(result.data.user).toEqual(mockResponse.user);
      expect(result.data.session?.access_token).toBe('auth-token-456');
      expect(result.error).toBeNull();
    });

    it('should return error on invalid credentials', async () => {
      const mockError = new Error('Invalid credentials');
      vi.mocked(httpClient.post).mockRejectedValue(mockError);

      const result = await authService.signIn('wrong@example.com', 'wrongpassword');

      expect(result.data.user).toBeNull();
      expect(result.data.session).toBeNull();
      expect(result.error).toBe(mockError);
    });
  });

  describe('signOut', () => {
    it('should clear token and localStorage on sign out', async () => {
      localStorage.setItem('vulcan_user', JSON.stringify({ id: '1' }));
      localStorage.setItem('vulcan_session_user', JSON.stringify({ id: '1' }));

      await authService.signOut();

      expect(clearToken).toHaveBeenCalled();
      expect(localStorage.getItem('vulcan_user')).toBeNull();
      expect(localStorage.getItem('vulcan_session_user')).toBeNull();
    });
  });

  describe('getSession', () => {
    it('should return session when token and user exist', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      vi.mocked(getToken).mockReturnValue('valid-token');
      localStorage.setItem('vulcan_user', JSON.stringify(mockUser));

      const session = await authService.getSession();

      expect(session).toEqual({ access_token: 'valid-token', user: mockUser });
    });

    it('should return null when token is missing', async () => {
      vi.mocked(getToken).mockReturnValue(null);

      const session = await authService.getSession();

      expect(session).toBeNull();
    });

    it('should return null when user data is missing', async () => {
      vi.mocked(getToken).mockReturnValue('valid-token');
      localStorage.removeItem('vulcan_user');

      const session = await authService.getSession();

      expect(session).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch and return current user', async () => {
      const mockApiResponse = {
        id: 'user-1',
        name: 'Current User',
        email: 'current@example.com',
      };

      vi.mocked(getToken).mockReturnValue('valid-token');
      vi.mocked(httpClient.get).mockResolvedValue(mockApiResponse);

      const user = await authService.getCurrentUser();

      expect(httpClient.get).toHaveBeenCalledWith('/auth/me');
      expect(user).toBeDefined();
    });

    it('should return null when not authenticated', async () => {
      vi.mocked(getToken).mockReturnValue(null);

      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
      expect(httpClient.get).not.toHaveBeenCalled();
    });

    it('should return null on API error', async () => {
      vi.mocked(getToken).mockReturnValue('valid-token');
      vi.mocked(httpClient.get).mockRejectedValue(new Error('Network error'));

      const user = await authService.getCurrentUser();

      expect(user).toBeNull();
    });
  });

  describe('signInWithOAuth', () => {
    it('should redirect to Google OAuth', async () => {
      const originalLocation = window.location;
      // @ts-ignore
      delete window.location;
      window.location = { href: '' } as Location;

      await authService.signInWithOAuth('google');

      expect(window.location.href).toBe('/api/v1/auth/google');

      window.location = originalLocation;
    });

    it('should redirect to Microsoft OAuth', async () => {
      const originalLocation = window.location;
      // @ts-ignore
      delete window.location;
      window.location = { href: '' } as Location;

      await authService.signInWithOAuth('microsoft');

      expect(window.location.href).toBe('/api/v1/auth/microsoft');

      window.location = originalLocation;
    });

    it('should return error for unsupported provider', async () => {
      const result = await authService.signInWithOAuth('github');

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('github OAuth not supported');
    });
  });

  describe('resetPassword', () => {
    it('should call reset password endpoint', async () => {
      vi.mocked(httpClient.post).mockResolvedValue({});

      await authService.resetPassword('reset@example.com');

      expect(httpClient.post).toHaveBeenCalledWith(
        '/auth/reset-password',
        { email: 'reset@example.com' },
        { skipAuth: true }
      );
    });
  });

  describe('updatePassword', () => {
    it('should call update password endpoint', async () => {
      vi.mocked(httpClient.post).mockResolvedValue({});

      await authService.updatePassword('newPassword123');

      expect(httpClient.post).toHaveBeenCalledWith('/auth/update-password', { password: 'newPassword123' }, undefined);
    });
  });

  describe('onAuthStateChange', () => {
    it('should return a cleanup function', () => {
      const callback = vi.fn();
      const cleanup = authService.onAuthStateChange(callback);

      expect(typeof cleanup).toBe('function');
      // The cleanup function should not throw
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('refreshSession', () => {
    it('should return current session', async () => {
      const mockUser = { id: 'user-1' };
      vi.mocked(getToken).mockReturnValue('token');
      localStorage.setItem('vulcan_user', JSON.stringify(mockUser));

      const session = await authService.refreshSession();

      expect(session).toEqual({ access_token: 'token', user: mockUser });
    });
  });
});
