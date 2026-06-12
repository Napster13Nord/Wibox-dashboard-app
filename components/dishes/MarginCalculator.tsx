import React, { useState } from 'react';
import { Calculator } from 'lucide-react';

/* ─── Margin calculator (neutral styling) ─── */
export const MarginCalculator = ({ costPerPortion }: { costPerPortion: number }) => {
  const [targetMargin, setTargetMargin] = useState<number | ''>('');

  const suggestedPrice =
    typeof targetMargin === 'number' && targetMargin > 0 && targetMargin < 100
      ? costPerPortion / (1 - targetMargin / 100)
      : null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Margin Calculator</span>
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Target Margin (%)</label>
          <input
            type="number"
            min="1"
            max="99"
            step="0.5"
            placeholder="e.g. 70"
            className="w-28 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
            value={targetMargin}
            onChange={(e) => setTargetMargin(parseFloat(e.target.value) || '')}
          />
        </div>
        <span className="text-gray-400 text-sm pb-1">→</span>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Suggested Price</label>
          <div className={`w-32 px-3 py-1.5 rounded-md text-sm font-semibold border ${
            suggestedPrice !== null
              ? 'bg-white border-gray-300 text-gray-900'
              : 'bg-gray-100 border-gray-200 text-gray-400'
          }`}>
            {suggestedPrice !== null ? `€${suggestedPrice.toFixed(2)}` : '—'}
          </div>
        </div>
        {suggestedPrice !== null && (
          <p className="text-xs text-gray-500 pb-1">
            Food cost: {((costPerPortion / suggestedPrice) * 100).toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  );
};
