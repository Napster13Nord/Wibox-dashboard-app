"use client";

import React, { useMemo, useState } from 'react';
import { useAppContext } from '@/lib/context';
import { useI18n } from '@/lib/i18n';
import { useTranslatedName } from '@/hooks/useTranslatedName';
import { calculateDishMetrics, calculateDishCost } from '@/lib/calculations';
import { DEFAULT_VAT_RATE } from '@/lib/constants';
import { Dish } from '@/lib/types';
import {
  TrendingUp, TrendingDown, AlertTriangle, Lightbulb, ChevronDown, ChevronUp,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight, Star, Zap, Target, Award,
  DollarSign, Percent, ShieldCheck, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/* ─── helpers ─── */
const fmt = (n: number) => `€${n.toFixed(2)}`;
const pct = (n: number) => `${n.toFixed(1)}%`;

type DishWithMetrics = {
  dish: Dish;
  totalCost: number;
  costPerPortion: number;
  foodCostPercentage: number;
  profitMargin: number;
  profitPerPortion: number;
  folderName: string;
};

/* ─── Animated number ─── */
const AnimatedValue: React.FC<{ value: string; className?: string }> = ({ value, className }) => (
  <motion.span
    key={value}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className={className}
  >
    {value}
  </motion.span>
);

/* ─── Margin bar ─── */
const MarginBar: React.FC<{ value: number; max?: number }> = ({ value, max = 100 }) => {
  const width = Math.min(Math.max(value, 0), max);
  const color = value >= 70 ? 'from-emerald-400 to-emerald-600'
    : value >= 50 ? 'from-sky-400 to-blue-500'
    : value >= 30 ? 'from-amber-400 to-orange-500'
    : 'from-red-400 to-rose-600';
  return (
    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`h-full rounded-full bg-gradient-to-r ${color}`}
      />
    </div>
  );
};

/* ─── KPI Card ─── */
const KpiCard: React.FC<{
  icon: React.ReactNode; label: string; value: string; sub?: string;
  gradient: string; delay?: number;
}> = ({ icon, label, value, sub, gradient, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${gradient}`}
  >
    <div className="absolute -right-4 -top-4 opacity-10">{React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-24 h-24' })}</div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-1 text-white/80 text-xs font-semibold uppercase tracking-wider">{icon}{label}</div>
      <AnimatedValue value={value} className="text-2xl font-bold block" />
      {sub && <span className="text-xs text-white/70 mt-1 block">{sub}</span>}
    </div>
  </motion.div>
);

/* ─── Suggestion card ─── */
const SuggestionCard: React.FC<{
  icon: React.ReactNode; title: string; description: string;
  action?: string; color: string; delay?: number;
}> = ({ icon, title, description, action, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.4 }}
    className={`flex gap-4 p-4 rounded-xl border-l-4 ${color} bg-white shadow-sm hover:shadow-md transition-shadow`}
  >
    <div className="shrink-0 mt-0.5">{icon}</div>
    <div className="min-w-0">
      <p className="font-semibold text-gray-900 text-sm">{title}</p>
      <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{description}</p>
      {action && <p className="text-xs font-medium mt-2 text-blue-600">{action}</p>}
    </div>
  </motion.div>
);

/* ─── Main component ─── */
export const ReportsView: React.FC = () => {
  const { state } = useAppContext();
  const { t } = useI18n();
  const getTranslatedName = useTranslatedName();
  const [sortKey, setSortKey] = useState<'margin' | 'cost' | 'profit' | 'name'>('margin');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const dishes: DishWithMetrics[] = useMemo(() => {
    return state.dishes.map(dish => {
      const m = calculateDishMetrics(dish, state.recipes, state.ingredients);
      const folder = state.dishFolders.find(f => f.id === dish.folder);
      return {
        dish,
        totalCost: m.totalCost,
        costPerPortion: m.costPerPortion,
        foodCostPercentage: m.foodCostPercentage,
        profitMargin: m.profitMargin,
        profitPerPortion: (dish.sellingPrice || 0) - m.costPerPortion,
        folderName: folder?.name || '',
      };
    });
  }, [state.dishes, state.recipes, state.ingredients, state.dishFolders]);

  const sorted = useMemo(() => {
    const arr = [...dishes];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'margin': cmp = a.profitMargin - b.profitMargin; break;
        case 'cost': cmp = a.foodCostPercentage - b.foodCostPercentage; break;
        case 'profit': cmp = a.profitPerPortion - b.profitPerPortion; break;
        case 'name': cmp = getTranslatedName(a.dish).localeCompare(getTranslatedName(b.dish)); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return arr;
  }, [dishes, sortKey, sortDir]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  /* ─── KPI aggregates ─── */
  const avgMargin = dishes.length ? dishes.reduce((s, d) => s + d.profitMargin, 0) / dishes.length : 0;
  const avgFoodCost = dishes.length ? dishes.reduce((s, d) => s + d.foodCostPercentage, 0) / dishes.length : 0;
  const bestDish = dishes.length ? [...dishes].sort((a, b) => b.profitMargin - a.profitMargin)[0] : null;
  const worstDish = dishes.length ? [...dishes].sort((a, b) => a.profitMargin - b.profitMargin)[0] : null;
  const totalRevenue = dishes.reduce((s, d) => s + (d.dish.sellingPrice || 0), 0);
  const totalCosts = dishes.reduce((s, d) => s + d.costPerPortion, 0);
  const highMargin = dishes.filter(d => d.profitMargin >= 70).length;
  const lowMargin = dishes.filter(d => d.profitMargin < 30).length;

  /* ─── Tier distribution ─── */
  const tiers = [
    { label: '≥70%', count: dishes.filter(d => d.profitMargin >= 70).length, color: 'bg-emerald-500' },
    { label: '50-69%', count: dishes.filter(d => d.profitMargin >= 50 && d.profitMargin < 70).length, color: 'bg-sky-500' },
    { label: '30-49%', count: dishes.filter(d => d.profitMargin >= 30 && d.profitMargin < 50).length, color: 'bg-amber-500' },
    { label: '<30%', count: dishes.filter(d => d.profitMargin < 30).length, color: 'bg-rose-500' },
  ];
  const tierTotal = Math.max(dishes.length, 1);

  /* ─── Smart suggestions ─── */
  const suggestions: { icon: React.ReactNode; title: string; description: string; action?: string; color: string }[] = [];

  if (worstDish && worstDish.profitMargin < 30) {
    const needed = worstDish.costPerPortion / 0.7;
    suggestions.push({
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      title: `"${getTranslatedName(worstDish.dish)}" has a critically low margin (${pct(worstDish.profitMargin)})`,
      description: `Food cost is ${pct(worstDish.foodCostPercentage)}. Consider raising price to ${fmt(needed)} (excl. VAT) to reach 30% food cost, or reduce ingredient quantities.`,
      action: `Current: ${fmt(worstDish.dish.sellingPrice)} → Suggested: ${fmt(needed)}`,
      color: 'border-red-400 bg-red-50/50',
    });
  }

  const highCostDishes = dishes.filter(d => d.foodCostPercentage > 35 && d.profitMargin < 65);
  if (highCostDishes.length > 0) {
    const names = highCostDishes.slice(0, 3).map(d => getTranslatedName(d.dish)).join(', ');
    suggestions.push({
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      title: `${highCostDishes.length} dish(es) with food cost above 35%`,
      description: `${names}${highCostDishes.length > 3 ? ` + ${highCostDishes.length - 3} more` : ''}. Negotiating better supplier prices or substituting ingredients could improve margins.`,
      color: 'border-amber-400 bg-amber-50/50',
    });
  }

  if (bestDish && bestDish.profitMargin >= 70) {
    suggestions.push({
      icon: <Star className="w-5 h-5 text-emerald-500" />,
      title: `"${getTranslatedName(bestDish.dish)}" is your top performer (${pct(bestDish.profitMargin)} margin)`,
      description: `This dish earns ${fmt(bestDish.profitPerPortion)} profit per portion. Consider promoting it or creating similar dishes with the same recipe structure.`,
      color: 'border-emerald-400 bg-emerald-50/50',
    });
  }

  const noPriceDishes = dishes.filter(d => !d.dish.sellingPrice || d.dish.sellingPrice === 0);
  if (noPriceDishes.length > 0) {
    suggestions.push({
      icon: <DollarSign className="w-5 h-5 text-blue-500" />,
      title: `${noPriceDishes.length} dish(es) missing a selling price`,
      description: `Set a selling price to see margin data: ${noPriceDishes.slice(0, 3).map(d => getTranslatedName(d.dish)).join(', ')}`,
      color: 'border-blue-400 bg-blue-50/50',
    });
  }

  if (avgFoodCost > 30 && avgFoodCost <= 40) {
    suggestions.push({
      icon: <Target className="w-5 h-5 text-violet-500" />,
      title: `Average food cost is ${pct(avgFoodCost)} — room for improvement`,
      description: 'Industry benchmark is 28-32%. Review your highest-cost dishes and look for ingredient substitutions or portion adjustments.',
      color: 'border-violet-400 bg-violet-50/50',
    });
  }

  if (suggestions.length === 0 && dishes.length > 0) {
    suggestions.push({
      icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
      title: 'Your margins look healthy!',
      description: 'All dishes are performing within acceptable ranges. Keep monitoring for ingredient price changes.',
      color: 'border-emerald-400 bg-emerald-50/50',
    });
  }

  const SortIcon: React.FC<{ k: typeof sortKey }> = ({ k }) =>
    sortKey === k ? (sortDir === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />) : <ChevronDown className="w-3.5 h-3.5 opacity-30" />;

  if (dishes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <BarChart3 className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">{t.reports?.emptyTitle || 'No Dishes Yet'}</h2>
        <p className="text-gray-400 max-w-md">{t.reports?.emptyDesc || 'Create dishes in the Dish Building tab to see margin reports and AI-powered suggestions here.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold text-gray-900">{t.reports?.title || 'Margin Reports'}</h2>
        <p className="text-gray-500 mt-1">{t.reports?.subtitle || 'Analyze dish profitability and get smart suggestions to maximize your margins.'}</p>
      </motion.div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Percent className="w-5 h-5" />} label={t.reports?.avgMargin || "Avg. Margin"} value={pct(avgMargin)} sub={`${dishes.length} dishes`} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" delay={0} />
        <KpiCard icon={<PieChart className="w-5 h-5" />} label={t.reports?.avgFoodCost || "Avg. Food Cost"} value={pct(avgFoodCost)} sub={t.reports?.industryBenchmark || "Industry: 28-32%"} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" delay={0.1} />
        <KpiCard icon={<ArrowUpRight className="w-5 h-5" />} label={t.reports?.bestMargin || "Best Margin"} value={bestDish ? pct(bestDish.profitMargin) : '-'} sub={bestDish ? getTranslatedName(bestDish.dish) : undefined} gradient="bg-gradient-to-br from-violet-500 to-purple-600" delay={0.2} />
        <KpiCard icon={<Flame className="w-5 h-5" />} label={t.reports?.totalProfit || "Total Profit/Portion"} value={fmt(totalRevenue - totalCosts)} sub={`${highMargin} high / ${lowMargin} low`} gradient="bg-gradient-to-br from-orange-500 to-rose-600" delay={0.3} />
      </div>

      {/* Distribution + Suggestions grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Tier distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
        >
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            {t.reports?.marginDistribution || 'Margin Distribution'}
          </h3>
          <div className="space-y-4">
            {tiers.map((tier, i) => (
              <div key={tier.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-600">{tier.label}</span>
                  <span className="text-gray-400">{tier.count} {tier.count === 1 ? 'dish' : 'dishes'}</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(tier.count / tierTotal) * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.4 + i * 0.1 }}
                    className={`h-full rounded-full ${tier.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
          {/* Mini legend */}
          <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Excellent</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-500" /> Good</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Moderate</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /> Critical</div>
          </div>
        </motion.div>

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
        >
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            {t.reports?.smartSuggestions || 'Smart Suggestions'}
          </h3>
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <SuggestionCard key={i} {...s} delay={0.5 + i * 0.1} />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Full table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-gray-400" />
            {t.reports?.allDishes || 'All Dishes — Ranked by Profitability'}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  <span className="flex items-center gap-1">{t.reports?.dishName || 'Dish'}<SortIcon k="name" /></span>
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('margin')}>
                  <span className="flex items-center gap-1">{t.reports?.margin || 'Margin'}<SortIcon k="margin" /></span>
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('cost')}>
                  <span className="flex items-center gap-1">{t.reports?.foodCost || 'Food Cost %'}<SortIcon k="cost" /></span>
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.reports?.costPortion || 'Cost/Port.'}</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.reports?.sellPrice || 'Sell Price'}</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('profit')}>
                  <span className="flex items-center gap-1">{t.reports?.profitPortion || 'Profit/Port.'}<SortIcon k="profit" /></span>
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.reports?.marginBar || 'Visual'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((d, idx) => {
                const isExpanded = expandedId === d.dish.id;
                const marginColor = d.profitMargin >= 70 ? 'text-emerald-600' : d.profitMargin >= 50 ? 'text-blue-600' : d.profitMargin >= 30 ? 'text-amber-600' : 'text-rose-600';
                const bgColor = d.profitMargin >= 70 ? 'bg-emerald-50' : d.profitMargin >= 50 ? 'bg-blue-50' : d.profitMargin >= 30 ? 'bg-amber-50' : 'bg-rose-50';

                return (
                  <React.Fragment key={d.dish.id}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.02 * idx }}
                      className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : d.dish.id)}
                    >
                      <td className="px-6 py-3.5 text-xs text-gray-400 font-mono">{idx + 1}</td>
                      <td className="px-6 py-3.5">
                        <div className="font-medium text-gray-900">{getTranslatedName(d.dish)}</div>
                        {d.folderName && <div className="text-xs text-gray-400">{d.folderName}</div>}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${bgColor} ${marginColor}`}>
                          {d.profitMargin >= 50 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {pct(d.profitMargin)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-gray-600">{pct(d.foodCostPercentage)}</td>
                      <td className="px-6 py-3.5 text-gray-600">{fmt(d.costPerPortion)}</td>
                      <td className="px-6 py-3.5 font-medium text-gray-800">{fmt(d.dish.sellingPrice || 0)}</td>
                      <td className="px-6 py-3.5">
                        <span className={`font-semibold ${d.profitPerPortion >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {fmt(d.profitPerPortion)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 min-w-[120px]"><MarginBar value={d.profitMargin} /></td>
                    </motion.tr>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.tr initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          <td colSpan={8} className="bg-gray-50/50 px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              <div className="bg-white rounded-xl p-4 border border-gray-100">
                                <p className="text-gray-400 font-semibold uppercase tracking-wider mb-2">Cost Breakdown</p>
                                <p className="text-gray-600">Total cost: <b className="text-gray-900">{fmt(d.totalCost)}</b></p>
                                <p className="text-gray-600">Portions: <b className="text-gray-900">{d.dish.portions}</b></p>
                                <p className="text-gray-600">Cost/portion: <b className="text-gray-900">{fmt(d.costPerPortion)}</b></p>
                              </div>
                              <div className="bg-white rounded-xl p-4 border border-gray-100">
                                <p className="text-gray-400 font-semibold uppercase tracking-wider mb-2">Pricing</p>
                                <p className="text-gray-600">Sell (excl. VAT): <b className="text-gray-900">{fmt(d.dish.sellingPrice || 0)}</b></p>
                                <p className="text-gray-600">VAT rate: <b className="text-gray-900">{d.dish.vatRate ?? DEFAULT_VAT_RATE}%</b></p>
                                <p className="text-gray-600">Sell (incl. VAT): <b className="text-gray-900">{fmt((d.dish.sellingPrice || 0) * (1 + (d.dish.vatRate ?? DEFAULT_VAT_RATE) / 100))}</b></p>
                              </div>
                              <div className="bg-white rounded-xl p-4 border border-gray-100">
                                <p className="text-gray-400 font-semibold uppercase tracking-wider mb-2">Target Pricing</p>
                                {[30, 25, 20].map(fc => {
                                  const suggested = d.costPerPortion / (fc / 100);
                                  return (
                                    <p key={fc} className="text-gray-600">
                                      At {fc}% food cost: <b className="text-gray-900">{fmt(suggested)}</b>
                                    </p>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};
