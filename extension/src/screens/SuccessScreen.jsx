import React from 'react';
import { calculateEqualSplit, calculateEqualShares, formatCurrency } from '../utils/splitMath';

export default function SuccessScreen({ session, members, onDone }) {
  const { perPersonShare } = calculateEqualSplit(session.total_cost, members.length || 1);
  const shares = calculateEqualShares(session.total_cost, members.length || 1);

  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      {/* Success Icon */}
      <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
        <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div>
        <h2 className="text-white font-bold text-base">Fully Funded! 🎉</h2>
        <p className="text-neutral-400 text-xs mt-1">All {members.length} members have paid their share.</p>
      </div>

      {/* Summary */}
      <div className="w-full bg-neutral-800/50 rounded-xl p-3 border border-neutral-700/50">
        <p className="text-neutral-500 text-[10px] uppercase tracking-widest mb-2">Session Summary</p>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-neutral-400">Total Collected</span>
          <span className="text-white font-bold">{formatCurrency(session.total_cost, 'INR')}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Per Person Share</span>
          <span className="text-emerald-400 font-bold">{formatCurrency(perPersonShare, 'INR')}</span>
        </div>
        <div className="border-t border-neutral-700 mt-2 pt-2 space-y-1">
          {members.map((m, idx) => (
            <div key={m.user_id} className="flex items-center gap-2">
              <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span className="text-neutral-300 text-xs flex-1 text-left truncate">{m.profiles?.name || 'User'}</span>
              <span className="text-emerald-400 text-[10px]">{formatCurrency(shares[idx] || perPersonShare, 'INR')}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onDone}
        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] flex flex-col items-center gap-0.5"
      >
        <span>✈️ Done splitting</span>
        <span className="text-[10px] font-medium opacity-80">(Go book the property now!)</span>
      </button>
    </div>
  );
}
