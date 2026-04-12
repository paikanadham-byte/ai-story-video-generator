import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pefuffrgprdftnfngold.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_j8mJqfGA3tmsFxHsGjadyw_hLSiSbBg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
