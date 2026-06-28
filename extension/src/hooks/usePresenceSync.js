import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';

export function usePresenceSync(sessionId, userProfile) {
  const [activeUsers, setActiveUsers] = useState({});
  const [remoteCursors, setRemoteCursors] = useState({});
  const [remoteSelections, setRemoteSelections] = useState({});
  const channelRef = useRef(null);

  useEffect(() => {
    if (!sessionId || !userProfile?.id) {
      setActiveUsers({});
      setRemoteCursors({});
      setRemoteSelections({});
      return;
    }

    const userId = userProfile.id;
    const userName = userProfile.name || 'Anonymous';
    const userColor = getUserColor(userId);

    console.log('[usePresenceSync] 🔌 Connecting Realtime for session:', sessionId);

    const channel = supabase.channel(`presence_${sessionId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = {};
        Object.keys(state).forEach((key) => {
          users[key] = state[key][0];
        });
        setActiveUsers(users);
      })
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (payload.userId !== userId) {
          setRemoteCursors((prev) => ({
            ...prev,
            [payload.userId]: {
              x: payload.x,
              y: payload.y,
              userName: payload.userName,
              color: payload.color,
              updatedAt: Date.now(),
            },
          }));
        }
      })
      .on('broadcast', { event: 'selection' }, ({ payload }) => {
        if (payload.userId !== userId) {
          setRemoteSelections((prev) => ({
            ...prev,
            [payload.userId]: {
              text: payload.text,
              x: payload.x,
              y: payload.y,
              userName: payload.userName,
              color: payload.color,
              updatedAt: Date.now(),
            },
          }));
        }
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: userId,
          name: userName,
          color: userColor,
          online_at: new Date().toISOString(),
        });
      }
    });

    // Clean up stale cursors/selections after 5 seconds of inactivity
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((key) => {
          if (now - next[key].updatedAt > 5000) {
            delete next[key];
            changed = true;
          }
        });
        return changed ? next : prev;
      });

      setRemoteSelections((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((key) => {
          if (now - next[key].updatedAt > 8000) {
            delete next[key];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [sessionId, userProfile?.id, userProfile?.name]);

  const sendCursor = (x, y) => {
    if (channelRef.current && userProfile?.id) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          userId: userProfile.id,
          userName: userProfile.name || 'Anonymous',
          color: getUserColor(userProfile.id),
          x,
          y,
        },
      });
    }
  };

  const sendSelection = (text, x, y) => {
    if (channelRef.current && userProfile?.id) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'selection',
        payload: {
          userId: userProfile.id,
          userName: userProfile.name || 'Anonymous',
          color: getUserColor(userProfile.id),
          text,
          x,
          y,
        },
      });
    }
  };

  return { activeUsers, remoteCursors, remoteSelections, sendCursor, sendSelection };
}

function getUserColor(userId) {
  const colors = [
    '#f43f5e', // rose
    '#3b82f6', // blue
    '#10b981', // emerald
    '#eab308', // yellow
    '#a855f7', // purple
    '#f97316', // orange
    '#06b6d4', // cyan
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
