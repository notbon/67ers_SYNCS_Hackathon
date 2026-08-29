import { supabase } from "../lib/supabase";
import type { Profile, Match } from "../types";

export type SignUpInput = { name: string; email: string; password: string };
export type SignInInput = { email: string; password: string };

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

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type UpdateProfileInput = { name?: string; skill_level?: string | null; avatar_url?: string | null };

export async function updateProfile(userId: string, updates: UpdateProfileInput) {
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export async function fetchCreatedMatches(userId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("created_by", userId)
    .order("match_date", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchJoinedMatches(userId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from("match_participants")
    .select("matches(*)")
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? [])
    .map((row) => row.matches as unknown as Match | null)
    .filter((m): m is Match => Boolean(m));
}

export async function requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }
  
  export async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  export async function deleteAccount(userId: string) {
    const { error: matchesError } = await supabase
      .from("matches")
      .delete()
      .eq("created_by", userId);
    if (matchesError) throw matchesError;
  
    const { error: participantError } = await supabase
      .from("match_participants")
      .delete()
      .eq("user_id", userId);
    if (participantError) throw participantError;
  
    const { error: userError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);
    if (userError) throw userError;
  
    await signOut();
  }

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}