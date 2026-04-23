import React from 'react';
import { useAppContext } from '@/lib/context';
import { useI18n } from '@/lib/i18n';
import { Carrot, ChefHat, UtensilsCrossed, TrendingUp } from 'lucide-react';

export const DashboardView = () => {
  const { state } = useAppContext();
  const { t } = useI18n();

  const stats = [
    { label: t.dashboard.totalIngredients, value: state.ingredients.length, icon: Carrot, color: 'text-orange-600', bg: 'bg-orange-100' },
    { label: t.dashboard.totalRecipes, value: state.recipes.length, icon: ChefHat, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: t.dashboard.totalDishes, value: state.dishes.length, icon: UtensilsCrossed, color: 'text-green-600', bg: 'bg-green-100' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t.dashboard.title}</h2>
        <p className="text-gray-500">{t.dashboard.subtitle}</p>
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
          {t.dashboard.systemStatus}
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">{t.dashboard.priceListSync}</span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">{t.dashboard.active}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">{t.dashboard.liveCostCalc}</span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">{t.dashboard.active}</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-600">{t.dashboard.marginTracking}</span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">{t.dashboard.active}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
