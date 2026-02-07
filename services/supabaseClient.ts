import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vxnqqngimpvpnrjdukfy.supabase.co';
const supabaseKey = 'sb_publishable_jYcE0YLUDrc557ZfkDAYVA_2D6HQKKJ';

export const supabase = createClient(supabaseUrl, supabaseKey);