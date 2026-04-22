import React, { useRef, useEffect } from 'react';
import Image from 'next/image';
import { useAppContext } from '@/lib/context';
import { LayoutDashboard, Carrot, ChefHat, UtensilsCrossed, Scale, Download, Upload, Trash2, Undo2, X } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, mobileOpen, onMobileClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { state, undo, canUndo } = useAppContext();

  const trashCount = (state.trash || []).length;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ingredients', label: 'Price List', icon: Carrot },
    { id: 'recipes', label: 'Recipes', icon: ChefHat },
    { id: 'dishes', label: 'Dish Building', icon: UtensilsCrossed },
    { id: 'kitchen', label: 'Kitchen Scale', icon: Scale },
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
    if (!data) { alert('No data found to export.'); return; }
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
        JSON.parse(text); // validate JSON before saving
        localStorage.setItem('wibox-data', text);
        alert('Data imported successfully! The page will now reload.');
        window.location.reload();
      } catch {
        alert('Invalid file. Please use a Wibox backup JSON file.');
      }
    };
    reader.readAsText(file);
    // reset so same file can be re-imported if needed
    e.target.value = '';
  };

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <Image 
          src="/assets/logo.webp" 
          alt="Wibox Logo" 
          width={180} 
          height={60} 
          className="object-contain" 
          priority 
        />
        {/* Close button — mobile only */}
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

        {/* Trash tab */}
        <button
          onClick={() => setActiveTab('trash')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'trash'
              ? 'bg-red-50 text-red-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Trash2 className={`w-5 h-5 ${activeTab === 'trash' ? 'text-red-700' : 'text-gray-400'}`} />
          Trash
          {trashCount > 0 && (
            <span className="ml-auto bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {trashCount}
            </span>
          )}
        </button>
      </nav>

      {/* Undo button */}
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
          Undo
          <span className="ml-auto text-xs text-gray-400">Ctrl+Z</span>
        </button>
      </div>

      {/* Export / Import */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide px-1 mb-1">Data Backup</p>
        <button
          onClick={handleExport}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors"
        >
          <Download className="w-4 h-4 text-gray-400" />
          Export Backup
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        >
          <Upload className="w-4 h-4 text-gray-400" />
          Import Backup
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <div className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col shadow-xl md:hidden animate-slide-in">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
};
