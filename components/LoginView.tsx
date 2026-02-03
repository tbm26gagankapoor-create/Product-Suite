
import React, { useState } from 'react';
import {
  ChevronsRight,
  Sun,
  Moon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import ParticleBackground from './ParticleBackground';

// Backend API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface LoginViewProps {
  onLogin: () => void;
  onForgotPassword: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onForgotPassword }) => {
  const { theme, toggleTheme } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Microsoft OAuth handler
  const handleMicrosoftLogin = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = `${API_URL}/auth/microsoft`;
  };

  // Google OAuth handler
  const handleGoogleLogin = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!isLogin && !name) {
      setError('Please enter your full name.');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        // Login via local backend API
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Invalid login credentials');
        }

        // Store session info
        localStorage.setItem('infinia_session_user', email);
        localStorage.setItem('infinia_token', data.data.token);
        localStorage.setItem('infinia_user', JSON.stringify(data.data.user));
        onLogin();
      } else {
        // Sign Up via local backend API
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to create account');
        }

        // Auto-login after signup
        localStorage.setItem('infinia_session_user', email);
        localStorage.setItem('infinia_token', data.data.token);
        localStorage.setItem('infinia_user', JSON.stringify(data.data.user));
        onLogin();
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = err.message || "Authentication failed.";

      if (msg.includes("Invalid credentials")) {
        msg = "Invalid email or password.";
      }

      setError(msg);
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
          <ChevronsRight className="text-white" size={32} strokeWidth={2.5} />
          <div className="flex flex-col justify-center">
             <span className="font-bold text-xl text-white leading-none tracking-[0.1em]">INFINIA</span>
             <span className="text-[10px] text-gray-400 font-bold tracking-[0.25em] leading-none mt-1">TECHNOLOGIES</span>
          </div>
        </div>

        {/* Center: Hero Content */}
        <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-6 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                System v2.0 Live
            </div>

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
            <span>© 2024 Infinia Inc.</span>
        </div>
      </div>

      {/* RIGHT PANEL: Auth Form */}
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
                    {isLogin ? 'Welcome Back' : 'Create an Account'}
                 </h2>
                 <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {isLogin
                        ? 'Enter your credentials to access the Infinia Portal.'
                        : 'Join the team and start building the future.'}
                 </p>
             </div>

             <div className="p-1 bg-slate-100 dark:bg-[#1F2128] rounded-xl mb-8 flex">
                <button
                    onClick={() => { setIsLogin(true); setError(''); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white dark:bg-[#2D2F36] text-[#172B4D] dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                    Log In
                </button>
                <button
                    onClick={() => { setIsLogin(false); setError(''); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white dark:bg-[#2D2F36] text-[#172B4D] dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                >
                    Sign Up
                </button>
             </div>

             <form onSubmit={handleSubmit} className="space-y-5">
                <div className={`transition-all duration-300 overflow-hidden ${!isLogin ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                    <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-[#15171E] border border-slate-200 dark:border-[#2D2F36] rounded-xl py-3 pl-10 pr-4 text-sm text-[#172B4D] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
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

                <div>
                    <div className="flex justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
                        {isLogin && <button type="button" onClick={onForgotPassword} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">Forgot?</button>}
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
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
                        <span className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                        </span>
                    ) : (
                        <>
                            {isLogin ? 'Sign In' : 'Create Account'}
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>

                {/* OAuth Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-[#2D2F36]"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-[#0B0C0E] px-2 text-slate-500 dark:text-slate-400 font-medium">
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* OAuth Buttons */}
                <div className="space-y-3">
                  {/* Google OAuth Button */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full border border-slate-200 dark:border-[#2D2F36] bg-white dark:bg-[#15171E] hover:bg-slate-50 dark:hover:bg-[#1F2128] text-[#172B4D] dark:text-white font-medium py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {/* Google Logo */}
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                  </button>

                  {/* Microsoft OAuth Button */}
                  <button
                    type="button"
                    onClick={handleMicrosoftLogin}
                    disabled={isLoading}
                    className="w-full border border-slate-200 dark:border-[#2D2F36] bg-white dark:bg-[#15171E] hover:bg-slate-50 dark:hover:bg-[#1F2128] text-[#172B4D] dark:text-white font-medium py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {/* Microsoft Logo */}
                    <svg className="w-5 h-5" viewBox="0 0 21 21">
                      <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                      <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                      <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                    </svg>
                    Sign in with Microsoft
                  </button>
                </div>
             </form>
         </div>
      </div>
    </div>
  );
};

export default LoginView;
