import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function useSessionSync(sessionId) {
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    if (!sessionId || !isUuid(sessionId)) {
      setSessionData(null);
      return;
    }

    supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('[useSessionSync] ❌ Error fetching session:', error.message);
          return;
        }
        if (data) {
          setSessionData(data);
        } else {
          console.warn('[useSessionSync] ⚠️ No session found for ID:', sessionId);
        }
      });

    const channel = supabase
      .channel(`session_row_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setSessionData(payload.new);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  return sessionData;
}