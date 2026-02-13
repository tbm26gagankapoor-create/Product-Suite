import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Cpu,
  Settings,
  LogOut,
  Shield,
  ScrollText,
  Users,
  ListCheck,
  KeyRound,
  GitBranch,
  Search,
  FileText,
  List,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type Page = 'dashboard' | 'tenants' | 'providers' | 'git-providers' | 'search-providers' | 'prompt-templates' | 'epic-categories' | 'sso' | 'whitelist' | 'settings' | 'audit' | 'admins';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const { admin, logout } = useAuth();

  const navItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tenants' as Page, label: 'Tenants', icon: Building2 },
    { id: 'providers' as Page, label: 'AI Providers', icon: Cpu },
    { id: 'git-providers' as Page, label: 'Git Providers', icon: GitBranch },
    { id: 'search-providers' as Page, label: 'Search Providers', icon: Search },
    { id: 'prompt-templates' as Page, label: 'Prompt Templates', icon: FileText },
    { id: 'epic-categories' as Page, label: 'Epic Categories', icon: List },
    { id: 'sso' as Page, label: 'SSO Federation', icon: KeyRound },
    { id: 'whitelist' as Page, label: 'Domain Whitelist', icon: ListCheck },
    { id: 'settings' as Page, label: 'Settings', icon: Settings },
    { id: 'audit' as Page, label: 'Audit Log', icon: ScrollText },
    { id: 'admins' as Page, label: 'Admins', icon: Users },
  ];

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white">Infinia Admin</div>
            <div className="text-xs text-gray-500">SaaS Portal</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              currentPage === item.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <item.icon size={18} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 font-medium">
            {admin?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{admin?.name}</div>
            <div className="text-xs text-gray-500 truncate">{admin?.email}</div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
