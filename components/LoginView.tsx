
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
import { api } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import bcrypt from 'bcryptjs';
import { organizationsService } from '../services/organizations.service';
import { invitesService } from '../services/invites.service';

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
        // Authenticate using bcrypt against users table
        const { data: userRow, error: dbError } = await supabase
          .from('users')
          .select('password, email')
          .eq('email', email)
          .single();

        console.log('DB Query Result:', { userRow, dbError });

        if (dbError || !userRow) {
          console.log('User not found or DB error');
          throw new Error('Invalid login credentials');
        }

        if (!userRow.password) {
          console.log('No password in user row');
          throw new Error('No password set for this account. Please contact support.');
        }

        console.log('Comparing passwords...');
        console.log('Input password:', password);
        console.log('Stored hash:', userRow.password);
        console.log('Hash length:', userRow.password.length);

        // Try both sync and async versions
        const isMatchSync = bcrypt.compareSync(password, userRow.password);
        console.log('bcrypt.compareSync result:', isMatchSync);

        const isMatch = await bcrypt.compare(password, userRow.password);
        console.log('bcrypt.compare result:', isMatch);

        if (!isMatch) {
          throw new Error('Invalid login credentials');
        }

        // Set session marker for the app to recognize
        localStorage.setItem('infinia_session_user', email);
        onLogin();
      } else {
        // Sign Up - hash password and store in users table
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const { data: existingUser } = await supabase
          .from('users')
          .select('email')
          .eq('email', email)
          .single();

        if (existingUser) {
          throw new Error('An account with this email already exists.');
        }

        // Check if user was invited to an organization
        let pendingInvite = null;
        try {
          pendingInvite = await invitesService.getPendingByEmail(email);
        } catch (e) {
          // No pending invite, that's fine
        }

        // Create user record
        const { data: newUser, error: insertError } = await supabase.from('users').insert({
          name: name,
          email: email,
          password: hashedPassword,
          role: 'Member',
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
          is_admin: pendingInvite ? false : true // New org creator is admin
        }).select().single();

        if (insertError || !newUser) {
          throw new Error('Failed to create account. Please try again.');
        }

        // Handle organization setup
        if (pendingInvite) {
          // User was invited - accept the invitation
          try {
            await invitesService.accept(pendingInvite.id, newUser.id);
          } catch (e) {
            console.error('Error accepting invitation:', e);
          }
        } else {
          // New user - create their organization
          try {
            const orgName = `${name}'s Organization`;
            await organizationsService.createWithAdmin(orgName, newUser.id);
          } catch (e) {
            console.error('Error creating organization:', e);
          }
        }

        // Auto-login after signup
        localStorage.setItem('infinia_session_user', email);
        onLogin();
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let msg = err.message || "Authentication failed.";

      if (msg.includes("Invalid login credentials")) {
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
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            {isLogin ? 'Sign In' : 'Create Account'}
                            <ArrowRight size={18} />
                        </>
                    )}
                </button>
             </form>
         </div>
      </div>
    </div>
  );
};

export default LoginView;
