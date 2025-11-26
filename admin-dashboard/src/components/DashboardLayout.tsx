import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import apiService from '../services/api.service';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Users', href: '/users', icon: '👥' },
  { name: 'Dumps', href: '/dumps', icon: '📝' },
  { name: 'Reviews', href: '/reviews', icon: '✅' },
  { name: 'Analytics', href: '/analytics', icon: '📈' },
  { name: 'Search Metrics', href: '/analytics/search', icon: '🔍' },
  { name: 'AI Metrics', href: '/analytics/ai', icon: '🤖' },
];

/**
 * Dashboard Layout Component
 * Beautiful Tailwind-based layout inspired by Pocket template
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    apiService.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-gradient-dark border-r border-slate-800">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center gap-3 px-6 border-b border-slate-800/50">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <span className="text-3xl transition-transform group-hover:scale-110">🗂️</span>
              <div>
                <div className="text-xl font-bold text-gradient">Clutter.AI</div>
                <div className="text-xs text-slate-400 -mt-0.5">Admin Dashboard</div>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4 custom-scrollbar overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all
                    ${isActive 
                      ? 'bg-primary-600 text-white shadow-glow-sm' 
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }
                  `}
                >
                  <span className={`text-lg transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Section & Logout */}
          <div className="border-t border-slate-800/50 p-4 space-y-3">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/30">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white text-sm font-bold">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Admin User</p>
                <p className="text-xs text-slate-400 truncate">admin@clutter.ai</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="pl-64">
        <main className="py-8 px-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
