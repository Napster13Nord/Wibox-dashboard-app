import React from 'react';
import { useAppContext } from '@/lib/context';
import { Carrot, ChefHat, UtensilsCrossed, TrendingUp } from 'lucide-react';

export const DashboardView = () => {
  const { state } = useAppContext();

  const stats = [
    { label: 'Total Ingredients', value: state.ingredients.length, icon: Carrot, color: 'text-orange-600', bg: 'bg-orange-100' },
    { label: 'Total Recipes', value: state.recipes.length, icon: ChefHat, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Total Dishes', value: state.dishes.length, icon: UtensilsCrossed, color: 'text-green-600', bg: 'bg-green-100' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-500">Welcome to Wibox Recipe Automation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className={`p-4 rounded-full ${stat.bg}`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-500" />
          System Status
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Price List Sync</span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Live Cost Calculation</span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-600">Margin Tracking</span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
