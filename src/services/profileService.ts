import { supabase } from "../lib/supabase";

export type SignUpInput = { name: string; email: string; password: string };
export type SignInInput = { email: string; password: string };

// Creates the Supabase Auth user, then creates the matching row in our own
// `users` table (id must match the auth user's id so matches.created_by
// and match_participants.user_id line up).
export async function signUp({ name, email, password }: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  const userId = data.user?.id;
  if (userId) {
    const { error: profileError } = await supabase
      .from("users")
      .insert({ id: userId, name, email, skill_level: null });

    if (profileError && profileError.code !== "23505") throw profileError;
  }

  return data;
}

export async function signIn({ email, password }: SignInInput) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}