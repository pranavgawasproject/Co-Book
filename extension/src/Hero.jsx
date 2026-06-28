import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from './supabaseClient';
import { ensureAuthenticated, saveProfile, getProfile } from './utils/auth';
import { extractPropertyData, getDomainForCurrentPage } from './utils/scraper';
import { usePaymentSync } from './hooks/usePaymentSync';
import { useSessionSync } from './hooks/useSessionSync';
import { usePresenceSync } from './hooks/usePresenceSync';

import LoadingScreen from './screens/LoadingScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import IdleScreen from './screens/IdleScreen';
import LobbyScreen from './screens/LobbyScreen';
import PaymentScreen from './screens/PaymentScreen';
import SuccessScreen from './screens/SuccessScreen';
import SettingsScreen from './screens/SettingsScreen';

const STORAGE_KEY = 'cobook_active_session';

// ─── Error boundary wrapper ───────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  render() {
    if (this.state.error) {
      return (
        <div className="p-4 text-center">
          <p className="text-red-400 text-xs mb-2">Something went wrong.</p>
          <button
            className="text-xs text-neutral-500 hover:text-white underline"
            onClick={() => this.setState({ error: null })}
          >Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Hero() {
  const [screen, setScreen]         = useState('loading');
  const [user, setUser]             = useState(null);
  const [profile, setProfile]       = useState(null);
  const [session, setSession]       = useState(null);
  const [shortlisted, setShortlisted] = useState([]);
  const [minimized, setMinimized]   = useState(false);
  const [error, setError]           = useState('');
  const [adapterRules, setAdapterRules] = useState(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);

  const members    = usePaymentSync(session?.id);
  const liveSession = useSessionSync(session?.id);
  const { activeUsers, remoteCursors, remoteSelections, sendCursor, sendSelection } = usePresenceSync(session?.id, profile ? { ...profile, id: user?.id } : null);

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      // Fetch remote adapter rules in parallel with auth
      const currentDomain = getDomainForCurrentPage();
      if (currentDomain) {
        supabase
          .from('platform_adapters')
          .select('selectors')
          .eq('domain', currentDomain)
          .maybeSingle()
          .then(({ data }) => { if (data) setAdapterRules(data.selectors); })
          .catch(() => {});
      }

      // Auth with timeout — don't hang forever
      const authTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), 10000)
      );

      let u;
      try {
        u = await Promise.race([ensureAuthenticated(), authTimeout]);
      } catch (err) {
        console.error('[SplitSync] Auth failed:', err.message);
        setAuthFailed(true);
        setScreen('idle');
        return;
      }

      if (!u) {
        setAuthFailed(true);
        setScreen('idle');
        return;
      }
      setUser(u);

      const p = await getProfile(u.id).catch(() => null);
      if (!p?.name) { setScreen('onboarding'); return; }
      setProfile(p);

      // Restore active session
      try {
        const stored = await chrome.storage.local.get(STORAGE_KEY);
        const saved = stored[STORAGE_KEY];
        if (saved?.id) {
          const { data } = await supabase
            .from('sessions')
            .select('*')
            .eq('id', saved.id)
            .neq('status', 'completed')
            .maybeSingle();
          if (data) {
            setSession(data);
            setScreen(data.status === 'locked_for_payment' ? 'payment' : 'lobby');
            return;
          } else {
            // Stored session is done or missing — clear it
            chrome.storage.local.remove(STORAGE_KEY);
          }
        }
      } catch (_) {}

      setScreen('idle');
    })();
  }, []);

  // ── Live session updates ──────────────────────────────────────────────────
  useEffect(() => {
    if (!liveSession) return;
    setSession(liveSession);
    if (liveSession.status === 'locked_for_payment' && screen === 'lobby') {
      setScreen('payment');
      setMinimized(false);
    }
    if (liveSession.status === 'completed' && screen === 'payment') {
      setScreen('success');
    }
  }, [liveSession]);

  useEffect(() => {
    if (screen === 'payment' && members.length > 0 && members.every(m => m.payment_status === 'paid')) {
      setScreen('success');
    }
  }, [members, screen]);

  // ── Shortlist sync ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.id) { setShortlisted([]); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from('shortlisted_properties')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });
      if (data) setShortlisted(data);
    };
    fetch();
    const ch = supabase.channel(`shortlist_${session.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public',
        table: 'shortlisted_properties',
        filter: `session_id=eq.${session.id}`
      }, fetch)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [session?.id]);

  // ── Checkout intercept ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      setMinimized(false);
      if (session) setScreen('payment');
      else {
        setError('Start a SplitSync session first to lock in group costs before booking.');
        setScreen(profile ? 'idle' : 'onboarding');
      }
    };
    window.addEventListener('splitsync-checkout-intercepted', handler);
    return () => window.removeEventListener('splitsync-checkout-intercepted', handler);
  }, [session, profile]);

  // ── Multiplayer real-time cursor & selection tracking ───────────────────────
  useEffect(() => {
    if (!session?.id || !profile) return;

    let lastSent = 0;
    const handleMouseMove = (e) => {
      const now = Date.now();
      if (now - lastSent > 120) { // Throttle cursor broadcasts
        sendCursor(e.pageX, e.pageY);
        lastSent = now;
      }
    };

    const handleMouseUp = () => {
      // Small timeout to allow selection object to update
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        if (text && text.length < 500) { // Limit length
          try {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const x = rect.left + window.scrollX;
            const y = rect.top + window.scrollY;
            sendSelection(text, x, y);
          } catch (_) {}
        }
      }, 50);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [session?.id, profile]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const refreshRules = useCallback(async () => {
    const currentDomain = getDomainForCurrentPage();
    if (!currentDomain) return null;
    const { data } = await supabase
      .from('platform_adapters')
      .select('selectors')
      .eq('domain', currentDomain)
      .maybeSingle();
    if (data) {
      setAdapterRules(data.selectors);
      return data.selectors;
    }
    return null;
  }, []);

  const handleCreateSession = async (manualPrice = null) => {
    if (!user) { setError('Not signed in. Please refresh the page.'); return; }
    setError('');
    setIsCreatingSession(true);

    try {
      let rules = adapterRules;
      if (!rules) rules = await refreshRules();

      let scrapedData = {};
      let cost = manualPrice || 0;

      if (rules) {
        try {
          scrapedData = await extractPropertyData(rules);
          cost = manualPrice ?? scrapedData.total_price ?? 0;
        } catch (scrapeErr) {
          console.warn('[SplitSync] Scrape failed, using manual price:', scrapeErr.message);
        }
      }

      const currentDomain = getDomainForCurrentPage();

      const { data: sessionData, error: sErr } = await supabase
        .from('sessions')
        .insert({
          host_id: user.id,
          platform: currentDomain || 'unknown',
          property_title: scrapedData.title || document.title?.slice(0, 80) || 'Travel Booking',
          property_url: window.location.href,
          total_cost: Number(cost),
          status: 'browsing',
        })
        .select()
        .single();

      if (sErr) { setError(`Failed to create session: ${sErr.message}`); return; }

      await supabase.from('session_members').insert({
        session_id: sessionData.id,
        user_id: user.id,
        amount_owed: cost,
        payment_status: 'paid'
      });

      await chrome.storage.local.set({ [STORAGE_KEY]: sessionData });
      setSession(sessionData);
      setScreen('lobby');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleJoinSession = async (sessionId) => {
    setError('');
    if (!sessionId?.trim()) { setError('Please enter a session ID.'); return; }

    const { data: sessionData, error: sErr } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId.trim())
      .maybeSingle();

    if (sErr || !sessionData) {
      setError('Session not found. Check the ID and try again.');
      return;
    }

    await supabase.from('session_members').upsert(
      { session_id: sessionId, user_id: user.id, amount_owed: 0, payment_status: 'pending' },
      { onConflict: 'session_id,user_id' }
    );

    await chrome.storage.local.set({ [STORAGE_KEY]: sessionData });
    setSession(sessionData);
    setScreen(sessionData.status === 'locked_for_payment' ? 'payment' : 'lobby');
  };

  const handleShortlistProperty = async () => {
    if (!session || !user) return;

    let rules = adapterRules;
    if (!rules) rules = await refreshRules();

    try {
      const scrapedData = rules ? await extractPropertyData(rules) : {};
      const title = scrapedData.title || document.title?.slice(0, 80) || 'Property';
      const isDuplicate = shortlisted.some(p => p.property_url === window.location.href);
      if (isDuplicate) {
        setError('This property is already on the voting board.');
        setTimeout(() => setError(''), 3000);
        return;
      }

      await supabase.from('shortlisted_properties').insert({
        session_id: session.id,
        added_by: user.id,
        property_title: title,
        property_url: window.location.href,
        price: scrapedData.total_price || 0
      });
    } catch (err) {
      console.error('[SplitSync] Shortlist error:', err);
    }
  };

  const handleVote = async (propId, voteType) => {
    const prop = shortlisted.find(p => p.id === propId);
    if (!prop || !user) return;
    let ups = [...(prop.upvotes || [])];
    let downs = [...(prop.downvotes || [])];
    ups = ups.filter(id => id !== user.id);
    downs = downs.filter(id => id !== user.id);
    if (voteType === 'up') ups.push(user.id);
    if (voteType === 'down') downs.push(user.id);
    await supabase.from('shortlisted_properties')
      .update({ upvotes: ups, downvotes: downs })
      .eq('id', propId);
  };

  const handleSelectFromShortlist = async (prop) => {
    if (session?.host_id !== user?.id) return;
    await supabase.from('sessions')
      .update({
        property_title: prop.property_title,
        property_url: prop.property_url,
        total_cost: prop.price
      })
      .eq('id', session.id);
  };

  const handleLockForPayment = async () => {
    if (session?.host_id !== user?.id) return;
    await supabase.from('sessions')
      .update({ status: 'locked_for_payment' })
      .eq('id', session.id);
  };

  const handleLeaveSession = async () => {
    await chrome.storage.local.remove(STORAGE_KEY);
    setSession(null);
    setShortlisted([]);
    setScreen('idle');
  };

  const isHost = session?.host_id === user?.id;

  // ── Screen titles ─────────────────────────────────────────────────────────
  const titles = {
    loading: 'SplitSync', onboarding: 'Setup Profile',
    idle: 'SplitSync', lobby: 'Session Lobby',
    payment: 'Split & Pay', success: 'All Paid! 🎉',
    settings: 'Settings',
  };

  return (
    <div className="fixed bottom-4 right-4 z-[2147483647] font-sans" style={{ width: '340px' }}>
      <ErrorBoundary>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">

          {/* ── Header ── */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-neutral-800 bg-neutral-900/95">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center text-xs">✈</div>
              <span className="text-white font-bold text-sm tracking-tight">{titles[screen] || 'SplitSync'}</span>
              {session && (
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  Live
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {screen === 'idle' && profile && (
                <button
                  onClick={() => setScreen('settings')}
                  className="text-neutral-600 hover:text-neutral-300 transition-colors"
                  title="Settings"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setMinimized(m => !m)}
                className="text-neutral-500 hover:text-white transition-colors w-6 h-6 flex items-center justify-center"
              >
                {minimized
                  ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                }
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          {!minimized && (
            <div className="p-4">
              {error && (
                <div className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">⚠</span>
                  <span>{error}</span>
                  <button onClick={() => setError('')} className="ml-auto text-red-400/50 hover:text-red-400 flex-shrink-0">✕</button>
                </div>
              )}

              {authFailed && screen !== 'loading' && (
                <div className="mb-3 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                  ⚡ Auth issue detected. Extension works in limited mode. Check Supabase CAPTCHA settings.
                </div>
              )}

              {screen === 'loading' && <LoadingScreen />}

              {screen === 'onboarding' && (
                <OnboardingScreen
                  onComplete={async (data) => {
                    const { error: saveErr } = await saveProfile(user.id, data);
                    if (saveErr) { setError('Could not save profile. Try again.'); return; }
                    const p = await getProfile(user.id);
                    setProfile(p);
                    setScreen('idle');
                  }}
                />
              )}

              {screen === 'idle' && (
                <IdleScreen
                  profile={profile}
                  isCreatingSession={isCreatingSession}
                  onCreateSession={handleCreateSession}
                  onJoinSession={handleJoinSession}
                  hasRules={!!adapterRules}
                />
              )}

              {screen === 'lobby' && (
                <div className="flex flex-col gap-4">
                  <LobbyScreen
                    session={session}
                    members={members}
                    profile={profile}
                    myUserId={user?.id}
                    onLockForPayment={handleLockForPayment}
                    onLeave={handleLeaveSession}
                  />
                  {/* ── Voting Board ── */}
                  <div className="border-t border-neutral-800 pt-4">
                    <div className="flex justify-between items-center mb-2.5">
                      <div>
                        <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest">Voting Board</p>
                        <p className="text-[10px] text-neutral-600">{shortlisted.length} properties shortlisted</p>
                      </div>
                      <button
                        onClick={handleShortlistProperty}
                        className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg hover:bg-emerald-500/20 transition-all font-semibold"
                      >
                        + Add This Page
                      </button>
                    </div>
                    {shortlisted.length === 0 ? (
                      <p className="text-[10px] text-neutral-600 text-center py-4 bg-neutral-800/30 rounded-lg border border-neutral-800">
                        Browse properties and click "+ Add This Page" to shortlist them
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                        {shortlisted.map(prop => (
                          <div key={prop.id} className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-2.5">
                            <p className="text-xs text-white font-medium truncate mb-1.5">{prop.property_title}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-neutral-400 font-medium">₹{Number(prop.price).toLocaleString('en-IN')}</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleVote(prop.id, 'up')}
                                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${prop.upvotes?.includes(user?.id) ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-neutral-700 text-neutral-500 hover:border-emerald-500/30'}`}
                                >
                                  👍 {prop.upvotes?.length || 0}
                                </button>
                                <button
                                  onClick={() => handleVote(prop.id, 'down')}
                                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${prop.downvotes?.includes(user?.id) ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'border-neutral-700 text-neutral-500 hover:border-red-500/30'}`}
                                >
                                  👎 {prop.downvotes?.length || 0}
                                </button>
                                {isHost && (
                                  <button
                                    onClick={() => handleSelectFromShortlist(prop)}
                                    className="text-[10px] bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-0.5 rounded transition-colors"
                                  >
                                    Book
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {screen === 'payment' && session && (
                <PaymentScreen
                  session={session}
                  members={members}
                  myUserId={user?.id}
                  onMarkPaid={async (id) => {
                    await supabase.from('session_members')
                      .update({ payment_status: 'paid' })
                      .eq('session_id', session.id)
                      .eq('user_id', id);
                  }}
                  onUnlockCheckout={async () => {
                    await supabase.from('sessions')
                      .update({ status: 'completed' })
                      .eq('id', session.id);
                    setScreen('success');
                  }}
                />
              )}

              {screen === 'success' && session && (
                <SuccessScreen
                  session={session}
                  members={members}
                  onDone={() => {
                    chrome.storage.local.remove(STORAGE_KEY);
                    setSession(null);
                    setShortlisted([]);
                    setScreen('idle');
                  }}
                />
              )}

              {screen === 'settings' && (
                <SettingsScreen
                  profile={profile}
                  onSave={async (data) => {
                    await saveProfile(user.id, data);
                    const p = await getProfile(user.id);
                    setProfile(p);
                    setScreen('idle');
                  }}
                  onBack={() => setScreen('idle')}
                />
              )}
            </div>
          )}

          {/* ── Minimized pill ── */}
          {minimized && session && (
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-[10px] text-emerald-400">Session active · {members.length} members</span>
              <span className="text-[10px] text-neutral-500">Click ▲ to expand</span>
            </div>
          )}
          {createPortal(
            <>
              {Object.keys(remoteCursors).map((id) => {
                const cursor = remoteCursors[id];
                return (
                  <div
                    key={`cursor-${id}`}
                    style={{
                      position: 'absolute',
                      left: `${cursor.x}px`,
                      top: `${cursor.y}px`,
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: cursor.color,
                      pointerEvents: 'none',
                      zIndex: 2147483646,
                      transition: 'left 0.08s ease-out, top 0.08s ease-out',
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '-6px',
                        backgroundColor: cursor.color,
                        color: '#fff',
                        textShadow: '0 1px 1px rgba(0,0,0,0.5)',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                      }}
                    >
                      {cursor.userName}
                    </div>
                  </div>
                );
              })}
              {Object.keys(remoteSelections).map((id) => {
                const selection = remoteSelections[id];
                return (
                  <div
                    key={`selection-${id}`}
                    style={{
                      position: 'absolute',
                      left: `${selection.x}px`,
                      top: `${selection.y - 35}px`,
                      backgroundColor: '#1f2937',
                      color: '#fff',
                      border: `1.5px solid ${selection.color}`,
                      fontSize: '11px',
                      fontWeight: '500',
                      padding: '5px 9px',
                      borderRadius: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                      pointerEvents: 'none',
                      zIndex: 2147483645,
                      maxWidth: '220px',
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div style={{ fontSize: '8px', color: selection.color, fontWeight: 'bold', marginBottom: '2px', textTransform: 'uppercase' }}>
                      {selection.userName} selected:
                    </div>
                    "{selection.text}"
                  </div>
                );
              })}
            </>,
            document.body
          )}
        </div>
      </ErrorBoundary>
    </div>
  );
}
