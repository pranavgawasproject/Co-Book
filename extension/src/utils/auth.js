import { supabase } from '../supabaseClient';

const SESSION_STORAGE_KEY = 'SplitSync_supabase_session';

export async function persistSessionToStorage() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await chrome.storage.local.set({
        [SESSION_STORAGE_KEY]: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }
      });
    }
  } catch (err) {
    console.warn('[SplitSync Auth] Could not persist session:', err.message);
  }
}

export async function ensureAuthenticated() {

  // PRIORITY 1: Restore session from popup (shared across contexts)
  try {
    const stored = await chrome.storage.local.get(SESSION_STORAGE_KEY);
    const saved = stored[SESSION_STORAGE_KEY];
    if (saved?.access_token && saved?.refresh_token) {
      const { data, error } = await supabase.auth.setSession({
        access_token: saved.access_token,
        refresh_token: saved.refresh_token,
      });
      if (!error && data?.user) {
        return data.user;
      }
      console.warn('[SplitSync Auth] Stored session expired, clearing...');
      await chrome.storage.local.remove(SESSION_STORAGE_KEY);
    }
  } catch (storageErr) {
    console.warn('[SplitSync Auth] chrome.storage unavailable:', storageErr.message);
  }

  // PRIORITY 2: Already signed in locally
  try {
    const { data: { session: existing } } = await supabase.auth.getSession();
    if (existing?.user) {
      return existing.user;
    }
  } catch (err) {
    console.warn('[SplitSync Auth] Could not check local session:', err.message);
  }

  // PRIORITY 3: Create anonymous session
  // NOTE: Make sure CAPTCHA is DISABLED in Supabase Dashboard → Auth → Settings
  // for anonymous sign-ins. CAPTCHA requires a browser environment which
  // extensions don't provide reliably.
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('[SplitSync Auth] ❌ Anonymous sign-in FAILED:', error.message);
      if (error.message?.toLowerCase().includes('captcha')) {
        console.error(
          '[SplitSync Auth] → CAPTCHA is blocking sign-in!\n' +
          '  Fix: Supabase Dashboard → Authentication → Settings → ' +
          'CAPTCHA protection → DISABLE for anonymous users'
        );
      }
      return null;
    }
    await persistSessionToStorage();
    return data.user;
  } catch (networkErr) {
    console.error('[SplitSync Auth] Network error during sign-in:', networkErr.message);
    return null;
  }
}

export async function saveProfile(userId, { name, upiId }) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, name, upi_id: upiId }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('[SplitSync Auth] ❌ saveProfile failed:', error.message);
  }
  return { data, error };
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[SplitSync Auth] ❌ getProfile failed:', error.message);
    return null;
  }
  return data || null;
}
