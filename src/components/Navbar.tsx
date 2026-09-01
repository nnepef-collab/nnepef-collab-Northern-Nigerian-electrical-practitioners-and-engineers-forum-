import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { 
  Home, 
  ShieldCheck, 
  UserPlus, 
  LogIn, 
  ShieldAlert, 
  Newspaper, 
  Calendar, 
  FolderDown, 
  Image as ImageIcon, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  Download,
  Info,
  Phone,
  Users,
  User,
  Wifi,
  WifiOff,
  RefreshCw,
  Database
} from 'lucide-react';
import { ForumSettings, Member } from '../types';
import { subscribeToSyncStatus, SyncStatusState } from '../lib/syncManager';
import { SyncManagerModal } from './SyncManagerModal';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  currentUser: Member | null;
  setCurrentUser: (user: Member | null) => void;
  isAdminLoggedIn: boolean;
  setIsAdminLoggedIn: (val: boolean) => void;
  settings?: ForumSettings;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  darkMode,
  setDarkMode,
  currentUser,
  setCurrentUser,
  isAdminLoggedIn,
  setIsAdminLoggedIn,
  settings,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: 0,
    isSyncing: false,
    lastSyncedAt: null,
    lastSyncError: null,
    syncedCount: 0,
    failedCount: 0,
  });

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    const unsubscribeSync = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      unsubscribeSync();
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsPwaInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert("N-NEPEF 2020 Portal: To install on mobile, tap 'Add to Home Screen' or 'Install App' in your browser options.");
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'leadership', label: 'Leadership', icon: Users },
    { id: 'verify', label: 'Verify Member', icon: ShieldCheck },
    { id: 'register', label: 'Register', icon: UserPlus },
    { id: 'news', label: 'News & Media', icon: Newspaper },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'documents', label: 'Documents', icon: FolderDown },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs transition-all duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2 flex items-center justify-between relative min-h-[56px] sm:min-h-[64px]">
        
        {/* Left Side: Single Official Brand Logo & Desktop Navigation */}
        <div className="flex items-center gap-3 lg:gap-5">
          <div 
            onClick={() => { setCurrentView('home'); setMobileMenuOpen(false); }}
            className="flex items-center cursor-pointer group flex-shrink-0"
            title="N-NEPEF 2020 Home"
          >
            <Logo size="md" showText={false} logoUrl={settings?.logoUrl} forumName={settings?.forumName} />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive 
                      ? 'bg-[#0A2E73] text-white shadow-xs dark:bg-[#2EA3F2] dark:text-slate-950'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Light/Dark Theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* PWA Install */}
          <button
            onClick={handleInstallPwa}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900 transition-colors"
            title="Install App as PWA"
          >
            <Download className="w-3 h-3" />
            <span>PWA</span>
          </button>

          {/* Sync Status Badge Button */}
          <button
            onClick={() => setSyncModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all border cursor-pointer ${
              syncStatus.isSyncing
                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                : !syncStatus.isOnline
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40 animate-pulse'
                : syncStatus.pendingCount > 0
                ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
            }`}
            title="Open Offline Sync Manager"
          >
            {syncStatus.isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : !syncStatus.isOnline ? (
              <WifiOff className="w-3.5 h-3.5" />
            ) : (
              <Wifi className="w-3.5 h-3.5" />
            )}

            <span className="hidden sm:inline">
              {!syncStatus.isOnline ? 'Offline' : syncStatus.isSyncing ? 'Syncing...' : 'Sync'}
            </span>

            {syncStatus.pendingCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-600 text-white font-mono font-bold">
                {syncStatus.pendingCount}
              </span>
            )}
          </button>

          {/* Admin Panel Button */}
          <button
            onClick={() => setCurrentView(isAdminLoggedIn ? 'admin-dashboard' : 'admin-login')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
              isAdminLoggedIn || currentView === 'admin-dashboard'
                ? 'bg-[#2EA3F2] text-slate-950 shadow-xs'
                : 'bg-[#0A2E73] text-white hover:bg-[#08245a]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{isAdminLoggedIn ? 'Admin' : 'Admin Login'}</span>
            <span className="xs:hidden">Admin</span>
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 pt-2 pb-4 space-y-2 animate-in slide-in-from-top-2 shadow-lg">
          <div className="grid grid-cols-2 gap-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 p-2 rounded-md text-xs font-semibold ${
                    isActive
                      ? 'bg-[#0A2E73] text-white dark:bg-[#2EA3F2] dark:text-slate-950'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-1 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setCurrentView(isAdminLoggedIn ? 'admin-dashboard' : 'admin-login');
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-1.5 p-2 rounded-md text-xs font-bold bg-[#0A2E73] text-white"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isAdminLoggedIn ? 'Admin Panel' : 'Admin Login'}</span>
            </button>

            <button
              onClick={() => {
                handleInstallPwa();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-1.5 p-2 rounded-md text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install PWA</span>
            </button>
          </div>
        </div>
      )}

      {/* Sync Manager Modal */}
      <SyncManagerModal isOpen={syncModalOpen} onClose={() => setSyncModalOpen(false)} />
    </header>
  );
};
