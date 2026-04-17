"use client";

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardView } from '@/components/DashboardView';
import { IngredientsView } from '@/components/IngredientsView';
import { RecipesView } from '@/components/RecipesView';
import { DishesView } from '@/components/DishesView';
import { KitchenView } from '@/components/KitchenView';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'ingredients' && <IngredientsView />}
        {activeTab === 'recipes' && <RecipesView />}
        {activeTab === 'dishes' && <DishesView />}
        {activeTab === 'kitchen' && <KitchenView />}
      </main>
    </div>
  );
}
