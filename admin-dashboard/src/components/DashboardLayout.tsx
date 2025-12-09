import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import apiService from '../services/api.service';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Navigation items with proper organization
const mainNavigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard',
    icon: (
      <svg className="w-6 h-6 stroke-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  },
  { 
    name: 'Users', 
    href: '/users',
    icon: (
      <svg className="w-6 h-6 stroke-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  },
  { 
    name: 'Dumps', 
    href: '/dumps',
    icon: (
      <svg className="w-6 h-6 stroke-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
      </svg>
    )
  },
  { 
    name: 'Reviews', 
    href: '/reviews',
    icon: (
      <svg className="w-6 h-6 stroke-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  { 
    name: 'Feedback', 
    href: '/feedback',
    icon: (
      <svg className="w-6 h-6 stroke-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    )
  },
];

const analyticsNavigation = [
  { 
    name: 'Analytics', 
    href: '/analytics',
    icon: (
      <svg className="w-6 h-6 stroke-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  { 
    name: 'Search Metrics', 
    href: '/analytics/search',
    icon: (
      <svg className="w-6 h-6 stroke-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )
  },
  { 
    name: 'AI Metrics', 
    href: '/analytics/ai',
    icon: (
      <svg className="w-6 h-6 stroke-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )
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
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 ${isCollapsed ? 'w-16' : 'w-64'} bg-gray-900 transition-all duration-300 ease-in-out`}>
        <div className="flex h-full flex-col overflow-hidden text-gray-400">
          {/* Logo */}
          <div className={`flex ${isCollapsed ? 'justify-center' : 'w-full px-3'} mt-3`}>
            <Link to="/dashboard" className={`flex items-center ${isCollapsed ? 'justify-center' : 'w-full'} group`}>
              <img 
                src="/logo192.png" 
                alt="Clutter.AI Logo" 
                className="w-8 h-8 object-contain"
              />
              {!isCollapsed && (
                  <span className="ml-2 text-xl font-bold text-white" style={{ fontFamily: "'Bagel Fat One', system-ui" }}>Clutter.AI</span>
              )}
            </Link>
          </div>

          {/* Toggle Button */}
          <div className={`${isCollapsed ? 'px-2' : 'px-3'} mt-3`}>
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center w-full h-10 rounded hover:bg-gray-700 hover:text-gray-300 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className="w-6 h-6 stroke-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isCollapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
              </svg>
            </button>
          </div>

          {/* Main Navigation */}
          <div className={`${isCollapsed ? 'px-2' : 'w-full px-2'}`}>
            <div className="flex flex-col items-center w-full mt-3 border-t border-gray-700">
              {mainNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center ${isCollapsed ? 'justify-center w-12' : 'w-full px-3'} h-12 mt-2 rounded ${
                      isActive 
                        ? 'bg-gray-700 text-gray-200' 
                        : 'hover:bg-gray-700 hover:text-gray-300'
                    } transition-colors`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    {item.icon}
                    {!isCollapsed && (
                      <span className="ml-2 text-sm font-medium">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Analytics Section */}
            <div className="flex flex-col items-center w-full mt-2 border-t border-gray-700">
              {analyticsNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center ${isCollapsed ? 'justify-center w-12' : 'w-full px-3'} h-12 mt-2 rounded ${
                      isActive 
                        ? 'bg-gray-700 text-gray-200' 
                        : 'hover:bg-gray-700 hover:text-gray-300'
                    } transition-colors`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    {item.icon}
                    {!isCollapsed && (
                      <span className="ml-2 text-sm font-medium">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User Section at Bottom */}
          <div className="mt-auto">
            <button
              onClick={handleLogout}
              className={`flex items-center justify-center w-full h-16 bg-gray-800 hover:bg-gray-700 hover:text-gray-300 transition-colors`}
              title={isCollapsed ? 'Logout' : undefined}
            >
              <svg className="w-6 h-6 stroke-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!isCollapsed && (
                <span className="ml-2 text-sm font-medium">Logout</span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`${isCollapsed ? 'pl-16' : 'pl-64'} transition-all duration-300 ease-in-out`}>
        <main className="py-8 px-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
