import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function usePaymentSync(sessionId) {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!sessionId || !isUuid(sessionId)) {
      setMembers([]);
      return;
    }

    const fetchInitialState = async () => {
      const { data, error } = await supabase
        .from('session_members')
        .select('user_id, amount_owed, payment_status, profiles(name, avatar_url, upi_id)')
        .eq('session_id', sessionId);

      if (error) {
        console.error('[usePaymentSync] ❌ Error fetching members:', error.message);
      } else if (data) {
        setMembers(data);
      }
    };

    fetchInitialState();

    const paymentChannel = supabase
      .channel(`session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_members',
          filter: `session_id=eq.${sessionId}`
        },
        () => fetchInitialState()
      )
      .subscribe();

    return () => { supabase.removeChannel(paymentChannel); };
  }, [sessionId]);

  return members;
}