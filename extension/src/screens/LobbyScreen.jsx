import React, { useState } from 'react';
import { calculateEqualSplit, calculateEqualShares, formatCurrency } from '../utils/splitMath';

// Generates a WhatsApp share message with session details
function makeWhatsAppMessage(session, perPerson) {
  const msg = `Hey! I'm planning a trip to *${session.property_title || 'a place'}* and need everyone to pay their share before I book.\n\n` +
    `💸 Your share: *${formatCurrency(perPerson, 'INR')}*\n\n` +
    `Install *SplitSync* extension → click "Join a Session" → paste this ID:\n` +
    `\`${session.id}\`\n\n` +
    `Install: https://splitsync-iota.vercel.app`;
  return encodeURIComponent(msg);
}

export default function LobbyScreen({ session, members, profile, myUserId, onLockForPayment, onLeave }) {
  const [copied, setCopied] = useState(false);
  const [editingCost, setEditingCost] = useState(false);
  const [newCost, setNewCost] = useState('');
  const [costError, setCostError] = useState('');

  const isHost = session.host_id === myUserId;
  const { perPersonShare } = calculateEqualSplit(session.total_cost, members.length || 1);
  const shares = calculateEqualShares(session.total_cost, members.length || 1);

  const copySessionId = () => {
    navigator.clipboard.writeText(session.id).catch(() => {
      const el = document.createElement('textarea');
      el.value = session.id;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsApp = () => {
    const url = `https://wa.me/?text=${makeWhatsAppMessage(session, perPersonShare)}`;
    window.open(url, '_blank');
  };

  const canLock = isHost && members.length >= 1; // Host can lock even solo for testing

  const handleSaveCost = async () => {
    setCostError('');
    const parsedCost = Number(newCost);
    if (isNaN(parsedCost) || !isFinite(parsedCost) || parsedCost <= 0) {
      setCostError('Enter a valid positive number for total cost.');
      return;
    }
    const { supabase } = await import('../supabaseClient');
    const { error } = await supabase.from('sessions')
      .update({ total_cost: parsedCost })
      .eq('id', session.id);

    if (error) {
      setCostError('Failed to update cost.');
    } else {
      setEditingCost(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">

      {/* ── Property card ── */}
      <a
        href={session.property_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-neutral-800/40 hover:bg-neutral-800/70 rounded-xl p-3 border border-neutral-800 hover:border-neutral-700 transition-colors"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-white font-semibold text-sm leading-tight line-clamp-2 flex-1">
            {session.property_title || 'Travel Property'}
          </p>
          <svg className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Total cost</p>
            <p className="text-white font-bold text-base">{formatCurrency(session.total_cost, 'INR')}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Per person ({members.length})</p>
            <p className="text-emerald-400 font-bold text-base">{formatCurrency(perPersonShare, 'INR')}</p>
          </div>
        </div>
      </a>

      {/* ── Edit cost (host only) ── */}
      {isHost && !editingCost && (
        <button
          onClick={() => { setEditingCost(true); setNewCost(String(session.total_cost)); setCostError(''); }}
          className="text-[10px] text-neutral-600 hover:text-emerald-400 transition-colors -mt-1"
        >
          ✏ Update total cost
        </button>
      )}
      {isHost && editingCost && (
        <div className="flex flex-col gap-1 -mt-1">
          <div className="flex gap-2">
            <input
              autoFocus
              type="number"
              value={newCost}
              onChange={e => { setNewCost(e.target.value); setCostError(''); }}
              className="flex-1 bg-neutral-800 border border-neutral-700 focus:border-emerald-500 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none"
              placeholder="New total (₹)"
            />
            <button
              onClick={handleSaveCost}
              className="bg-emerald-500 text-black text-[10px] font-bold px-3 rounded-lg"
            >Save</button>
            <button
              onClick={() => { setEditingCost(false); setCostError(''); }}
              className="text-neutral-500 text-[10px] px-2"
            >✕</button>
          </div>
          {costError && <p className="text-[10px] text-red-400">{costError}</p>}
        </div>
      )}

      {/* ── Members ── */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Members</p>
          <span className="text-[10px] text-neutral-500">{members.length} joined</span>
        </div>
        <div className="space-y-1.5 max-h-36 overflow-y-auto">
          {members.map((member, idx) => (
            <div
              key={member.user_id}
              className="flex items-center gap-2.5 bg-neutral-800/50 rounded-lg p-2 border border-neutral-800"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold flex-shrink-0">
                {(member.profiles?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">
                  {member.profiles?.name || 'Unknown'}
                  {member.user_id === myUserId && <span className="text-neutral-600 ml-1">(you)</span>}
                  {member.user_id === session.host_id && (
                    <span className="text-amber-400 text-[9px] ml-1 font-bold uppercase tracking-wider">host</span>
                  )}
                </p>
                {member.profiles?.upi_id && (
                  <p className="text-neutral-600 text-[10px] truncate">{member.profiles.upi_id}</p>
                )}
              </div>
              <span className="text-[10px] text-neutral-500 font-medium flex-shrink-0">
                {formatCurrency(shares[idx] || perPersonShare, 'INR')}
              </span>
            </div>
          ))}
          {members.length === 0 && (
            <div className="text-center py-4 bg-neutral-800/30 rounded-lg border border-neutral-800">
              <p className="text-xs text-neutral-600">Invite friends to join your session</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Invite section ── */}
      <div className="bg-neutral-800/50 rounded-xl p-3 border border-neutral-800 space-y-2.5">
        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Invite friends</p>

        {/* Session ID copy */}
        <div>
          <p className="text-[10px] text-neutral-600 mb-1.5">Share this session ID:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[11px] text-emerald-400 font-mono bg-neutral-900/70 px-2 py-1.5 rounded-lg border border-neutral-800 truncate">
              {session.id}
            </code>
            <button
              onClick={copySessionId}
              className="flex-shrink-0 bg-neutral-700 hover:bg-neutral-600 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* WhatsApp button */}
        <button
          onClick={openWhatsApp}
          className="w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 hover:border-[#25D366]/40 text-[#25D366] font-semibold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Share via WhatsApp
        </button>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-2">
        {isHost && (
          <button
            onClick={onLockForPayment}
            disabled={!canLock}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold py-2.5 rounded-xl text-xs transition-colors"
            title={!canLock ? "Add at least 1 member to lock" : "Lock and collect payments"}
          >
            🔒 Lock & Collect Payment
          </button>
        )}
        <button
          onClick={onLeave}
          className="bg-neutral-800 hover:bg-red-500/10 hover:border-red-500/30 border border-neutral-700 text-neutral-500 hover:text-red-400 font-medium py-2 px-3 rounded-xl text-xs transition-colors"
          title="Leave session"
        >
          Leave
        </button>
      </div>

      {!isHost && (
        <p className="text-[10px] text-center text-neutral-600">
          Waiting for {members.find(m => m.user_id === session.host_id)?.profiles?.name || 'the host'} to lock the session...
        </p>
      )}
    </div>
  );
}
