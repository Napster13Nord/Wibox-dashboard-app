import React, { useRef } from 'react';
import { LayoutDashboard, Carrot, ChefHat, UtensilsCrossed, Scale, Download, Upload } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ingredients', label: 'Price List', icon: Carrot },
    { id: 'recipes', label: 'Recipes', icon: ChefHat },
    { id: 'dishes', label: 'Dish Building', icon: UtensilsCrossed },
    { id: 'kitchen', label: 'Kitchen Scale', icon: Scale },
  ];

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

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ChefHat className="text-blue-600" />
          Wibox
        </h1>
        <p className="text-sm text-gray-500 mt-1">Recipe Automation</p>
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
      </nav>

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
    </div>
  );
};
