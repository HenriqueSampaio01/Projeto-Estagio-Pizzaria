import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://qtbauubrlqprhatybdxj.supabase.co'
const SUPABASE_KEY = 'sb_publishable_a0OtPESmnQivJXxEE7HyQw_PopStYr1'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)