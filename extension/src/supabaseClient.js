import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hwxwtgtaistelezdzsko.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3eHd0Z3RhaXN0ZWxlemR6c2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MjM1NjAsImV4cCI6MjA4NzI5OTU2MH0.1zwsud6wn82bSyDUJ9NZcj2X-R6odRXEZaFn07HS9OA';

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─────────────────────────────────────────────────
// CAPTCHA CONFIGURATION
// ─────────────────────────────────────────────────
// Provider: 'hcaptcha' | 'turnstile'
// Site key = the PUBLIC key from your captcha provider dashboard.
// The SECRET key lives in Supabase only — never put it here.
//
// hCaptcha site key → https://dashboard.hcaptcha.com/sites
// Turnstile site key → https://dash.cloudflare.com → Turnstile
// ─────────────────────────────────────────────────
export const CAPTCHA_PROVIDER = 'hcaptcha'; // change to 'turnstile' if needed
export const CAPTCHA_SITE_KEY = import.meta.env.VITE_CAPTCHA_SITE_KEY || '44e4f19c-f052-4202-bd5a-ef488adc3e92';
