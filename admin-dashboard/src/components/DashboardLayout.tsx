import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CheckCircle, 
  MessageSquare, 
  BarChart3, 
  Search, 
  Lightbulb, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  Activity
} from 'lucide-react';
import apiService from '../services/api.service';
import logo from '../logo.svg';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Navigation items with Lucide React icons
const mainNavigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard',
    icon: LayoutDashboard
  },
  { 
    name: 'Users', 
    href: '/users',
    icon: Users
  },
  { 
    name: 'Dumps', 
    href: '/dumps',
    icon: FileText
  },
  { 
    name: 'Reviews', 
    href: '/reviews',
    icon: CheckCircle
  },
  { 
    name: 'Feedback', 
    href: '/feedback',
    icon: MessageSquare
  },
];

const analyticsNavigation = [
  { 
    name: 'Analytics', 
    href: '/analytics',
    icon: BarChart3
  },
  { 
    name: 'Search Metrics', 
    href: '/analytics/search',
    icon: Search
  },
  { 
    name: 'AI Metrics', 
    href: '/analytics/ai',
    icon: Lightbulb
  },
  { 
    name: 'User Stats', 
    href: '/analytics/users',
    icon: Activity
  },
  { 
    name: 'Feature Usage', 
    href: '/analytics/features',
    icon: Zap
  },
];

/**
 * Dashboard Layout Component
 * Modern sidebar with collapse/expand functionality
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    apiService.logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Sidebar - Clutter.AI Design */}
      <aside className={`fixed inset-y-0 left-0 z-50 ${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-100 transition-all duration-300 ease-in-out shadow-soft`}>
        <div className="flex h-full flex-col">
          {/* Logo Section */}
          <div className={`flex justify-center h-20 border-b border-slate-100`}>
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <img 
                src={logo} 
                alt="Clutter.AI" 
                className="w-10 h-10 object-contain"
              />
            </Link>
          </div>

          {/* Toggle Button */}
          <div className={`${isCollapsed ? 'px-4' : 'px-4'} mt-4`}>
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center w-full h-10 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all duration-200"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" strokeWidth={2} /> : <ChevronLeft className="w-5 h-5" strokeWidth={2} />}
            </button>
          </div>

          {/* Main Navigation */}
          <nav className={`flex-1 ${isCollapsed ? 'px-3' : 'px-4'} mt-6 space-y-1 overflow-y-auto`}>
            {/* Main Section */}
            <div className="space-y-1">
              {mainNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 ${isCollapsed ? 'justify-center px-3' : 'px-4'} h-12 rounded-xl font-sans text-sm font-medium transition-all duration-200 group relative ${
                      isActive 
                        ? 'bg-primary/10 text-primary shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute left-0 w-1 h-8 bg-gradient-to-b from-primary to-secondary rounded-r-full" />
                    )}
                    
                    <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'ml-2'}`} strokeWidth={2} />
                    {!isCollapsed && (
                      <span>{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Analytics Section */}
            <div className="pt-6 mt-6 border-t border-slate-100">
              {!isCollapsed && (
                <p className="px-4 mb-3 text-xs font-heading font-semibold text-slate-400 uppercase tracking-wider">
                  Analytics
                </p>
              )}
              <div className="space-y-1">
                {analyticsNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center gap-3 ${isCollapsed ? 'justify-center px-3' : 'px-4'} h-12 rounded-xl font-sans text-sm font-medium transition-all duration-200 group relative ${
                        isActive 
                          ? 'bg-primary/10 text-primary shadow-sm' 
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                      title={isCollapsed ? item.name : undefined}
                    >
                      {/* Active Indicator */}
                      {isActive && (
                        <div className="absolute left-0 w-1 h-8 bg-gradient-to-b from-primary to-secondary rounded-r-full" />
                      )}
                      
                      <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'ml-2'}`} strokeWidth={2} />
                      {!isCollapsed && (
                        <span>{item.name}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* User Section at Bottom */}
          <div className="border-t border-slate-100">
            <button
              onClick={handleLogout}
              className={`flex items-center gap-3 ${isCollapsed ? 'justify-center px-3' : 'px-4'} w-full h-16 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 font-sans text-sm font-medium`}
              title={isCollapsed ? 'Logout' : undefined}
            >
              <LogOut className="w-5 h-5" strokeWidth={2} />
              {!isCollapsed && (
                <span>Logout</span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`${isCollapsed ? 'pl-20' : 'pl-64'} transition-all duration-300 ease-in-out`}>
        {/* Topbar - Glassmorphism */}
        <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 border-b border-slate-100 shadow-soft">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Page Title or Breadcrumbs can go here */}
              <div className="flex-1">
                <span className="text-2xl font-heading font-bold text-gradient">The Clutter.APP</span>
              </div>
              
              {/* Right Side - Notifications, Profile, etc */}
              <div className="flex items-center gap-4">
                {/* Notification Icon */}
                <button className="relative p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-secondary rounded-full ring-2 ring-white"></span>
                </button>

                {/* User Avatar */}
                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                  <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-purple">
                    <span className="text-white font-heading font-bold text-sm">AD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="py-8 px-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
