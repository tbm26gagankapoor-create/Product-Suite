import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Mail,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { VulcanIcon } from './VulcanLogo';
import { useTheme } from '../context/ThemeContext';
import ParticleBackground from './ParticleBackground';
import { authService } from '../services/auth.service';

interface ForgotPasswordViewProps {
  onBack: () => void;
}

const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onBack }) => {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      await authService.resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
          <VulcanIcon size={32} color="white" />
          <span className="font-bold text-xl text-white leading-none tracking-[0.1em]">VULCAN</span>
        </div>

        {/* Center: Hero Content */}
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-5xl xl:text-7xl font-bold text-white tracking-tight mb-2">
            VULCAN
          </h1>
          <h1 className="text-5xl xl:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-600 tracking-tight mb-8">
            PRODUCTS
          </h1>

          <p className="text-lg text-gray-400 leading-relaxed max-w-xl mb-10">
            From vision to execution, Vulcan transforms product ideas into actionable plans. Manage your projects, sprints, and roadmaps in one unified ecosystem.
          </p>
        </div>

        {/* Bottom: Footer Info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-gray-500 font-medium">
          <span>&copy; 2024 Vulcan Inc.</span>
        </div>
      </div>

      {/* RIGHT PANEL: Forgot Password Form */}
      <div className="w-full lg:w-[45%] bg-white dark:bg-[#0B0C0E] flex flex-col relative z-10 transition-colors duration-500">
        <div className="flex items-center justify-between p-6 lg:p-8 absolute top-0 left-0 w-full z-20">
          <div className="lg:hidden flex items-center gap-2">
            <VulcanIcon size={28} className="text-[#172B4D] dark:text-white" />
            <span className="font-bold text-lg text-[#172B4D] dark:text-white tracking-widest">VULCAN</span>
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
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-8 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to login
          </button>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-[#172B4D] dark:text-white mb-3">
              Reset Password
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {success ? (
            <div className="p-6 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-bold text-green-800 dark:text-green-300 mb-1">Check your email</h3>
                  <p className="text-green-700 dark:text-green-400 text-sm">
                    We've sent a password reset link to <strong>{email}</strong>. Click the link in the email to reset your password.
                  </p>
                  <button
                    onClick={onBack}
                    className="mt-4 text-sm font-bold text-green-700 dark:text-green-400 hover:underline"
                  >
                    Return to login
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#15171E] border border-slate-200 dark:border-[#2D2F36] rounded-xl py-3 pl-10 pr-4 text-sm text-[#172B4D] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all"
                  />
                </div>
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
                    Send Reset Link
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

export default ForgotPasswordView;
