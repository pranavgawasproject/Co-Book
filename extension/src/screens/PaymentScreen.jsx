import React, { useState } from 'react';
import { calculateEqualSplit, calculateEqualShares, formatCurrency } from '../utils/splitMath';

// Desktop fallback: shows the UPI ID + a copy button + confirm-paid button
function UpiCopyRow({ upiId, amount, onMarkPaid }) {
  const [upiCopied, setUpiCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(upiId).catch(() => {});
    setUpiCopied(true);
    setTimeout(() => setUpiCopied(false), 2000);
  };
  return (
    <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-2.5 flex flex-col gap-2">
      <p className="text-[10px] text-neutral-500">Or pay manually via UPI on desktop:</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-[11px] text-emerald-400 font-mono bg-neutral-900/60 px-2 py-1 rounded border border-neutral-700/50 truncate">{upiId}</code>
        <button onClick={copy} className="flex-shrink-0 bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded text-[10px] font-semibold transition-colors">
          {upiCopied ? '✓' : 'Copy'}
        </button>
      </div>
      <p className="text-[10px] text-neutral-600">Send {formatCurrency(amount, 'INR')} then click below:</p>
      <button onClick={onMarkPaid} className="w-full bg-neutral-700 hover:bg-emerald-500 hover:text-black text-neutral-300 font-semibold py-1.5 rounded-lg text-xs transition-colors">
        ✓ I've Paid — Confirm
      </button>
    </div>
  );
}

export default function PaymentScreen({ session, members, myUserId, onMarkPaid, onUnlockCheckout }) {
  const { perPersonShare } = calculateEqualSplit(session.total_cost, members.length || 1);
  const shares = calculateEqualShares(session.total_cost, members.length || 1);

  const allPaid = members.every(m => m.payment_status === 'paid');
  const paidCount = members.filter(m => m.payment_status === 'paid').length;

  const generateUpiLink = (hostUpi, amount, hostName) => {
    return `upi://pay?pa=${encodeURIComponent(hostUpi)}&pn=${encodeURIComponent(hostName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('SplitSync Split - ' + session.property_title)}`;
  };

  const host = members.find(m => m.user_id === session.host_id);
  const myMember = members.find(m => m.user_id === myUserId);
  const myIndex = members.findIndex(m => m.user_id === myUserId);
  const myShare = myIndex >= 0 ? (shares[myIndex] || perPersonShare) : perPersonShare;
  const isHost = session.host_id === myUserId;

  return (
    <div className="flex flex-col gap-3">
      {/* Header status */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2">
        <span className="text-amber-400 text-base">🔒</span>
        <div>
          <p className="text-amber-400 font-semibold text-xs">Cost Split Locked</p>
          <p className="text-amber-400/70 text-[10px]">{paidCount}/{members.length} members paid host</p>
        </div>
        {/* Progress bar */}
        <div className="ml-auto w-16 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${members.length > 0 ? (paidCount / members.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Members payment status */}
      <div className="space-y-1.5 max-h-36 overflow-y-auto">
        {members.map((member, idx) => {
          const isPaid = member.payment_status === 'paid';
          const isMe = member.user_id === myUserId;
          const isThisHost = member.user_id === session.host_id;
          const memberShare = shares[idx] || perPersonShare;

          return (
            <div key={member.user_id} className={`flex items-center gap-2 rounded-lg p-2 border transition-all ${isPaid ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-neutral-800/50 border-neutral-700/40 border-l-2 border-l-yellow-500'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isPaid ? 'bg-emerald-500/30 text-emerald-400' : 'bg-yellow-500/30 text-yellow-400'}`}>
                {(member.profiles?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">
                  {member.profiles?.name || 'User'}
                  {isMe && <span className="text-neutral-500 text-[10px] ml-1">(you)</span>}
                  {isThisHost && <span className="text-amber-400 text-[10px] ml-1">host</span>}
                </p>
                <p className="text-neutral-400 text-[10px]">{formatCurrency(memberShare, 'INR')}</p>
              </div>
              {isPaid ? (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/20">✓ Paid</span>
              ) : (
                <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded animate-pulse">Pending</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Action for current user (non-host, unpaid) */}
      {!isHost && myMember?.payment_status !== 'paid' && (
        <div className="flex flex-col gap-2">
          {host?.profiles?.upi_id ? (
            <>
              {/* Desktop: show UPI ID + copy */}
              <UpiCopyRow upiId={host.profiles.upi_id} amount={myShare} onMarkPaid={() => onMarkPaid(myUserId)} />
            </>
          ) : (
            <button
              onClick={() => onMarkPaid(myUserId)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
              ✓ Mark as Paid
            </button>
          )}
        </div>
      )}

      {!isHost && myMember?.payment_status === 'paid' && !allPaid && (
        <div className="bg-neutral-800/50 rounded-xl p-3 text-center">
          <p className="text-neutral-400 text-xs">Your payment is confirmed! Waiting for others...</p>
        </div>
      )}

      {isHost && !allPaid && (
        <div className="bg-neutral-800/50 rounded-xl p-3 text-center">
          <p className="text-neutral-400 text-xs">Waiting for all members to send you their share. You can then proceed to book the property.</p>
        </div>
      )}

      {allPaid && isHost && (
        <button
          onClick={onUnlockCheckout}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] flex flex-col items-center"
        >
          <span>🎉 Everyone Paid You</span>
          <span className="text-[10px] font-medium opacity-80 mt-0.5">Click to reveal booking button</span>
        </button>
      )}
    </div>
  );
}

