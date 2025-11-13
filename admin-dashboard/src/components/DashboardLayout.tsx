import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './ui/Button';
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
 * Provides navigation and layout for authenticated pages
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    apiService.logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="border-b border-gray-200 p-6">
            <h1 className="text-2xl font-bold text-gray-900">Clutter.AI</h1>
            <p className="text-sm text-gray-500">Admin Dashboard</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="border-t border-gray-200 p-4">
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
};
