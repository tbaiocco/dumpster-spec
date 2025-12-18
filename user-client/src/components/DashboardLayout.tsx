import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LuLayoutDashboard, 
  LuFileScan, 
  LuPackageCheck, 
  LuBadgeCheck, 
  LuMessageSquareText, 
  LuLockKeyhole 
} from 'react-icons/lu';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/Button';

export interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * DashboardLayout Component
 * Main layout wrapper for authenticated user pages
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: LuLayoutDashboard },
    { path: '/search', label: t('nav.search'), icon: LuFileScan },
    { path: '/tracking', label: t('nav.tracking'), icon: LuPackageCheck },
    { path: '/review', label: t('nav.review'), icon: LuBadgeCheck },
    { path: '/feedback', label: t('nav.feedback'), icon: LuMessageSquareText },
    { path: '/profile', label: t('nav.profile'), icon: LuLockKeyhole },
  ];

  return (
    <div className="min-h-screen bg-stone flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <h1 className="text-2xl font-heading font-bold bg-gradient-primary bg-clip-text text-transparent">
                Clutter.App
              </h1>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      px-4 py-2 rounded-charming text-sm font-medium transition-all flex items-center gap-2
                      ${
                        location.pathname === item.path
                          ? 'bg-gradient-primary text-white shadow-glow-sm'
                          : 'text-slate-700 hover:bg-slate-100'
                      }
                    `}
                  >
                    <IconComponent className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-sm text-slate-600">
                {user?.phoneNumber}
              </span>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
              >
                {t('nav.logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden sticky top-[73px] z-30 bg-white border-b border-slate-200 px-4 py-2 overflow-x-auto">
        <div className="flex gap-2">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex-shrink-0 px-3 py-1.5 rounded-charming text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5
                  ${
                    location.pathname === item.path
                      ? 'bg-gradient-primary text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }
                `}
              >
                <IconComponent className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          <p>&copy; 2025 Clutter.AI. Your Universal Life Inbox.</p>
        </div>
      </footer>
    </div>
  );
};
