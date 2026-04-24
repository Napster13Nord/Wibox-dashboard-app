import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import { UserButton } from '@clerk/nextjs';
import { useRole } from '@/hooks/useRole';
import { useAppContext } from '@/lib/context';
import { useI18n, localeLabels, Locale } from '@/lib/i18n';
import { LayoutDashboard, Carrot, ChefHat, UtensilsCrossed, Scale, Download, Upload, Trash2, Undo2, X, Globe, Shield, Eye } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, mobileOpen, onMobileClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { state, undo, canUndo } = useAppContext();
  const { locale, setLocale, t } = useI18n();
  const { role, isManager } = useRole();

  const trashCount = (state.trash || []).length;

  const tabs = [
    { id: 'dashboard', label: t.sidebar.dashboard, icon: LayoutDashboard },
    { id: 'ingredients', label: t.sidebar.priceList, icon: Carrot },
    { id: 'recipes', label: t.sidebar.recipes, icon: ChefHat },
    { id: 'dishes', label: t.sidebar.dishBuilding, icon: UtensilsCrossed },
    { id: 'kitchen', label: t.sidebar.kitchenScale, icon: Scale },
  ];

  // Ctrl+Z keyboard shortcut for undo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && canUndo) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, canUndo]);

  // Close mobile sidebar on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mobileOpen, onMobileClose]);

  const handleExport = () => {
    const data = localStorage.getItem('wibox-data');
    if (!data) { alert(t.sidebar.noDataExport); return; }
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wibox-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        JSON.parse(text);
        localStorage.setItem('wibox-data', text);
        alert(t.sidebar.importSuccess);
        window.location.reload();
      } catch {
        alert(t.sidebar.importError);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const sidebarContent = (
    <>
      {/* Logo & user profile */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <Image
            src="/assets/logo.webp"
            alt="Wibox Logo"
            width={180}
            height={60}
            className="object-contain"
            priority
          />
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* User profile row */}
        <div className="flex items-center gap-3 px-1">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-9 h-9 ring-2 ring-blue-100',
              },
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isManager ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  <Shield className="w-3 h-3" />
                  Manager
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  <Eye className="w-3 h-3" />
                  Kitchen
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          );
        })}

        {/* Trash tab — manager only */}
        {isManager && (
          <button
            onClick={() => setActiveTab('trash')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'trash'
                ? 'bg-red-50 text-red-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Trash2 className={`w-5 h-5 ${activeTab === 'trash' ? 'text-red-700' : 'text-gray-400'}`} />
            {t.sidebar.trash}
            {trashCount > 0 && (
              <span className="ml-auto bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {trashCount}
              </span>
            )}
          </button>
        )}
      </nav>

      {/* Undo button — manager only */}
      {isManager && (
        <div className="px-4 pb-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              canUndo
                ? 'text-gray-700 hover:bg-gray-100 bg-gray-50 border border-gray-200'
                : 'text-gray-300 bg-gray-50 border border-gray-100 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-4 h-4" />
            {t.sidebar.undo}
            <span className="ml-auto text-xs text-gray-400">Ctrl+Z</span>
          </button>
        </div>
      )}

      {/* Language selector */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
          <Globe className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{t.sidebar.language}</span>
          <div className="ml-auto flex gap-1">
            {(Object.keys(localeLabels) as Locale[]).map((loc) => (
              <button
                key={loc}
                onClick={() => setLocale(loc)}
                className={`text-sm px-1.5 py-0.5 rounded transition-colors ${
                  locale === loc
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-gray-500 hover:bg-gray-200'
                }`}
                title={localeLabels[loc].label}
              >
                {localeLabels[loc].flag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Export / Import — manager only */}
      {isManager && (
        <div className="p-4 border-t border-gray-200 space-y-2">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide px-1 mb-1">{t.sidebar.dataBackup}</p>
          <button
            onClick={handleExport}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors"
          >
            <Download className="w-4 h-4 text-gray-400" />
            {t.sidebar.exportBackup}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4 text-gray-400" />
            {t.sidebar.importBackup}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onMobileClose} />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col shadow-xl md:hidden animate-slide-in">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
};


