import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error(
    'Λείπουν τα VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Πρόσθεσέ τα ως Environment Variables στο Vercel (Project Settings → Environment Variables).'
  )
}

export const supabase = createClient(url, anonKey)
