"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardView } from '@/components/DashboardView';
import { IngredientsView } from '@/components/IngredientsView';
import { RecipesView } from '@/components/RecipesView';
import { DishesView } from '@/components/DishesView';
import { KitchenView } from '@/components/KitchenView';
import { TrashView } from '@/components/TrashView';
import { useI18n } from '@/lib/i18n';
import { Menu } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wibox-active-tab') || 'dashboard';
    }
    return 'dashboard';
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    localStorage.setItem('wibox-active-tab', activeTab);
  }, [activeTab]);

  const handleSetActiveTab = (tab: string) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const tabLabels: Record<string, string> = {
    dashboard: t.sidebar.dashboard,
    ingredients: t.sidebar.priceList,
    recipes: t.sidebar.recipes,
    dishes: t.sidebar.dishBuilding,
    kitchen: t.sidebar.kitchenScale,
    trash: t.sidebar.trash,
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="text-sm font-semibold text-gray-700">
          {tabLabels[activeTab] || activeTab}
        </span>
      </div>

      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto p-4 pt-16 md:p-8 md:pt-8">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'ingredients' && <IngredientsView />}
        {activeTab === 'recipes' && <RecipesView />}
        {activeTab === 'dishes' && <DishesView />}
        {activeTab === 'kitchen' && <KitchenView />}
        {activeTab === 'trash' && <TrashView />}
      </main>
    </div>
  );
}
