import React, { useState } from 'react';
import {
  ChevronsRight,
  Sun,
  Moon,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import ParticleBackground from './ParticleBackground';
import { authService } from '../services/auth.service';

interface ResetPasswordViewProps {
  onSuccess: () => void;
}

const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onSuccess }) => {
  const { theme, toggleTheme } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter.';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter.';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password strength
    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Check passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await authService.updatePassword(password);
      setSuccess(true);
    } catch (err: any) {
      console.error('Password update error:', err);
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (): { label: string; color: string; width: string } => {
    if (!password) return { label: '', color: '', width: '0%' };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: '33%' };
    if (score <= 4) return { label: 'Medium', color: 'bg-yellow-500', width: '66%' };
    return { label: 'Strong', color: 'bg-green-500', width: '100%' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-black overflow-hidden font-sans">
      {/* LEFT PANEL: Branding & Hero */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 xl:p-16 overflow-hidden bg-black">
        <div className="absolute inset-0 z-0 opacity-100">
          <ParticleBackground />
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 z-0 pointer-events-none"></div>

        {/* Top: Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <ChevronsRight className="text-white" size={32} strokeWidth={2.5} />
          <div className="flex flex-col justify-center">
            <span className="font-bold text-xl text-white leading-none tracking-[0.1em]">INFINIA</span>
            <span className="text-[10px] text-gray-400 font-bold tracking-[0.25em] leading-none mt-1">TECHNOLOGIES</span>
          </div>
        </div>

        {/* Center: Hero Content */}
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-5xl xl:text-7xl font-bold text-white tracking-tight mb-2">
            INFINIA
          </h1>
          <h1 className="text-5xl xl:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-600 tracking-tight mb-8">
            PRODUCTS
          </h1>

          <p className="text-lg text-gray-400 leading-relaxed max-w-xl mb-10">
            From foundational tech to bold innovations, Infinia fuels the systems that shape tomorrow. Manage your projects, sprints, and roadmaps in one unified ecosystem.
          </p>
        </div>

        {/* Bottom: Footer Info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-gray-500 font-medium">
          <span>&copy; 2024 Infinia Inc.</span>
        </div>
      </div>

      {/* RIGHT PANEL: Reset Password Form */}
      <div className="w-full lg:w-[45%] bg-white dark:bg-[#0B0C0E] flex flex-col relative z-10 transition-colors duration-500">
        <div className="flex items-center justify-between p-6 lg:p-8 absolute top-0 left-0 w-full z-20">
          <div className="lg:hidden flex items-center gap-2">
            <ChevronsRight className="text-[#172B4D] dark:text-white" size={24} />
            <span className="font-bold text-lg text-[#172B4D] dark:text-white tracking-widest">INFINIA</span>
          </div>
          <div className="ml-auto">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-20 max-w-2xl mx-auto w-full">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-[#172B4D] dark:text-white mb-3">
              Set New Password
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Create a strong password for your account.
            </p>
          </div>

          {success ? (
            <div className="p-6 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-bold text-green-800 dark:text-green-300 mb-1">Password Updated</h3>
                  <p className="text-green-700 dark:text-green-400 text-sm">
                    Your password has been successfully updated. You can now log in with your new password.
                  </p>
                  <button
                    onClick={onSuccess}
                    className="mt-4 text-sm font-bold text-green-700 dark:text-green-400 hover:underline"
                  >
                    Continue to login
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#15171E] border border-slate-200 dark:border-[#2D2F36] rounded-xl py-3 pl-10 pr-10 text-sm text-[#172B4D] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2">
                    <div className="h-1 bg-slate-200 dark:bg-[#2D2F36] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: strength.width }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Password strength: <span className="font-medium">{strength.label}</span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#15171E] border border-slate-200 dark:border-[#2D2F36] rounded-xl py-3 pl-10 pr-10 text-sm text-[#172B4D] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <p className="font-medium">Password requirements:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li className={password.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}>
                    At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(password) ? 'text-green-600 dark:text-green-400' : ''}>
                    One uppercase letter
                  </li>
                  <li className={/[a-z]/.test(password) ? 'text-green-600 dark:text-green-400' : ''}>
                    One lowercase letter
                  </li>
                  <li className={/[0-9]/.test(password) ? 'text-green-600 dark:text-green-400' : ''}>
                    One number
                  </li>
                </ul>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-xs font-medium flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Update Password
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordView;
